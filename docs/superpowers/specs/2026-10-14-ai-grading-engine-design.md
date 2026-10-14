# AI Grading Engine for FTTI Hub Essay/Fill-in-Blank Questions — Design

## Context & Problem

FTTI Hub (`kurikulum.ftti.site`, repo `cenghin/bfi-v3-ftti`) is the organization's
live curriculum/exam platform, already paperless: trainees take exams online, PG
(multiple choice) is auto-scored, but **Esai** (essay / fill-in-the-blank — the Hub
has no separate type for short-answer) requires a TA to open each trainee's
submission on the "Marking" page and read/score every answer by hand. This is the
time sink this project aims to eliminate or drastically reduce, freeing TA time for
trainee pastoral care instead of manual grading.

As of 2026-10-08, FTTI Hub developer Samuel has already shipped a **working**
AI-assist feature for this: a "Nilai dengan AI" button (`src/lib/similarity.ts`,
`nilai-ai-button.tsx`) that scores an essay answer via **local sentence-embedding
similarity** (`Xenova/paraphrase-multilingual-mpnet-base-v2`, via
`@huggingface/transformers`, fully local/ONNX, no API key, multilingual) between the
soal's `jawabanIdeal` field and the trainee's submitted text, with a negation-mismatch
penalty and per-sentence evidence shown to the TA. The TA can still override the score
manually before finalizing.

This existing feature treats `jawabanIdeal` as one free-text blob and scores the whole
answer holistically. Real FTTI answer keys (see Truth Test (1) official key, below)
are **rubric-based with per-item partial credit**, not single holistic judgments —
this is the gap this design fills, built as a **compatible extension**, not a
replacement, of Samuel's existing work.

## Real Reference Data (used throughout this design)

- `Truth (1).pdf` — blank Truth Examination (1), 8 questions (1 diagram/chart
  fill-in, 1 table+illustration essay, 2 table list-with-verses, 2 short essay+verse,
  1 big table topic, 2 "mention N of M aspects + verses" list essays).
- `Truth (1) Answer Key.pdf` — official answer key for all 8 questions, with explicit
  point breakdowns and partial-credit sub-rules (e.g. Q2: "Bapa 1pt, Putra 1pt, Roh
  1pt, kalau ada salah satu ayat 1pt"), OR-logic verse acceptance lists (Q3/Q6/Q7/Q8:
  any one of several listed verses satisfies a citation requirement), and
  select-N-of-M list questions (Q7: 5 of 10 valid aspects; Q8: 5 of 5).
- Two real trainee answer sheets for Question 1 (handwritten, photographed):
  Nathaniel Vincent (all 10 chart cells correct) and Yosea Kamam (2 deviations: a
  near-miss term substitution, and two swapped cell positions) — used as the "full
  correct" and "partial/realistic error" test cases.

Truth Test (1) itself is **out of this project's production pipeline** (recycled from
a prior term, per [[project_truth_class_status]]), so this data is used purely as
engineering test material, not as content this repo's Tahap 1-5 pipeline produced.

## Goals

1. Score Esai-type answers against **structured, partial-credit rubrics**, not just
   holistic similarity — matching how FTTI's real answer keys are written.
2. Stay **fully compatible** with Samuel's shipped feature: zero risk to existing
   plain-text essay soal already in production use.
3. Keep LLM token usage low by **reusing the existing local embedding model as a
   first-pass filter**, escalating to an LLM only for genuinely ambiguous sub-items.
4. Support a minimum-friction authoring path for TAs: reuse documents (exam + answer
   key PDFs) TAs already produce, rather than asking them to write JSON or learn a
   new tool.
5. Architecture parameterized by language (ID/EN now; Chinese traditional/simplified
   and other branch languages later) without a structural rewrite.

## Non-Goals (this iteration)

- No changes to FTTI Hub's live UI/schema without Samuel's review — this phase is a
  **standalone PoC outside the `bfi-v3-ftti` repo**, built with real exam data,
  proving the approach before any integration PR is proposed.
- No OCR / handwriting recognition — paperless typed input is the target; the
  handwritten photos are stand-ins for "what a trainee would have typed."
- No change to the 0-100 final score scale or `NilaiUjian.skor` (stays `Int`).
- No multi-language rubric content yet (ID/EN structural support only, no
  Chinese-language rubric authored this iteration).

## Architecture

### 1. Compatibility strategy — content-sniffing on `jawabanIdeal`

`Soal.jawabanIdeal` remains a plain `String?` (no FTTI Hub schema change required for
this phase). Two formats share the field:

- **Plain text** (today's behavior, unchanged) → Samuel's existing
  `essaySimilarityDetail()` sentence-by-sentence scorer runs exactly as it does today.
- **Structured rubric JSON**, detected by the string starting with
  `{"rubric_version":1`  → routes to the new rubric engine described below.

This means the new engine is purely additive: every soal currently in production
keeps working unmodified.

### 2. Point precision — proposed schema change (requires Samuel's sign-off)

`Soal.poin` and `Jawaban.skorEsai` are currently `Int`. Real answer keys use halves
(e.g. Q4 totals 2.5 pts) and this design's own partial-credit rule (§4) awards 0.5 for
a "near-miss / missing qualifier" answer. Recommended: widen both columns from `Int`
to a decimal type (safe Postgres migration, no data loss). `skorPG`, `skorTotal`, and
`NilaiUjian.skor` are unaffected — those stay `Int` (already a 0-100 percentage scale).
This is the only schema change this design proposes, and it is **not required** to run
the standalone PoC — only to eventually integrate into FTTI Hub.

### 3. Rubric schema (v1)

```json
{
  "rubric_version": 1,
  "lang": "id",
  "pilih_n_dari": null,
  "butir": [
    {
      "label": "Allah Tritunggal",
      "poin_konsep": 1,
      "subset_diterima": [
        {"teks": "Allah", "poin": 0.5}
      ],
      "ayat": {
        "poin": 1,
        "opsi_sah": ["2 Kor 13:13"],
        "biner": true
      }
    }
  ]
}
```

- `pilih_n_dari: {"n": 5, "total_opsi_sah": 10}` (set at the top level, null when not
  applicable) handles "mention N of M valid aspects" questions (Q7/Q8-style): every
  item in `butir` is a candidate aspect: the engine matches the trainee's answer
  against all M, takes the top-N matches by score, and sums only those.
- `ayat` is optional per butir (not every butir requires a verse). `opsi_sah` is a
  list because FTTI answer keys commonly accept any one of several valid citations.
- Chart/table questions (Q1, Q6) are modeled as one `butir` per cell/row-field, each
  with its own `poin_konsep` (typically 0.5–1) — same schema, just more entries.

### 4. Hybrid matching algorithm (per butir)

Run in this order, stopping at the first confident hit:

1. **Exact/near-exact match**: normalize both `label` and the trainee's answer
   (lowercase, strip punctuation/diacritics) and compare directly → full
   `poin_konsep` on match.
2. **Subset check**: same normalization against each `subset_diterima` entry → that
   entry's `poin` (typically 0.5) on match. This implements the "missing qualifier"
   rule agreed in this design (e.g. "Allah" vs "Allah Tritunggal", "penebusan" vs
   "penebusan yuridis-Nya").
3. **Embedding similarity fallback**: call Samuel's existing `textSimilarity()`
   directly (reused, not reimplemented) between `label` and the trainee's answer text.
   - similarity ≥ 0.85 (normalized) → treat as full match.
   - 0.5–0.85 → **ambiguous, escalate to LLM** (step 5).
   - < 0.5 → 0 points, no LLM call (obviously unrelated).
4. **Verse sub-item** (if present): literal match (normalized) against `opsi_sah` →
   binary `ayat.poin` or 0. No embedding/LLM — verse citations aren't paraphrasable in
   a way that changes correctness.
5. **LLM escalation** (only for step-3 ambiguous cases): single butir at a time (not
   the whole essay) — cheaper and more precise than one big call. System prompt
   reuses the FTTI-compliance rules drafted in this brainstorm (single source of
   truth = this butir's label/subset list/evidence only; no outside theology
   knowledge; no overclaim about trainee attitude; 3-level feedback —
   observation / interpretation / professional translation); returns a score (0,
   0.5, or full `poin_konsep`) plus a short constructive feedback string.

For `pilih_n_dari` questions, every butir is scored via steps 1–4 against the
trainee's full answer text, then the top-N scoring butir are summed (capped at N ×
per-aspect points) — this lets a trainee list aspects in any order/subset and still
get credit for whichever N they got right.

### 5. TA-facing output

Extends (doesn't replace) the existing "Nilai dengan AI" button: when the rubric-JSON
path is used, the evidence panel shows a **per-butir breakdown** (label, matched
trainee text, status — Exact Match / Subset Match / Semantic Match / LLM-judged / No
Match — and points awarded) instead of the current per-sentence view. The AI score
still only pre-fills the manual `skorEsai` input; the TA still finalizes, per the
"Auto-score + TA review before rilis" automation level agreed earlier in this
brainstorm.

### 6. Rubric authoring path (MVP) — PDF-to-rubric extraction

TAs do not write JSON or learn a new form. The authoring flow:

1. TA produces the exam + official answer key as they already do today (Word/PDF —
   exactly the `Truth (1).pdf` / `Truth (1) Answer Key.pdf` pair used as this
   design's reference data).
2. An LLM reads the answer key PDF (as a document/vision input, not plain
   `pdftotext` — chart/diagram-style questions like Q1 need layout-aware reading,
   confirmed working live during this design's own research) and extracts the
   rubric-JSON structure in §3.
3. The resulting JSON is pasted into the existing "Jawaban ideal" textarea — no FTTI
   Hub UI change needed for this to work today.

This is a one-time, per-question-authoring cost (cheap), not a per-submission cost —
unlike the grading engine itself, which runs once per trainee per question.

## Data Flow Summary

```
TA's existing exam+key PDFs
        │  (one-time, per exam)
        ▼
LLM PDF→rubric extraction  ──────────────▶  rubric JSON  ──▶ pasted into
                                                              Soal.jawabanIdeal
                                                                     │
Trainee submits answer (typed, paperless)                          │
        │                                                           │
        ▼                                                           │
Jawaban.teksJawaban  ───────────────────────────────────────────────┘
        │
        ▼
Rubric engine (per butir: exact → subset → embedding → verse → LLM-if-ambiguous)
        │
        ▼
Per-butir breakdown + total skorEsai (pre-filled, TA can override)
        │
        ▼
TA clicks "finalisasi" (existing flow, unchanged) → skorTotal → NilaiUjian
```

## Error Handling

- Malformed rubric JSON (fails to parse after the `{"rubric_version":1` sniff) →
  surface a clear error to the TA, do not silently fall back to holistic scoring
  (that would score against the raw JSON text, producing nonsense).
- LLM escalation failure (timeout/API error) → butir falls back to the raw embedding
  similarity score from step 3 (not a hard failure), flagged in the UI as
  "LLM review unavailable, used semantic-only estimate" so the TA knows to double
  check it.
- Trainee answer text covering multiple butir in one free-text blob (likely for
  chart/table questions where the whole answer is one textarea) — matching runs
  per-butir against the *whole* trainee answer text, not a pre-split per-field answer,
  since FTTI Hub's `Jawaban.teksJawaban` is a single string per soal.

## Testing / Validation Plan (PoC, standalone, outside `bfi-v3-ftti`)

1. Rubric JSON authored (by hand first, then via the PDF-extraction step once built)
   for all 8 Truth Test (1) questions from the real official answer key.
2. Trainee answers transcribed from the real photographed answer sheets (starting
   with Nathaniel Vincent — expected near-full-marks — and Yosea Kamam — expected
   partial credit with the two known deviations — plus any additional legible
   photos the user provides).
3. Standalone Node/TS script imports `textSimilarity` directly from
   `bfi-v3-ftti/src/lib/similarity.ts` (reused, not reimplemented) so PoC results
   are representative of actual production behavior.
4. Run the matching engine, print the per-butir report, and sanity-check against
   what a human grader would award — iterate on thresholds (0.85 / 0.5 cutoffs) and
   the subset-rule word lists until the two known real cases score as expected.

## Open Questions / Future Iterations

- Upgrade path to **Option C** (pure embedding-first, dictionary-free) for
  multilingual branches (Chinese etc.) once the ID/EN rubric approach is validated —
  embeddings are inherently multilingual, so this mainly needs translated rubric
  `label`/`subset_diterima` content, not new engine code.
- Dedicated rubric-authoring UI inside FTTI Hub's soal composer (replacing
  copy-paste-JSON) — proposed as a follow-up PR to Samuel once the PoC validates the
  approach.
- Automatic "Complete / Remedial" (threshold 75) labeling surfaced to the trainee —
  not currently implemented anywhere in FTTI Hub (`hitungSkorUjian` only produces the
  raw 0-100 score); would be a separate, small addition once the auto-score +
  TA-review flow is trusted in production.
