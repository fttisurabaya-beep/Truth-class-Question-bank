# Truth Class Question Bank — Design Spec

Date: 2026-09-07
Status: Approved for planning

## Background

FTTI (Full-Time Training Indonesia) runs a "Truth Class" curriculum — 72 systematic-theology messages (Triune God and His Economy, Full Ministry of Christ, the Spirit, the Believers, the Church, the Kingdom, the New Jerusalem), taught across two campuses (Sentul and Surabaya). This project produces a bilingual (ID/EN) exam question bank for Truth Class, built from actual class-recording transcripts and verified against reference material — never from general theological knowledge.

This reuses the methodology already proven in the sibling project **QUESTION BANK FTTI** (`/Users/apple/Documents/SERVICES/QUESTION BANK FTTI`), which runs the same kind of pipeline for New Testament Bible-book classes. The core difference: Bible Class has one fixed teacher across years: Truth Class is taught by several different people, sometimes different per campus for the same message, so questions must be checked for fairness across campuses before they're eligible for the shared final exam.

## Source authority hierarchy

In order of authority (highest first — later tiers verify, they never introduce untested material):

1. **Class transcripts** (Sentul / Surabaya, per message) — the sole determinant of what may be tested. A point never taught in a transcript is never tested, no matter how central it is to the topic.
2. **Truth Class Outline** (`TRUTH CLASS OUTLINE EN-ID/Outline Truth 1st yr 2023 (Eng/ID).pdf`) — verifies terminology and point numbering. Not a source of testable material by itself.
3. **Per-message REFERENCE book** (named in the syllabus's REFERENCE column, e.g. "God's New Testament Economy, ch 6", "The Basic Revelation In The Holy Scriptures, ch 1") — verifies interpretive claims. Looked up via bibleread.online / mybible.ws (Life-Study of the Bible index and the Watchman Nee/Witness Lee book catalog) where available.
4. **Bible** (Recovery Version, via bibleread.online) — verse references are always address + paraphrase. Recovery Version footnotes and body text are never reproduced (site only exposes outline/heading-level structure for Life-Study of the Bible anyway, which matches this constraint).

Framing rule carried over from FTTI: questions are direct statements referencing verses/events/concepts. Never "according to the class..." or "the teacher said...". Attribute interpretation to a named figure (Watchman Nee, Witness Lee) only when necessary, never to "the teacher."

## Data sources

- **Truth Class Outline PDF** (EN + ID) — already in this repo, 72 messages, point structure (I/A/B/C...).
- **Syllabus Sheet** (Google Sheets, "1st Year" tab and others) — columns `YEAR | DATE | WEEK | SESSION | SUBJECT | TOPIC | REFERENCE | TRAINER`. `SESSION` = message number. `TRAINER` is a single name when an international trainer covers both campuses, or `"Sentul: X  Surabaya: Y"` when local trainers differ per campus.
- **Class transcripts** — arrive as Google Docs in a shared Drive folder (e.g. `TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)`), one doc per (period, week/session, campus, trainer) instance. `R#` in the filename is the week/session sequence number within the term, not a parallel class section — so each message typically has **at most 2 instances** (one per campus), sometimes 1 (shared international trainer).
- **bibleread.online / mybible.ws** — Life-Study of the Bible outlines (`/life-study-of-the-bible/life-study-of-[book]/[message-no]/`) and the Watchman Nee/Witness Lee book catalog, used as Tier 3 verification per the REFERENCE column. Only outline/heading-level content is available (no full text) — consistent with the "never reproduce copyrighted text" rule.

## Pipeline

```
Syllabus Sheet + Outline PDF
        │
        ▼
  Message Registry (72 entries: message_no, topic_en/id, reference,
  instances[] = {campus, trainer, period, week, transcript_doc_id})
        │
        ▼ (per instance, as transcripts arrive)
  [Tahap 1] Session Outline — one per (message, campus) instance,
  faithful to that transcript only, tagged with its source
        │
        ▼ (once all expected instances for a message exist)
  [Tahap 1b] Merged Teaching Outline — combine all instances for
  the message; tag every point:
    [Bersama]      — taught in every instance available
    [Hanya Sentul] / [Hanya Surabaya] — taught in only one
  If an expected instance (e.g. Sentul) hasn't arrived yet, the
  merged outline is marked "partial — awaiting <campus>" and stays
  in that state; Tahap 3 may run on partial data but Tahap 4
  final selection waits for full instance coverage.
        │
        ▼
  [Tahap 2] Coverage Audit — reconcile against the Outline PDF
  (terminology/point numbering) and the REFERENCE book (interpretive
  claims); cross-message uniqueness map (same mechanic as FTTI, now
  across the 72-message registry instead of across Bible books);
  explicit fairness check for [Hanya X] points.
        │
        ▼
  [Tahap 3] Full candidate bank — one row per testable sub-fact,
  four-focus (Fakta/Interpretasi/Tema/Aplikasi), balanced options,
  evidence column citing the transcript excerpt. Each candidate is
  tagged with its source instance(s) and [Bersama]/[Hanya X] status.
        │
        ▼
  [Tahap 4] Selection to final N — DEFAULT: only [Bersama] candidates
  are eligible for the final bank (fairness: the shared exam must not
  test material only taught at one campus). [Hanya X] candidates are
  recorded in the inventory with the reason, promotable later if the
  gap gets taught/confirmed at the other campus.
        │
        ▼
  Production — final bank docx/md (ID+EN, landscape for candidate
  dumps, portrait for the trainee exam), single shared answer key.
  Exam bundling (which messages go into one printed exam) is decided
  later based on transcript-readiness progress, the same way FTTI
  grouped Test 1-5 by book — not fixed upfront.
        │
        ▼
  [Tahap 5] Quality Control (optional, pre-print) — same checklist
  as FTTI: key accuracy, ambiguous stems, length-cue ratio < 2.3,
  weak distractors, framing/register compliance.
```

## Fairness rule (new vs. FTTI)

Because Sentul and Surabaya trainees sit the same exam, a question is only eligible for the final bank if the underlying point was taught at **every campus instance that exists for that message** at selection time. This is re-checked whenever a previously-missing instance arrives — a message finalized from Surabaya-only data must be re-audited once Sentul's transcript lands, before its final bank is treated as locked.

## Unit of work

Per **message** (1 of 72), not grouped by SUBJECT — each message gets its own Tahap 1/1b/2/3/4 documents, matching the granularity of the instance registry. Grouping into printed exam bundles happens only at the Production stage, and is scoped by transcript-readiness progress rather than fixed in advance.

## File naming

| Document | Filename |
| :-: | :-: |
| Message Registry (data) | `Truth_Message_Registry.json` |
| Session Outline (Tahap 1, per instance) | `Truth_M[NN]_[Campus]_SessionOutline.md` |
| Merged Teaching Outline (Tahap 1b) | `Truth_M[NN]_Teaching_Outline.md` |
| Coverage Audit (Tahap 2) | `Truth_M[NN]_Outline_Audit_Tahap2.md` |
| Candidate bank, EN (Tahap 3) | `Truth_M[NN]_QuestionBank_Tahap3_FULL.md` + `.docx` |
| Candidate bank, ID (Tahap 3) | `Truth_M[NN]_QuestionBank_Tahap3_FULL_ID.md` + `_ID.docx` |
| Selection Audit, EN/ID (Tahap 4) | `Truth_M[NN]_QuestionBank_Audit_Tahap4.md` / `_ID.md` |
| Trainee exam (bundled, ID/EN) | `Ujian_Truth_[bundle-name]_Trainee_ID.docx` / `FTTI_Truth_[bundle-name]_Exam_Trainee.docx` |
| Answer key (shared ID+EN) | `Kunci_Jawaban_Truth_[bundle-name].docx` |
| Quality Review (Tahap 5) | `Truth_M[NN]_QualityReview_Tahap5.md` |

`[NN]` = message number, zero-padded (01-72). Bilingual register rules (ID/EN diction, italic inline verse quotes, no "Answer:" line under exam options, shared answer-key grid convention) carry over unchanged from `00 WORKFLOW/FTTI_Workflow_v2.md`.

## Current state (as of 2026-09-07)

- Truth Class Outline PDF (EN+ID) and Syllabus Sheet are available now.
- Transcripts: only Surabaya has started arriving (1 transcript so far: message covering Romans/1-2 Corinthians dispensing, campus SBY, trainer "Paulus O"). Sentul transcripts are expected later in the same Drive folder.
- Messages with incomplete instance coverage stay in "partial" status per the Tahap 1b rule above; no final bank is produced for them yet.

## Out of scope for this spec (decide later / separate work)

- **Automated audio/video transcription.** Recordings exist in the cloud, but the transcript that has actually arrived so far is already text (a Google Doc), suggesting transcription happens externally before docs land in the tracked Drive folder. If/when raw audio needs transcribing as part of this pipeline, that's a separate design.
- **Exam bundling scheme** (how many messages per printed exam, aligned to term/semester boundaries) — decided when enough messages reach "complete" status, mirroring how FTTI's Test 1-5 groupings were decided incrementally.
- **Full verification of the bibleread.online/mybible.ws book catalog** — the "All books by Watchman Nee and Witness Lee" index page is JS-rendered and wasn't fully enumerable via automated fetch; confirming which REFERENCE titles are actually indexed there needs a manual/browser check during implementation.

## Testing / validation approach

Same verification discipline as FTTI Tahap 4/5: spot-check answer keys for interpretively-critical questions against the source transcript; verify ID/EN answer-key position parity; verify length-cue ratio; verify 0 stray "Answer:"/"Jawaban:" lines. No automated test suite — this is a content-production pipeline, not software, so "testing" means the audit stages themselves.
