# Truth Class Question Bank

Question bank production for FTTI's Truth Class curriculum (72 messages, Full-Time
Training Indonesia), taught across two campuses (Sentul, Surabaya). See
`docs/superpowers/specs/2026-09-07-truth-class-question-bank-design.md` for the full
pipeline design.

## Exam scope (confirmed)

This project produces **Truth Test (2)** — the second of 5 Truth Tests scheduled this
term (org exam calendar: Truth Test (1) Aug. 12, **Truth Test (2) Sep. 9**, Truth Test
(3) Oct. 7, Truth Test (4) Oct. 30, Truth Test (5) Nov. 13). Truth Test (1) already
took place using recycled/photocopied questions from a prior term, not produced by this
pipeline — this project's first deliverable is Test (2).

Truth Test (2) covers **message 7-9 only** (Roma (3), 1-2 Korintus (1)-(2)). Message
5-6 (Roma (1)-(2), taught by Isaac Kwoon, SHARED instance) were processed through
Tahap 3 as reference material but are **out of scope for Test (2)** — not included in
its final bank; they may feed a later Truth Test. Message 3-4 were never processed.

**SBY and Sentul are two permanent separate exam tracks**, not one reconciled bank.
Sentul's transcript covers only ~43% of the outline sub-points SBY covers (time
management, not competence — see
`messages/TRUTH-TEST-2-JULDES-2026/Perbandingan_SBY_vs_SENTUL_Message7-9.md`), too large
a gap to merge fairly into a single shared exam.

## Repo layout for exam-cycle deliverables

Tahap 1-3 (per message, per campus) live under `messages/M0[7-9]/` as before — that
folder already handles the shared-vs-split question per message via filename suffix
(`_SBY_`, `_SENTUL_`, `_SHARED_`), so it is untouched by the layout below.

Tahap 4 onward (final selection, QC, study guide, production) is tied to a specific
**exam cycle**, not to a single message, so it is grouped under
`messages/<TEST-CYCLE-NAME>/`. For this cycle:

```
messages/TRUTH-TEST-2-JULDES-2026/
  SURABAYA/     — Tahap 4, Tahap 5, Candidate Reference, kisi-kisi (SBY-only)
  SENTUL/       — Tahap 4, Tahap 5, kisi-kisi ID+EN (Sentul-only)
  PRODUKSI/     — final exam/key/item bank docx+md for both campuses
  Perbandingan_SBY_vs_SENTUL_Message7-9.md   — cross-campus, not campus-specific
  Validasi_Urutan_Pasal_SENTUL_Message7-9.md — cross-campus, not campus-specific
```

A future Truth Test that does **not** need a campus split (e.g. shared trainer across
campuses) does not have to replicate the `SURABAYA/`+`SENTUL/` split — its files can sit
directly under its own `messages/<TEST-CYCLE-NAME>/` folder.

## Status

| Track | Tahap 1 | Tahap 2 | Tahap 3 (kandidat) | Tahap 4 (final) | Tahap 5 (QC) | Kisi-kisi | Produksi |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **SBY** (message 7-9, Paulus Oenjoyo) | ✅ | ✅ | ✅ 73 kandidat | ✅ 50 soal | ✅ (15 stem diperbaiki) | ✅ v3 | ✅ Ujian + Kunci + Item Bank |
| **Sentul** (message 7-9, Br. Ronal) | ✅ | ✅ | ✅ 47 kandidat | ✅ 45 soal | ✅ (8 stem diperbaiki) | ✅ v1 | ✅ Ujian + Kunci + Item Bank |
| Message 5-6 (Isaac Kwoon, SHARED) | ✅ | ✅ | ✅ (referensi, di luar cakupan ujian) | — | — | — | — |
| Message 1-4, 10-72 | belum ada transkrip | — | — | — | — | — | — |

Sentul's lower candidate count (47 vs SBY's 73) directly reflects thinner class coverage,
not a processing gap — see
`messages/TRUTH-TEST-2-JULDES-2026/SENTUL/Truth_M07-09_SENTUL_QuestionBank_Audit_Tahap4_ID.md`
§8 and the comparison doc above for the full breakdown.

## SBY track deliverables (message 7-9, "Truth Test (2)")

- **Tahap 1** — `messages/M0[7-9]/Truth_M0[7-9]_SBY_SessionOutline.md`
- **Tahap 2** — `messages/M0[7-9]/Truth_M0[7-9]_Outline_Audit_Tahap2.md`
- **Tahap 3** — `messages/M0[7-9]/Truth_M0[7-9]_QuestionBank_Tahap3_ID.md` (73 kandidat total)
- **Tahap 4** — `messages/TRUTH-TEST-2-JULDES-2026/SURABAYA/Truth_M07-09_QuestionBank_Audit_Tahap4_ID.md` (+ `.docx` landscape) — 50 soal final
- **Tahap 5** — `messages/TRUTH-TEST-2-JULDES-2026/SURABAYA/Truth_M07-09_QualityReview_Tahap5_ID.md` — QC 7 kriteria, 15/50 stem framing diperbaiki
- **Referensi QC** — `messages/TRUTH-TEST-2-JULDES-2026/SURABAYA/Truth_M07-09_SBY_CandidateReference.md` (+ `.docx`) — 73 kandidat, ditandai Terpilih/Cadangan
- **Kisi-kisi trainee** — `messages/TRUTH-TEST-2-JULDES-2026/SURABAYA/Kisi_Kisi_Ujian_Trainee_M07-09.md` [v3, final]
- **Produksi** (`messages/TRUTH-TEST-2-JULDES-2026/PRODUKSI/`):
  - `1ST YR - TRUTH TEST (2) - JULDES 2026 - SURABAYA.docx` — lembar ujian trainee (ID saja, tidak ada trainee internasional)
  - `1ST YR - ANSWER KEY TRUTH TEST (2) - JULDES 2026 - SURABAYA.docx` — kunci jawaban
  - `1ST YR - ITEM BANK TRUTH TEST (2) - JULDES 2026 - SURABAYA.md` (+ `.docx`) — referensi instruktur/QC (50 teruji + 23 cadangan)
  - `Truth_M07-09_SBY_ShuffledAnswerMap.json` — peta soal↔posisi jawaban final

## Sentul track deliverables (message 7-9, "Truth Test (2)")

- **Tahap 1** — `messages/M0[7-9]/Truth_M0[7-9]_SENTUL_SessionOutline.md`
- **Tahap 2** — `messages/M0[7-9]/Truth_M0[7-9]_SENTUL_Outline_Audit_Tahap2.md`
- **Tahap 3** — `messages/M0[7-9]/Truth_M0[7-9]_SENTUL_QuestionBank_Tahap3_ID.md` (47 kandidat total — M07: 13, M08: 20, M09: 14; termasuk 10 kandidat dari materi latar belakang, disetujui TA Kurikulum Sentul 2026-09-09)
- **Tahap 4** — `messages/TRUTH-TEST-2-JULDES-2026/SENTUL/Truth_M07-09_SENTUL_QuestionBank_Audit_Tahap4_ID.md` — 45 soal final (drop 2, ~4% penyaringan — target 45 ditetapkan eksplisit, bukan 50)
- **Tahap 5** — `messages/TRUTH-TEST-2-JULDES-2026/SENTUL/Truth_M07-09_SENTUL_QualityReview_Tahap5_ID.md` — QC 7 kriteria, 8/45 stem framing diperbaiki
- **Kisi-kisi trainee** — `messages/TRUTH-TEST-2-JULDES-2026/SENTUL/Kisi_Kisi_Ujian_Trainee_SENTUL_M07-09.md` [v1, final, ID] — termasuk peringatan bahwa 10 soal berasal dari materi latar belakang di luar outline resmi; versi Inggris: `messages/TRUTH-TEST-2-JULDES-2026/SENTUL/Kisi_Kisi_Ujian_Trainee_SENTUL_M07-09_EN.md` [v1, EN] — untuk trainee internasional Sentul
- **Produksi** (`messages/TRUTH-TEST-2-JULDES-2026/PRODUKSI/`):
  - `1ST YR - TRUTH TEST (2) - JULDES 2026 - SENTUL.docx` — lembar ujian trainee (ID)
  - `1ST YR - TRUTH TEST (2) - JULDES 2026 - SENTUL (Eng).docx` — lembar ujian trainee versi Inggris, untuk trainee internasional Sentul (SBY tidak butuh versi ini karena tidak ada trainee internasional). Terjemahan menjaga urutan opsi A/B/C/D persis sama dengan versi ID, jadi memakai kunci jawaban ID yang sama (tidak ada kunci jawaban EN terpisah)
  - `1ST YR - ANSWER KEY TRUTH TEST (2) - JULDES 2026 - SENTUL.docx` — kunci jawaban (posisi teracak 11/11/12/11), berlaku untuk versi ID maupun EN
  - `1ST YR - ITEM BANK TRUTH TEST (2) - JULDES 2026 - SENTUL.md` (+ `.docx`) — referensi instruktur/QC (45 teruji + 2 cadangan)
  - `Truth_M07-09_SENTUL_ShuffledAnswerMap.json` — peta soal↔posisi jawaban final (ID)

**Cakupan ujian Sentul identik dengan SBY: hanya message 7-9.** Message 5-6 (Isaac Kwoon) TIDAK dipakai di ujian manapun (dikonfirmasi 2026-09-09, meralat asumsi awal proyek).

## PIC-facing analysis docs

- `messages/TRUTH-TEST-2-JULDES-2026/Perbandingan_SBY_vs_SENTUL_Message7-9.md` — perbandingan materi yang benar-benar diajarkan per kampus (dari Tahap 1), untuk PIC wilayah masing-masing
- `messages/TRUTH-TEST-2-JULDES-2026/Validasi_Urutan_Pasal_SENTUL_Message7-9.md` — validasi (menolak) rumor bahwa Sentul mengajar berurutan pasal Alkitab

## Source material tracked in this repo

- `transcripts/raw/` — transkrip kelas mentah (sumber utama, satu-satunya penentu apa yang diujikan)
- `TRUTH CLASS OUTLINE EN-ID/` — outline resmi Truth Class (EN+ID PDF), Tier 2 — verifikasi terminologi/penomoran poin
- `data/message_registry.json` — registry 72 message, instance per kampus/trainer

## Google Drive

Semua dokumen di atas (kecuali file `.docx` produksi karena kendala teknis upload) juga
tersedia sebagai Google Docs di folder kerja bersama — cari lewat judul yang sama di
Drive, atau minta link ke PIC proyek.
