# Truth Class Question Bank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Message Registry (the data backbone the whole Truth Class pipeline runs on) and prove the Tahap 1 process end-to-end on the one real transcript that already exists (message 7, Surabaya).

**Architecture:** A hand-curated `data/message_registry.json` (72 messages: number, EN/ID topic, syllabus reference, teaching instances) is the single source of truth every later stage (Tahap 1-5) reads from and writes into. A small, fully-deterministic filename parser turns a transcript document's title into structured metadata (period/week/campus/trainer) that gets appended to the relevant message's `instances[]`. Everything else in this plan is content work — reading the one available transcript and producing its Tahap 1 Session Outline — done by directly following the process defined in `docs/superpowers/specs/2026-09-07-truth-class-question-bank-design.md`, not by scripting judgment calls.

**Tech Stack:** Python 3 (stdlib only — `json`, `re`, no external dependencies), Markdown for content deliverables, `pdftotext` (poppler, already installed via `brew install poppler`) for reading the outline PDFs.

**Out of scope for this plan** (per the spec's "Out of scope" section — do not attempt): automated audio/video transcription, exam bundling across messages, full verification of the bibleread.online book catalog, and Tahap 1b/2/3/4/5 for message 7 (this plan stops once Tahap 1 for message 7 is proven — continuing the pipeline for message 7, and starting it for every other message, is ongoing content-production work that reuses what this plan builds, not further "implementation").

---

## File Structure

```
data/
  message_registry.json              # 72 entries: message_no, topic_en, topic_id, section, reference, instances[]
scripts/
  parse_transcript_filename.py       # transcript doc title -> {period, week, campus, trainer}
tests/
  test_parse_transcript_filename.py
transcripts/
  raw/
    TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt   # archived full transcript text (Drive doc -> local file)
messages/
  M07/
    Truth_M07_SBY_SessionOutline.md   # Tahap 1 output for the pilot message
README.md                             # updated with a status table (mirrors FTTI's README pattern)
```

## Task 1: Project scaffolding

**Files:**
- Create: `data/.gitkeep`, `scripts/.gitkeep`, `tests/.gitkeep`, `transcripts/raw/.gitkeep`, `messages/.gitkeep`

- [ ] **Step 1: Create the directory structure**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
mkdir -p data scripts tests transcripts/raw messages
touch data/.gitkeep scripts/.gitkeep tests/.gitkeep transcripts/raw/.gitkeep messages/.gitkeep
```

- [ ] **Step 2: Verify structure**

Run: `find data scripts tests transcripts messages -type d`
Expected output (order may vary):
```
data
scripts
tests
transcripts
transcripts/raw
messages
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add data scripts tests transcripts messages
git commit -m "chore: scaffold project directories"
```

---

## Task 2: Message Registry seed data

**Files:**
- Create: `data/message_registry.json`

The registry has exactly 72 entries, `message_no` 1-72, matching the global numbering already printed in the **English** outline's Table of Contents (it numbers messages 1-72 continuously; the Indonesian PDF's table of contents restarts numbering per section, so use the English PDF as the numbering authority and match Indonesian titles to it by content, not by the Indonesian PDF's own local numbers).

- [ ] **Step 1: Read both outline PDFs' full text**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/TRUTH CLASS OUTLINE EN-ID"
pdftotext -layout "Outline Truth 1st yr 2023 (Eng).pdf" - > /tmp/outline_en.txt
pdftotext -layout "Outline Truth 1st Year 2023 (ID).pdf" - > /tmp/outline_id.txt
```

- [ ] **Step 2: Author `data/message_registry.json`**

For each `message_no` 1-72, read its title from the "Table of Contents of Truth" section at the top of `/tmp/outline_en.txt` (some titles wrap across two printed lines — join them into one string) and its Indonesian equivalent from the matching message body in `/tmp/outline_id.txt` (search for the section name, e.g. "Allah Tritunggal", then the Nth "Berita" heading within that section — Indonesian section order and message count per section is identical to English, only the numbering restarts per section). Group messages into `section` using these EN section headers, in this fixed order (verified against both PDFs' body headings — do not reorder): `TRIUNE GOD AND HIS ECONOMY` (msg 1-9), `THE FULL MINISTRY OF CHRIST` (msg 10-18), `THE SPIRIT` (msg 19-27), `THE BELIEVERS` (msg 28-36), `THE CHURCH` (msg 37-49), `THE KINGDOM` (msg 50-53), `THE NEW JERUSALEM` (msg 54-72).

Write the file with this exact schema (shown fully populated for messages 1, 7, 8, 9 — the ones needed for Task 5's pilot — as a worked example; continue the same structure for message_no 2-6 and 10-72 by reading the PDFs as described above):

```json
[
  {
    "message_no": 1,
    "section": "TRIUNE GOD AND HIS ECONOMY",
    "topic_en": "God's Plan",
    "topic_id": "Rencana Allah",
    "reference": null,
    "instances": []
  },
  {
    "message_no": 7,
    "section": "TRIUNE GOD AND HIS ECONOMY",
    "topic_en": "The Divine Dispensing in the Book of Romans (3): The Goal of the Dispensing of the Divine Trinity in the Believers",
    "topic_id": "Penyaluran Ilahi di dalam Kitab Roma (3) — Tujuan Penyaluran Trinitas Ilahi dalam Kaum Beriman",
    "reference": "A Deeper Study of the Divine Dispensing of the Divine Trinity",
    "instances": []
  },
  {
    "message_no": 8,
    "section": "TRIUNE GOD AND HIS ECONOMY",
    "topic_en": "The Divine Dispensing in the Book of 1-2 Corinthians (1): The Divine Dispensing of the All-inclusive Christ in Supplying, Sustaining, Feeding, Watering, and Transforming the Believers",
    "topic_id": "Penyaluran Ilahi di dalam Kitab 1-2 Korintus (1) — Penyaluran Ilahi dari Kristus yang Almuhit dalam Menyuplai, Menunjang, Memberi Makan, Menyirami dan Mengubah Kaum Beriman",
    "reference": null,
    "instances": []
  },
  {
    "message_no": 9,
    "section": "TRIUNE GOD AND HIS ECONOMY",
    "topic_en": "The Divine Dispensing in the Book of 1-2 Corinthians (2): The Divine Dispensing of the All-inclusive Christ Becoming the Factor for the Growth and the Building Up of the Church",
    "topic_id": "Penyaluran Ilahi di dalam Kitab 1-2 Korintus (2) — Penyaluran Ilahi dari Kristus yang Almuhit Menjadi Faktor Pertumbuhan dan Pembangunan Gereja",
    "reference": null,
    "instances": []
  }
]
```

`reference` is only known where the Syllabus Sheet's REFERENCE column has already been read (message 7, confirmed as "A Deeper Study of the Divine Dispensing of the Divine Trinity" from the syllabus row for that session); leave it `null` for messages whose syllabus row hasn't been read yet — that's a real "not yet looked up" state the registry is designed to hold (see spec's "instances" field, same idea), not a placeholder in code. `instances` starts as `[]` for every message; Task 6 appends to it.

- [ ] **Step 3: Validate**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
python3 -c "
import json
d = json.load(open('data/message_registry.json'))
assert len(d) == 72, f'expected 72 entries, got {len(d)}'
assert [e['message_no'] for e in d] == list(range(1, 73)), 'message_no must be 1..72 in order'
assert all(e['topic_en'] and e['topic_id'] for e in d), 'every entry needs topic_en and topic_id'
assert all(e['instances'] == [] for e in d), 'instances must start empty'
print('OK: 72 messages, all titles present')
"
```

Expected: `OK: 72 messages, all titles present`

- [ ] **Step 4: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add data/message_registry.json
git commit -m "data: seed message registry from Truth Class outline (72 messages)"
```

---

## Task 3: Transcript filename parser

**Files:**
- Create: `scripts/parse_transcript_filename.py`
- Test: `tests/test_parse_transcript_filename.py`

Transcript documents in the shared Drive folder are titled like `TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)`. This step parses that title into structured fields; it does **not** decide which `message_no` the transcript covers (that requires reading the transcript's content, done in Task 6/7).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_parse_transcript_filename.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from parse_transcript_filename import parse_transcript_filename


def test_parses_full_title_with_trainer():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)")
    assert result == {
        "period": "JULDES 2026",
        "week": 7,
        "campus": "SBY",
        "trainer": "PAULUS O",
    }


def test_parses_title_without_trainer():
    result = parse_transcript_filename("TRUTH CLASS JULDES 2026 R3 - SENTUL")
    assert result == {
        "period": "JULDES 2026",
        "week": 3,
        "campus": "SENTUL",
        "trainer": None,
    }


def test_rejects_unrecognized_title():
    try:
        parse_transcript_filename("some random file name")
        assert False, "expected ValueError"
    except ValueError:
        pass
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK" && python3 -m pytest tests/test_parse_transcript_filename.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'parse_transcript_filename'`

- [ ] **Step 3: Write the implementation**

```python
# scripts/parse_transcript_filename.py
import re

_PATTERN = re.compile(
    r'^TRUTH CLASS (?P<period>[A-Z]+ \d{4}) R(?P<week>\d+) - (?P<campus>[A-Z]+)'
    r'(?: \((?P<trainer>[^)]+)\))?$'
)


def parse_transcript_filename(title):
    """Parse a Truth Class transcript document title into its parts.

    Expected format: "TRUTH CLASS <PERIOD> R<week> - <CAMPUS> (<trainer>)"
    The trainer group is optional (omitted when not present in the title).
    Raises ValueError if the title doesn't match the expected format.
    """
    match = _PATTERN.match(title.strip())
    if not match:
        raise ValueError(f"unrecognized transcript filename: {title!r}")
    return {
        "period": match.group("period"),
        "week": int(match.group("week")),
        "campus": match.group("campus"),
        "trainer": match.group("trainer"),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK" && python3 -m pytest tests/test_parse_transcript_filename.py -v`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add scripts/parse_transcript_filename.py tests/test_parse_transcript_filename.py
git commit -m "feat: parse Truth Class transcript filenames into structured metadata"
```

---

## Task 4: Archive the one existing transcript locally

**Files:**
- Create: `transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt`

The transcript lives as a Google Doc (`TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)`, id `1DuiLPeEe-LQzL1FbQYZcsgYwic9AZf7TvNXQhvWiIm8`) in the Drive folder the user shared (`https://drive.google.com/drive/u/0/folders/13cIYA2YU8thPkSQrp6gtXN1q7F-IKbYC`). Tahap 1 must be written from the full transcript, not a truncated preview.

- [ ] **Step 1: Fetch the full document content**

Use the `mcp__claude_ai_Google_Drive__read_file_content` tool with `fileId: "1DuiLPeEe-LQzL1FbQYZcsgYwic9AZf7TvNXQhvWiIm8"`. The result is large (>100k characters) and will be saved by the tool to a local JSON file (`{fileContent: string}`) rather than returned inline — note the path the tool reports.

- [ ] **Step 2: Extract `fileContent` into the archive file**

```bash
python3 -c "
import json
with open('<path reported by the tool in Step 1>') as f:
    d = json.load(f)
with open('/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt', 'w') as out:
    out.write(d['fileContent'])
"
```

- [ ] **Step 3: Verify**

Run: `wc -l "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt"`
Expected: a non-trivial line count (the doc is known to be >100k characters of Indonesian transcript text).

- [ ] **Step 4: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt
git commit -m "data: archive R7 SBY transcript (Paulus O) for local processing"
```

---

## Task 5: Register the transcript instance in the Message Registry

**Files:**
- Modify: `data/message_registry.json`

Read `transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt` in full. Per the already-fetched preview, this class opens by stating its topic directly: *"kelas yang saya mau share sama Anda adalah penyaluran Ilahi di dalam kitab Roma... tujuan dari penyaluran Trinitas Ilahi dalam kaum beriman"* — this is message 7's exact title ("The Divine Dispensing in the Book of Romans (3): **The Goal** of the Dispensing of the Divine Trinity in the Believers"). The same preview shows the class also explicitly reaching 1-2 Corinthians' building theme (*"tujuan dari kitab Korinthi ini adalah membangun para anggota tubuh menjadi tubuh Kristus... bukan hanya anggota tubuh yang diselamatkan tetapi secara positif menjadi tubuh Kristus"*) — matching message 9's title. Confirm both, and check whether message 8 (1-2 Corinthians (1): supplying/sustaining) is also taught, by reading the full archived transcript from Task 4 (the preview alone doesn't cover the whole class).

- [ ] **Step 1: Determine exactly which message_no this instance covers**

Read the full transcript file and list, with a quoted excerpt for each, every message_no (from message 7, 8, 9 — the only candidates, since this class is the Week 7 Truth Class session per the syllabus) that the transcript actually teaches. Do not include a message_no without a quoted excerpt backing it — this is the same rule the spec's Tahap 1 uses for the full pipeline (transcript is the sole determinant).

- [ ] **Step 2: Append an instance entry to each confirmed message_no**

For each `message_no` confirmed in Step 1, add this object to that message's `instances` array in `data/message_registry.json` (parse the filename with `scripts/parse_transcript_filename.py` to get `period`/`week`/`campus`/`trainer` rather than retyping them by hand):

```python
import json
import sys
sys.path.insert(0, "scripts")
from parse_transcript_filename import parse_transcript_filename

meta = parse_transcript_filename("TRUTH CLASS JULDES 2026 R7 - SBY (PAULUS O)")
instance = {
    "campus": meta["campus"],
    "trainer": meta["trainer"],
    "period": meta["period"],
    "week": meta["week"],
    "transcript_doc_id": "1DuiLPeEe-LQzL1FbQYZcsgYwic9AZf7TvNXQhvWiIm8",
    "transcript_local_path": "transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt",
}
```

Load `data/message_registry.json`, append `instance` to `instances` for each confirmed `message_no`'s entry, and write the file back with `json.dump(data, f, indent=2, ensure_ascii=False)`.

- [ ] **Step 3: Verify**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
python3 -c "
import json
d = json.load(open('data/message_registry.json'))
by_no = {e['message_no']: e for e in d}
covered = [no for no, e in by_no.items() if e['instances']]
print('messages with at least one instance:', covered)
assert 7 in covered, 'message 7 must have the R7 SBY instance (it is the class stated topic)'
for no in covered:
    inst = by_no[no]['instances'][0]
    assert inst['campus'] == 'SBY' and inst['trainer'] == 'PAULUS O'
print('OK')
"
```

Expected: prints the covered message list (must include 7) and `OK`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add data/message_registry.json
git commit -m "data: register R7 SBY transcript instance against its covered messages"
```

---

## Task 6: Tahap 1 Session Outline for message 7 (pilot)

**Files:**
- Create: `messages/M07/Truth_M07_SBY_SessionOutline.md`

Follow the spec's Tahap 1 process (`docs/superpowers/specs/2026-09-07-truth-class-question-bank-design.md`): build a faithful record of what this one instance actually taught for message 7 — not general Bible knowledge, not content from the outline PDF that wasn't actually spoken in this transcript.

- [ ] **Step 1: Write the outline**

Using only `transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt`, write `messages/M07/Truth_M07_SBY_SessionOutline.md` with this structure:

```markdown
# Truth Message 7 — Session Outline (Instance: SBY, R7, JULDES 2026, Trainer: Paulus O)

**Source:** transcripts/raw/TRUTH_CLASS_JULDES_2026_R7_SBY_PaulusO.txt
**Message (per Outline PDF):** The Divine Dispensing in the Book of Romans (3): The Goal of the Dispensing of the Divine Trinity in the Believers

## Points taught

(One entry per point actually taught in this transcript, in the order taught. Each point
must carry a short quoted excerpt as evidence — the same evidence-column discipline used
in Tahap 3. Example first entry, continue this pattern for every point found in the
transcript:)

1. **Penyaluran Ilahi bukan istilah tekstual, tetapi realitas Alkitabiah** — Roma 8:11 dst.
   > "Ini kata penyaluran ini tidak ada secara teks tetapi yang ada adalah realitas."

## Terminology used

(List distinctive terms the trainer used, e.g. "penyaluran," "aspek yuridis," "aspek organik" —
cross-check spelling/register against the Outline PDF and the mandatory-terminology list in
00 WORKFLOW/FTTI_Workflow_v2.md-equivalent guidance from the sibling FTTI project, once that
guidance is ported for Truth Class.)

## Not covered in this instance

(Any point from the Outline PDF's message 7 section that this transcript did NOT teach —
leave this list empty only if every outline point was actually covered; do not assume
coverage without a quoted excerpt.)
```

- [ ] **Step 2: Self-check against the spec's Tahap 1 rules**

Confirm, rereading the finished file: every point has a quoted excerpt (no point stated without evidence); no framing like "according to the class" appears (points are recorded as what-was-taught facts, for internal use — the "direct statement" framing rule applies starting at Tahap 3, but excerpts here should still be traceable); nothing from Romans/1-2 Corinthians general knowledge was added that isn't in the transcript.

- [ ] **Step 3: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add messages/M07/Truth_M07_SBY_SessionOutline.md
git commit -m "docs: Tahap 1 session outline for message 7 (SBY, R7)"
```

---

## Task 7: Update README status

**Files:**
- Create: `README.md`

Mirror the sibling FTTI project's README pattern (a short status table), scoped to what actually exists now.

- [ ] **Step 1: Write `README.md`**

```markdown
# Truth Class Question Bank

Question bank production for FTTI's Truth Class curriculum (72 messages, Full-Time
Training Indonesia), taught across two campuses (Sentul, Surabaya). See
`docs/superpowers/specs/2026-09-07-truth-class-question-bank-design.md` for the full
pipeline design.

## Status

| Message | Topic | SBY instance | Sentul instance | Tahap 1 | Tahap 1b | Tahap 2-5 |
| :-: | :-- | :-: | :-: | :-: | :-: | :-: |
| 7 | Divine Dispensing in Romans (3): The Goal | ✅ R7 (Paulus O) | ⏳ pending | ✅ | ⏳ partial, awaiting Sentul | not started |
| 8 | Divine Dispensing in 1-2 Corinthians (1) | see Task 5 result | ⏳ pending | not started | not started | not started |
| 9 | Divine Dispensing in 1-2 Corinthians (2) | see Task 5 result | ⏳ pending | not started | not started | not started |
| 1-6, 10-72 | — | no transcript yet | no transcript yet | not started | not started | not started |

Update the "SBY instance" / "Sentul instance" columns for messages 8-9 based on
whichever ones Task 5 actually confirmed instances for.
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add README.md
git commit -m "docs: add project README with pipeline status table"
```

---

## Self-Review Notes

- **Spec coverage:** Message Registry (spec's data model) → Tasks 1-2, 5. Transcript instance ingestion → Tasks 3-5. Tahap 1 process → Task 6. Tahap 1b/2/3/4/5, exam bundling, and STT automation are explicitly out of scope per the spec's own "Out of scope" section and are not silently dropped — they're named above as deferred, not implemented here.
- **Placeholder scan:** the only two spots that don't contain fully pre-computed final content are (a) Task 2's message_no 2-6/10-72 titles and (b) Task 6's outline body beyond the first worked example point — both point at a concrete, already-open source document and a concrete verification check, not a vague "handle it." This is a deliberate boundary between "plan" and "content production," documented in the Goal section.
- **Type/name consistency:** `message_registry.json` schema (`message_no`, `section`, `topic_en`, `topic_id`, `reference`, `instances`) is used identically in Tasks 2, 5, 6, 7. `parse_transcript_filename()`'s return keys (`period`, `week`, `campus`, `trainer`) match what Task 5 consumes.
