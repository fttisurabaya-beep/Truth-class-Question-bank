# AI Grading Engine PoC — for review by Samuel (FTTI Hub)

## TL;DR

Builds on top of your existing "Nilai dengan AI" essay-grading feature in `bfi-v3-ftti`
(`src/lib/similarity.ts`, `nilai-ai-button.tsx`). Your implementation already does
local-embedding sentence-similarity scoring, which is great — this PoC adds a
**rubric-based partial-credit layer on top of it**, because real FTTI answer keys
(e.g. Truth Test (1)) aren't single holistic answers — they're structured, with
per-concept point values, OR-logic accepted Bible-verse citations, and "mention N of
M valid points" list questions.

This is a **standalone proof of concept, not a PR** — nothing in `bfi-v3-ftti` is
touched. It's built in a separate repo (`TRUTH QUESTION BANK`, a sibling project) so
it can be validated against real exam data before proposing anything to you.

## Why this exists

FTTI Hub's "Marking" page already tackles the real pain point — TAs manually scoring
essay answers one by one. Your embedding-similarity feature is a strong first step.
What's missing is that real FTTI answer keys carry **structure your current
`jawabanIdeal` free-text field can't express**: e.g. the Truth Test (1) official key
scores "Allah Tritunggal" as 1 point, with a Bible verse citation as a *separate*
1 point, where any one of several listed verses counts — your current scorer treats
the whole `jawabanIdeal` as one blob and can't represent that.

## What this PoC adds

A **hybrid hierarchy** per rubric sub-point ("butir"), trying the cheapest check first:

1. Exact/normalized text match (free)
2. Listed partial-credit synonyms — e.g. "Allah" credited at half points as a
   near-miss for "Allah Tritunggal" (free)
3. **Your `textSimilarity()` function, reused as-is** — only called when 1-2 don't
   resolve, so most answers never touch the embedding model at all
4. LLM escalation — only for the genuinely ambiguous mid-similarity band (not wired
   to a real LLM API in this PoC yet; stubbed to flag for manual review)

Bible verse citations are checked separately and *only* by literal/normalized
substring match against a list of accepted references (never embedding/LLM — a verse
reference either is or isn't the one asked for).

## Compatibility with your existing code

- `Soal.jawabanIdeal` stays a plain `String?` — **no schema change required to try
  this**. Rubric-aware soal are detected by content-sniffing: if the field starts
  with `{"rubricVersion":1`, the new engine runs; otherwise it falls through
  unchanged to your existing holistic `essaySimilarityDetail()` scorer. Every soal
  in production today keeps working exactly as it does now.
- The only schema change this design would eventually want (not needed for this PoC)
  is widening `Soal.poin` / `Jawaban.skorEsai` from `Int` to a decimal type, since
  real answer keys use half-points (e.g. Truth Test (1) Q4 totals 2.5). Entirely
  optional, entirely your call.
- This PoC's `src/vendor-similarity.ts` is a vendored copy of your `textSimilarity`
  (same model, same floor/ceiling rescale constants) — not a reimplementation. If
  this ever gets proposed as a real PR, the plan is to import your module directly
  instead of vendoring.

## How rubrics get authored (no new UI needed yet)

TAs already produce an exam PDF + an official answer-key PDF as part of normal
workflow. The plan (not yet built — see "Not done yet" below) is: feed the answer-key
PDF to an LLM, which extracts the rubric JSON structure automatically (including
diagram/chart-style questions, which need vision-capable PDF reading, not
`pdftotext`). The JSON gets pasted into the existing `jawabanIdeal` textarea — zero
changes to your soal-composer UI required for this phase.

## Validated against real data

This isn't tested against synthetic examples — it's run against the real Truth Test
(1) official answer key (8 questions, point-by-point rubric with partial-credit
rules) and 10 real trainee answer sheets (photographed, hand-transcribed). Covers:

- Fixed-butir questions with per-butir verse citation (Soal 1, 3, 4)
- OR-logic verse acceptance lists (a trainee can cite any one of several valid
  verses for a point)
- "Mention N of M valid aspects" list questions with a shared verse-citation pool
  (Soal 7)
- Partial-credit subset matching (a near-miss phrase missing a key qualifier)

**Results (all 10 trainees, 22 question-answers scored, full test suite 18/18 passing):**

| Trainee | Soal | Score |
|---|---|---|
| Hansel Vallerio | 1 | **8.5/8.5** (perfect) |
| Kevin | 1 | 8/8.5 |
| Karina Hardianti | 1 | 8/8.5 |
| Nathaniel Vincent | 1 | 7.5/8.5 |
| Linra | 1 | 7.5/8.5 |
| Ayub Ferdinan | 1 | 7.5/8.5 |
| Trifena Fenofa | 1 | 7/8.5 |
| Fingki Irma Delia | 1 | 7/8.5 |
| Khen Oliver | 1 | 2.5/8.5 |
| Yosea Kamam | 1 | 2.5/8.5 |
| Karina / Kevin / Linra / Trifena | 3 | 6/10, 5/10, 3/10, 4/10 |
| Karina / Kevin / Hansel | 4 | 1/2.5, 1/2.5, 1/2.5 |
| Karina | 7 | 2/7 |

**The good news first:** the algorithm's exact/subset matching layer works exactly
as designed — every genuinely correct, literally-phrased answer across all 10
trainees scored full credit on that sub-point with zero embedding calls needed.
Khen Oliver and Yosea Kamam (the two weakest sheets) correctly scored lowest, and
the gap between them and everyone else is large and clean.

**Position-blindness, confirmed with a real example.** Yosea Kamam wrote
"Penciptaan (Kejadian 1:26)" as the 5th item in his list, not in the canonical last
box — the matcher still gave him full credit for it, because it only checks whether
the text *appears* anywhere in his answer, not where. This is the known limitation
described above, now with concrete evidence rather than just a hypothesis.

**Two unexpected findings — both point at the same gap, and both are good news for
where to focus next:**

1. **Ayub Ferdinan's "Realisasi Perjanjian Baru"** (a one-word paraphrase of
   "Administrasi Perjanjian Baru") didn't hit the `SEMANTIC_HIGH` (0.85) threshold —
   it landed in the ambiguous 0.5–0.85 band and got escalated to the (stubbed,
   non-functional in this PoC) LLM path, which currently just returns 0. In other
   words: the embedding layer *did* correctly flag this as "probably right, needs a
   closer look" — it just has nowhere to send that signal yet.
2. **Trifena Fenofa's "Perkenan Kehendak"** (the same two words as "Kehendak
   Perkenan," just reordered) scored only 0.43 similarity — *below* the ambiguous
   band entirely, lower than some answers that were actually wrong. This is a
   concrete signal that `SEMANTIC_HIGH`/`SEMANTIC_LOW` in `src/matcher.ts` (currently
   0.85/0.5) may need recalibration for short Indonesian theological phrases — we
   did not touch these constants, flagging for your input instead.

**The broader pattern:** Soal 3 and Soal 7 (the multi-point list questions) show
many legitimate paraphrased answers landing in that same ambiguous band across
several trainees — not just Ayub's case. Since nothing is wired to the LLM step yet,
every one of those currently scores 0, which means **today's PoC numbers
systematically understate how well this would score once a real LLM reviews the
ambiguous cases** — the gap we're seeing is concentrated almost entirely in "flagged
as uncertain," not "confidently wrong."

## Known limitations (found during this validation, not swept under the rug)

- **Position-blindness on chart/table questions.** Your `Jawaban.teksJawaban` is one
  free-text field per soal — for a 10-blank fill-in-the-chart question, a trainee's
  whole answer is one blob of text. The matcher checks whether each expected term
  *appears* in that blob, not *where*. A trainee who wrote the right 10 terms but in
  the wrong boxes would score as if they got it right. This is inherent to the
  current one-field-per-soal data model, not something this PoC's algorithm can fix
  on its own — flagging it in case chart-style questions become more common and
  per-cell input ever becomes worth considering.
- Verse-citation matching is substring-based after stripping punctuation/spaces,
  which can rarely produce a false positive (e.g. a citation for "1:5" could
  spuriously match inside "21:5" in unrelated text). Low risk for real exam answers,
  noted for awareness.

## Code location

Everything lives in `tools/ai-grading-poc/` in the `TRUTH QUESTION BANK` repo
(separate from `bfi-v3-ftti`). Key files: `src/types.ts` (rubric schema),
`src/matcher.ts` (the hybrid algorithm), `src/scorer.ts` (aggregation),
`data/rubrics/truth-test-1.json` + `data/trainees/*.json` (the real test data),
`scripts/run-poc.ts` (CLI runner — `npm run poc`).

## Not done yet (intentionally out of scope for this phase)

- No PDF-to-rubric automation (rubric was hand-transcribed for this validation)
- No real LLM API wired up for the ambiguous-case escalation path
- No FTTI Hub UI changes (per-butir breakdown in the Marking page's evidence panel)
- No localhost mockup of the TA-facing experience yet

## What we'd love your take on

1. Does the content-sniffing approach (plain text vs. rubric JSON in the same field)
   seem reasonable to you as a zero-risk way to pilot this, or would you rather see
   a dedicated new field/column from the start?
2. Any objection to widening `poin`/`skorEsai` to a decimal type down the line?
3. Interested in collaborating on turning this into a real PR once it's further
   validated, or is there context about FTTI Hub's roadmap that would change the
   approach?

Happy to walk through the code or the validation results live whenever works.
