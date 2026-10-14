# AI Grading Engine PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone CLI PoC (outside `bfi-v3-ftti`) that scores real Truth Test (1)
trainee answers against the official rubric using a hybrid exact→subset→embedding→LLM-escalation
matcher, proving the algorithm from `docs/superpowers/specs/2026-10-14-ai-grading-engine-design.md`
against real data before any FTTI Hub integration is attempted.

**Architecture:** A small TypeScript package with pure, independently-testable modules
(`normalize` → `matcher` → `scorer` → `report`), a vendored copy of FTTI Hub's existing
`textSimilarity()` embedding function (reused logic, not reimplemented), rubric + trainee-answer
fixtures as JSON data files, and a CLI entry script that runs every trainee against the rubric and
prints a per-butir report.

**Tech Stack:** Node + TypeScript, `tsx` (run TS directly, no build step — matches `bfi-v3-ftti`'s
own tooling), `vitest` (matches `bfi-v3-ftti`'s test runner), `@huggingface/transformers` (same
embedding model Samuel's code uses).

---

## File Structure

```
tools/ai-grading-poc/
  package.json
  tsconfig.json
  src/
    types.ts              — rubric & result type definitions
    normalize.ts           — text/verse-reference normalization helpers
    vendor-similarity.ts   — vendored copy of bfi-v3-ftti's textSimilarity() (local embedding)
    matcher.ts              — per-butir hybrid matching algorithm
    scorer.ts                — aggregates butir results into a soal score
    report.ts                — human-readable report formatting
  data/
    rubrics/truth-test-1.json           — rubric for all 8 questions
    trainees/*.json                      — one file per trainee (10 files)
  scripts/
    run-poc.ts                — CLI entry point
  tests/
    normalize.test.ts
    matcher.test.ts
    scorer.test.ts
```

This PoC lives entirely inside the `TRUTH QUESTION BANK` repo (not `bfi-v3-ftti`), per the user's
explicit instruction to keep it separate until Samuel reviews the approach.

---

### Task 1: Project scaffold

**Files:**
- Create: `tools/ai-grading-poc/package.json`
- Create: `tools/ai-grading-poc/tsconfig.json`

- [ ] **Step 1: Create the directory and package.json**

```json
{
  "name": "ai-grading-poc",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "poc": "tsx scripts/run-poc.ts"
  },
  "dependencies": {
    "@huggingface/transformers": "^4.2.0"
  },
  "devDependencies": {
    "tsx": "^4.23.0",
    "typescript": "^5",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npm install`
Expected: completes without error, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/package.json tools/ai-grading-poc/tsconfig.json tools/ai-grading-poc/package-lock.json
git commit -m "Scaffold standalone AI grading PoC package"
```

---

### Task 2: Rubric & result types

**Files:**
- Create: `tools/ai-grading-poc/src/types.ts`

- [ ] **Step 1: Write types.ts**

```typescript
export type SubsetDiterima = { teks: string; poin: number };

export type AyatSubitem = {
  poin: number;
  opsiSah: string[];
  biner: true;
};

export type Butir = {
  label: string;
  poinKonsep: number;
  subsetDiterima: SubsetDiterima[];
  // Only set when this soal is NOT a pilih_n_dari soal — verse credit tied
  // to this specific butir. For pilih_n_dari soal, verse credit instead
  // comes from the soal-level `ayatPool` (see RubricSoal).
  ayat?: AyatSubitem;
};

export type AyatPool = {
  poinPerAyat: number;
  minAyat: number;
  opsiSah: string[];
};

export type PilihNDari = { n: number; totalOpsiSah: number };

export type RubricSoal = {
  rubricVersion: 1;
  lang: "id" | "en";
  nomorSoal: number;
  pilihNDari: PilihNDari | null;
  butir: Butir[];
  ayatPool: AyatPool | null;
};

export type ButirMatchStatus = "exact" | "subset" | "semantic" | "llm" | "no_match";

export type ButirResult = {
  label: string;
  status: ButirMatchStatus;
  poin: number;
  maxPoin: number;
  evidence?: string;
};

export type SoalScoreResult = {
  nomorSoal: number;
  butirResults: ButirResult[];
  ayatPoinDidapat: number;
  ayatMaxPoin: number;
  totalPoin: number;
  totalMaxPoin: number;
};

export type SimilarityFn = (a: string, b: string) => Promise<number>;

export type LlmEscalateFn = (
  butirLabel: string,
  subsetDiterima: SubsetDiterima[],
  jawabanTrainee: string,
) => Promise<{ poin: number; evidence: string }>;
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/src/types.ts
git commit -m "Add rubric and scoring result types for grading PoC"
```

---

### Task 3: Text normalization (TDD)

**Files:**
- Create: `tools/ai-grading-poc/src/normalize.ts`
- Test: `tools/ai-grading-poc/tests/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { normalizeText, normalizeAyatRef, containsAyat } from "../src/normalize";

describe("normalizeText", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeText("Kehendak, Perkenan!")).toBe("kehendak perkenan");
  });
  it("collapses whitespace", () => {
    expect(normalizeText("Rapat   Tujuan")).toBe("rapat tujuan");
  });
});

describe("normalizeAyatRef", () => {
  it("abbreviates book names consistently", () => {
    expect(normalizeAyatRef("1 Korintus 8:4b")).toBe(normalizeAyatRef("1 Kor 8:4b"));
  });
});

describe("containsAyat", () => {
  it("finds a cited verse among accepted options", () => {
    const found = containsAyat("Jawabannya ada di 1 Korintus 8:4b dan seterusnya", [
      "1 Kor 8:4b",
      "Ulangan 6:4",
    ]);
    expect(found).toBe("1 Kor 8:4b");
  });
  it("returns null when no accepted verse is cited", () => {
    const found = containsAyat("Jawaban tanpa ayat sama sekali", ["1 Kor 8:4b"]);
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run tests/normalize.test.ts`
Expected: FAIL — `src/normalize.ts` does not exist yet.

- [ ] **Step 3: Write normalize.ts**

```typescript
const DIACRITICS_RE = /[̀-ͯ]/g;
const PUNCT_RE = /[.,!?;:()"'“”‘’]/g;

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(PUNCT_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BOOK_ABBREV: [RegExp, string][] = [
  [/\bkorintus\b/g, "kor"],
  [/\befesus\b/g, "ef"],
  [/\bkejadian\b/g, "kej"],
  [/\byohanes\b/g, "yoh"],
  [/\broma\b/g, "rm"],
  [/\bwahyu\b/g, "why"],
  [/\bibrani\b/g, "ibr"],
  [/\bgalatia\b/g, "gal"],
  [/\byesaya\b/g, "yes"],
  [/\bmatius\b/g, "mat"],
  [/\bulangan\b/g, "ul"],
  [/\bkisah para rasul\b/g, "kis"],
  [/\bkisah\b/g, "kis"],
  [/\bfilipi\b/g, "flp"],
  [/\bmazmur\b/g, "mzm"],
  [/\bpetrus\b/g, "ptr"],
];

/** Normalize a verse reference for substring comparison — strips spaces/punctuation
 * and maps common full book names to the abbreviations trainees actually write. */
export function normalizeAyatRef(ref: string): string {
  let t = normalizeText(ref);
  for (const [re, abbrev] of BOOK_ABBREV) t = t.replace(re, abbrev);
  return t.replace(/\s+/g, "");
}

/** Returns the first accepted verse option found (as substring, after normalization)
 * anywhere in the trainee's answer text, or null if none is cited. */
export function containsAyat(jawabanTrainee: string, opsiSah: string[]): string | null {
  const normalizedJawaban = normalizeAyatRef(jawabanTrainee);
  for (const opsi of opsiSah) {
    if (normalizedJawaban.includes(normalizeAyatRef(opsi))) return opsi;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run tests/normalize.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/src/normalize.ts tools/ai-grading-poc/tests/normalize.test.ts
git commit -m "Add text/verse normalization for grading PoC"
```

---

### Task 4: Hybrid per-butir matcher (TDD)

**Files:**
- Create: `tools/ai-grading-poc/src/matcher.ts`
- Test: `tools/ai-grading-poc/tests/matcher.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { matchButir, matchAyat } from "../src/matcher";
import type { Butir, SimilarityFn, LlmEscalateFn } from "../src/types";

const fakeLlmNeverCalled: LlmEscalateFn = async () => ({
  poin: 0,
  evidence: "should not be called",
});

describe("matchButir", () => {
  it("awards full points on exact match, without calling similarity/LLM", async () => {
    const butir: Butir = { label: "Allah Tritunggal", poinKonsep: 1, subsetDiterima: [] };
    const simSpy = vi.fn(async () => 1);
    const result = await matchButir(butir, "Jawabannya adalah Allah Tritunggal", simSpy, fakeLlmNeverCalled);
    expect(result.status).toBe("exact");
    expect(result.poin).toBe(1);
    expect(simSpy).not.toHaveBeenCalled();
  });

  it("awards partial points on subset match", async () => {
    const butir: Butir = {
      label: "Allah Tritunggal",
      poinKonsep: 1,
      subsetDiterima: [{ teks: "Allah", poin: 0.5 }],
    };
    const result = await matchButir(
      butir,
      "Jawabannya adalah Allah saja",
      async () => 0,
      fakeLlmNeverCalled,
    );
    expect(result.status).toBe("subset");
    expect(result.poin).toBe(0.5);
  });

  it("awards full points on high semantic similarity (paraphrase)", async () => {
    const butir: Butir = { label: "Administrasi Perjanjian Baru", poinKonsep: 0.5, subsetDiterima: [] };
    const result = await matchButir(
      butir,
      "Realisasi Perjanjian Baru",
      async () => 0.9,
      fakeLlmNeverCalled,
    );
    expect(result.status).toBe("semantic");
    expect(result.poin).toBe(0.5);
  });

  it("escalates to LLM for mid-range semantic similarity", async () => {
    const butir: Butir = { label: "unmatched-label", poinKonsep: 1, subsetDiterima: [] };
    const llmSpy = vi.fn(async () => ({ poin: 0.5, evidence: "llm judged partial" }));
    const result = await matchButir(butir, "jawaban lain sama sekali", async () => 0.6, llmSpy);
    expect(result.status).toBe("llm");
    expect(result.poin).toBe(0.5);
    expect(llmSpy).toHaveBeenCalledOnce();
  });

  it("awards zero points on clear mismatch, without calling LLM", async () => {
    const butir: Butir = { label: "unmatched-label", poinKonsep: 1, subsetDiterima: [] };
    const result = await matchButir(
      butir,
      "jawaban tidak nyambung",
      async () => 0.1,
      fakeLlmNeverCalled,
    );
    expect(result.status).toBe("no_match");
    expect(result.poin).toBe(0);
  });
});

describe("matchAyat", () => {
  it("awards points when an accepted verse is cited", () => {
    const result = matchAyat("lihat 2 Kor 13:13", ["2 Kor 13:13"], 1);
    expect(result.poin).toBe(1);
  });
  it("awards zero when no accepted verse is cited", () => {
    const result = matchAyat("tanpa ayat", ["2 Kor 13:13"], 1);
    expect(result.poin).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run tests/matcher.test.ts`
Expected: FAIL — `src/matcher.ts` does not exist yet.

- [ ] **Step 3: Write matcher.ts**

```typescript
import { normalizeText, containsAyat } from "./normalize";
import type { Butir, ButirResult, SimilarityFn, LlmEscalateFn } from "./types";

// Calibrated against Samuel's existing similarity.ts normalization range
// (floor ~0.3, ceiling ~0.95 after its own rescale) — see spec §4.
const SEMANTIC_HIGH = 0.85;
const SEMANTIC_LOW = 0.5;

export async function matchButir(
  butir: Butir,
  jawabanTrainee: string,
  similarityFn: SimilarityFn,
  llmEscalate: LlmEscalateFn,
): Promise<ButirResult> {
  const maxPoin = butir.poinKonsep;
  const normalizedLabel = normalizeText(butir.label);
  const normalizedJawaban = normalizeText(jawabanTrainee);

  if (normalizedJawaban.includes(normalizedLabel)) {
    return { label: butir.label, status: "exact", poin: maxPoin, maxPoin, evidence: butir.label };
  }

  for (const subset of butir.subsetDiterima) {
    if (normalizedJawaban.includes(normalizeText(subset.teks))) {
      return { label: butir.label, status: "subset", poin: subset.poin, maxPoin, evidence: subset.teks };
    }
  }

  const sim = await similarityFn(butir.label, jawabanTrainee);
  if (sim >= SEMANTIC_HIGH) {
    return {
      label: butir.label,
      status: "semantic",
      poin: maxPoin,
      maxPoin,
      evidence: `similarity=${sim.toFixed(2)}`,
    };
  }
  if (sim >= SEMANTIC_LOW) {
    const { poin, evidence } = await llmEscalate(butir.label, butir.subsetDiterima, jawabanTrainee);
    return { label: butir.label, status: "llm", poin, maxPoin, evidence };
  }

  return { label: butir.label, status: "no_match", poin: 0, maxPoin, evidence: `similarity=${sim.toFixed(2)}` };
}

/** Verse citations are never paraphrased in a way that changes correctness, so this
 * is a literal (normalized) substring check — no embedding, no LLM. */
export function matchAyat(
  jawabanTrainee: string,
  opsiSah: string[],
  poin: number,
): { poin: number; evidence: string | null } {
  const matched = containsAyat(jawabanTrainee, opsiSah);
  return matched ? { poin, evidence: matched } : { poin: 0, evidence: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run tests/matcher.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/src/matcher.ts tools/ai-grading-poc/tests/matcher.test.ts
git commit -m "Add hybrid exact/subset/semantic/LLM-escalation matcher"
```

---

### Task 5: Soal-level scorer (TDD)

**Files:**
- Create: `tools/ai-grading-poc/src/scorer.ts`
- Test: `tools/ai-grading-poc/tests/scorer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { scoreSoal } from "../src/scorer";
import type { RubricSoal, SimilarityFn, LlmEscalateFn } from "../src/types";

const lowSimilarity: SimilarityFn = async () => 0.1;
const neverCalledLlm: LlmEscalateFn = async () => ({ poin: 0, evidence: "not used" });

describe("scoreSoal", () => {
  it("sums butir and per-butir ayat points for a fixed-butir soal", async () => {
    const rubric: RubricSoal = {
      rubricVersion: 1,
      lang: "id",
      nomorSoal: 4,
      pilihNDari: null,
      ayatPool: null,
      butir: [
        {
          label: "Penyaluran",
          poinKonsep: 1.5,
          subsetDiterima: [],
          ayat: { poin: 1, opsiSah: ["2 Kor 13:13"], biner: true },
        },
      ],
    };
    const jawaban = "Karena Allah Tritunggal adalah Penyaluran — 2 Kor 13:13";
    const result = await scoreSoal(rubric, jawaban, lowSimilarity, neverCalledLlm);
    expect(result.totalPoin).toBe(2.5);
    expect(result.totalMaxPoin).toBe(2.5);
  });

  it("keeps only the top-N butir for a pilih_n_dari soal, plus the shared ayat pool", async () => {
    const rubric: RubricSoal = {
      rubricVersion: 1,
      lang: "id",
      nomorSoal: 7,
      pilihNDari: { n: 2, totalOpsiSah: 3 },
      ayatPool: { poinPerAyat: 1, minAyat: 1, opsiSah: ["1 Kor 1:30"] },
      butir: [
        { label: "sebagai kekuatan", poinKonsep: 1, subsetDiterima: [] },
        { label: "sebagai hikmat", poinKonsep: 1, subsetDiterima: [] },
        { label: "aspek yang tidak disebut trainee", poinKonsep: 1, subsetDiterima: [] },
      ],
    };
    const jawaban = "Kristus sebagai kekuatan dan sebagai hikmat — 1 Kor 1:30";
    const result = await scoreSoal(rubric, jawaban, lowSimilarity, neverCalledLlm);
    expect(result.butirResults).toHaveLength(2);
    expect(result.totalPoin).toBe(3); // 2 matched butir x 1 + 1 ayat
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run tests/scorer.test.ts`
Expected: FAIL — `src/scorer.ts` does not exist yet.

- [ ] **Step 3: Write scorer.ts**

```typescript
import type { RubricSoal, ButirResult, SoalScoreResult, SimilarityFn, LlmEscalateFn } from "./types";
import { matchButir, matchAyat } from "./matcher";

/**
 * Scores one soal against one trainee's full answer text.
 *
 * Convention (see types.ts Butir.ayat comment): when `rubric.pilihNDari` is
 * set, individual `butir` entries must NOT carry a per-butir `ayat` — verse
 * credit for pilih_n_dari soal comes from `rubric.ayatPool` instead.
 */
export async function scoreSoal(
  rubric: RubricSoal,
  jawabanTrainee: string,
  similarityFn: SimilarityFn,
  llmEscalate: LlmEscalateFn,
): Promise<SoalScoreResult> {
  const results: ButirResult[] = [];
  for (const butir of rubric.butir) {
    results.push(await matchButir(butir, jawabanTrainee, similarityFn, llmEscalate));
    if (butir.ayat) {
      const ayatResult = matchAyat(jawabanTrainee, butir.ayat.opsiSah, butir.ayat.poin);
      results.push({
        label: `${butir.label} — ayat`,
        status: ayatResult.evidence ? "exact" : "no_match",
        poin: ayatResult.poin,
        maxPoin: butir.ayat.poin,
        evidence: ayatResult.evidence ?? undefined,
      });
    }
  }

  const butirResults = rubric.pilihNDari
    ? [...results].sort((a, b) => b.poin - a.poin).slice(0, rubric.pilihNDari.n)
    : results;

  let ayatPoinDidapat = 0;
  let ayatMaxPoin = 0;
  if (rubric.ayatPool) {
    let found = 0;
    for (const opsi of rubric.ayatPool.opsiSah) {
      if (matchAyat(jawabanTrainee, [opsi], rubric.ayatPool.poinPerAyat).evidence) found++;
    }
    const credited = Math.min(found, rubric.ayatPool.minAyat);
    ayatPoinDidapat = credited * rubric.ayatPool.poinPerAyat;
    ayatMaxPoin = rubric.ayatPool.minAyat * rubric.ayatPool.poinPerAyat;
  }

  const totalPoin = butirResults.reduce((a, r) => a + r.poin, 0) + ayatPoinDidapat;
  const totalMaxPoin = butirResults.reduce((a, r) => a + r.maxPoin, 0) + ayatMaxPoin;

  return { nomorSoal: rubric.nomorSoal, butirResults, ayatPoinDidapat, ayatMaxPoin, totalPoin, totalMaxPoin };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run tests/scorer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/src/scorer.ts tools/ai-grading-poc/tests/scorer.test.ts
git commit -m "Add soal-level scorer with pilih_n_dari and ayat-pool support"
```

---

### Task 6: Report formatting

**Files:**
- Create: `tools/ai-grading-poc/src/report.ts`

- [ ] **Step 1: Write report.ts (no test — pure formatting, verified visually in Task 9)**

```typescript
import type { SoalScoreResult } from "./types";

export function formatSoalReport(trainee: string, result: SoalScoreResult): string {
  const lines: string[] = [`\n=== ${trainee} — Soal ${result.nomorSoal} ===`];
  for (const r of result.butirResults) {
    const marker = r.status === "no_match" ? "✗" : r.poin < r.maxPoin ? "~" : "✓";
    const evidence = r.evidence ? ` (${r.evidence})` : "";
    lines.push(`  ${marker} [${r.status.padEnd(8)}] ${r.label} — ${r.poin}/${r.maxPoin}${evidence}`);
  }
  if (result.ayatMaxPoin > 0) {
    lines.push(`  ayat_pool: ${result.ayatPoinDidapat}/${result.ayatMaxPoin}`);
  }
  lines.push(`  TOTAL: ${result.totalPoin}/${result.totalMaxPoin}`);
  return lines.join("\n");
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/src/report.ts
git commit -m "Add per-butir report formatting for grading PoC"
```

---

### Task 7: Vendor Samuel's embedding similarity function

**Files:**
- Create: `tools/ai-grading-poc/src/vendor-similarity.ts`
- Reference (read-only, do not modify): the clone at
  `/private/tmp/claude-501/-Users-apple-Documents-SERVICES-TRUTH-QUESTION-BANK/181620a8-e358-4578-8490-3add4ff4384f/scratchpad/bfi-v3-ftti/src/lib/similarity.ts`

This file is copied (not reimplemented) from `bfi-v3-ftti` because that clone lives in an ephemeral
scratchpad directory that will not persist across sessions — vendoring keeps the PoC runnable on its
own. Only the `textSimilarity` function is needed (the PoC's own `matcher.ts` already implements the
evidence/sentence-splitting logic at the rubric-butir level, so Samuel's sentence-splitting wrapper
is not needed here — only his core embedding primitive).

- [ ] **Step 1: Write vendor-similarity.ts**

```typescript
import { pipeline, cos_sim } from "@huggingface/transformers";

// Vendored from bfi-v3-ftti/src/lib/similarity.ts (Samuel, FTTI Hub) — same model,
// same local/ONNX/no-API-key approach, so PoC results are representative of what
// would actually run in production. See docs/superpowers/specs/2026-10-14-ai-grading-engine-design.md.
const MODEL_ID = "Xenova/paraphrase-multilingual-mpnet-base-v2";

type Extractor = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID, { dtype: "q8" }) as Promise<Extractor>;
  }
  return extractorPromise;
}

async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

const SIM_FLOOR = 0.3;
const SIM_CEIL = 0.95;

function normalizeSim(sim: number): number {
  return Math.max(0, Math.min(1, (sim - SIM_FLOOR) / (SIM_CEIL - SIM_FLOOR)));
}

/** Rescaled 0..1 semantic similarity between two short texts (butir label vs trainee answer). */
export async function textSimilarity(a: string, b: string): Promise<number> {
  const [va, vb] = await Promise.all([embed(a), embed(b)]);
  return normalizeSim(cos_sim(va, vb));
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/src/vendor-similarity.ts
git commit -m "Vendor FTTI Hub's local embedding similarity function for the PoC"
```

---

### Task 8: Rubric data for all 8 Truth Test (1) questions

**Files:**
- Create: `tools/ai-grading-poc/data/rubrics/truth-test-1.json`

This rubric is transcribed from the real official answer key (`Truth (1) Answer Key.pdf`) discussed
earlier in this design process. Point totals are a close approximation of the original (e.g. Soal 1
totals 8.5 here vs the original PDF's 9.5 — the exact 19-sub-item breakdown behind "0.5 x 19 = 9.5"
isn't fully recoverable from the PDF alone) — acceptable for algorithm validation, not meant as the
authoritative point scheme.

- [ ] **Step 1: Write the rubric JSON**

```json
[
  {
    "rubricVersion": 1,
    "lang": "id",
    "nomorSoal": 1,
    "pilihNDari": null,
    "ayatPool": null,
    "butir": [
      { "label": "Kehendak Perkenan", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Ef 1:5"], "biner": true } },
      { "label": "Rapat Tujuan", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Ef 1:11"], "biner": true } },
      { "label": "Rencana Ekonomi", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Ef 1:10"], "biner": true } },
      { "label": "Pemilihan", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Ef 1:4"], "biner": true } },
      { "label": "Penakdiran", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Ef 1:5"], "biner": true } },
      { "label": "Keputraan", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Ef 1:5", "Rm 8:15", "Gal 4:5"], "biner": true } },
      { "label": "Penyaluran", "poinKonsep": 0.5, "subsetDiterima": [] },
      { "label": "Administrasi Perjanjian Baru", "poinKonsep": 0.5, "subsetDiterima": [] },
      { "label": "Administrasi Perjanjian Lama", "poinKonsep": 0.5, "subsetDiterima": [] },
      { "label": "Penciptaan", "poinKonsep": 0.5, "subsetDiterima": [], "ayat": { "poin": 0.5, "opsiSah": ["Kej 1:26"], "biner": true } }
    ]
  },
  {
    "rubricVersion": 1,
    "lang": "id",
    "nomorSoal": 3,
    "pilihNDari": null,
    "ayatPool": null,
    "butir": [
      { "label": "Hanya ada satu Allah", "poinKonsep": 1, "subsetDiterima": [], "ayat": { "poin": 1, "opsiSah": ["1 Kor 8:4b", "Ul 6:4", "Yes 45:5a"], "biner": true } },
      { "label": "Allah memiliki tiga aspek", "poinKonsep": 1, "subsetDiterima": [{ "teks": "Allah ada tiga pribadi", "poin": 0.5 }], "ayat": { "poin": 1, "opsiSah": ["Yes 6:8", "Kej 1:26a", "Mat 28:9"], "biner": true } },
      { "label": "Bapa Putra dan Roh ada dengan sendirinya dari kekekalan sampai kekekalan", "poinKonsep": 1, "subsetDiterima": [{ "teks": "Bapa Putra dan Roh kekal", "poin": 0.5 }], "ayat": { "poin": 1, "opsiSah": ["1 Ptr 1:2a", "Ef 1:17a", "Ibr 1:8", "Yoh 1:1", "Rm 9:5b", "Kis 20:28", "Yoh 20:28", "Flp 2:6", "Kis 5:3-4", "Yes 9:5", "Mzm 102:27", "Ibr 1:12", "Ibr 9:14", "Ef 3:14-17", "2 Kor 13:13"], "biner": true } },
      { "label": "Bapa Putra dan Roh saling huni dan tidak dapat dipisahkan", "poinKonsep": 1, "subsetDiterima": [], "ayat": { "poin": 1, "opsiSah": ["Yoh 6:46", "Yoh 5:43a", "Yoh 14:9-10", "Yoh 15:26a", "Yoh 14:26a", "Yoh 8:29a", "Luk 4:1a", "Mat 3:16-17"], "biner": true } },
      { "label": "Ketiganya Bapa Putra dan Roh adalah satu", "poinKonsep": 1, "subsetDiterima": [], "ayat": { "poin": 1, "opsiSah": ["Yes 9:6", "Yoh 14:7-11", "1 Kor 15:45b", "Yoh 14:16-20", "2 Kor 3:17-18"], "biner": true } }
    ]
  },
  {
    "rubricVersion": 1,
    "lang": "id",
    "nomorSoal": 4,
    "pilihNDari": null,
    "ayatPool": null,
    "butir": [
      { "label": "Penyaluran", "poinKonsep": 1.5, "subsetDiterima": [], "ayat": { "poin": 1, "opsiSah": ["2 Kor 13:13"], "biner": true } }
    ]
  },
  {
    "rubricVersion": 1,
    "lang": "id",
    "nomorSoal": 7,
    "pilihNDari": { "n": 5, "totalOpsiSah": 10 },
    "ayatPool": { "poinPerAyat": 1, "minAyat": 2, "opsiSah": ["1 Kor 1:2b", "1 Kor 1:9", "1 Kor 1:24a", "1 Kor 1:24b", "1 Kor 1:30", "1 Kor 5:7-8", "1 Kor 10:3-4", "Yoh 6:57b-58a", "2 Kor 1:21-22", "2 Kor 3:3", "2 Kor 3:18"] },
    "butir": [
      { "label": "sebagai bagian bersama dari Allah", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai kekuatan dari Allah", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai hikmat dari Allah", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai kebenaran dari Allah", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai pengudusan dari Allah", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai penebusan dari Allah", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai Anak Domba Paskah dan roti tidak beragi", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai batu karang rohani dan roti rohani dari surga", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai pengurapan Roh majemuk dan meterai", "poinKonsep": 1, "subsetDiterima": [] },
      { "label": "sebagai tulisan tinta Roh dan salinan Roh", "poinKonsep": 1, "subsetDiterima": [] }
    ]
  }
]
```

(Soal 2, 5, 6, 8 are documented in the design spec's rubric schema but intentionally left out of
this JSON file for the PoC — see the note at the end of Task 9 on scope.)

- [ ] **Step 2: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/data/rubrics/truth-test-1.json
git commit -m "Add Truth Test (1) rubric data (Soal 1, 3, 4, 7) from the official answer key"
```

---

### Task 9: Trainee answer fixtures

**Files:**
- Create: `tools/ai-grading-poc/data/trainees/nathaniel-vincent.json`
- Create: `tools/ai-grading-poc/data/trainees/yosea-kamam.json`
- Create: `tools/ai-grading-poc/data/trainees/karina-hardianti.json`
- Create: `tools/ai-grading-poc/data/trainees/trifena-fenofa.json`
- Create: `tools/ai-grading-poc/data/trainees/khen-oliver-katminto.json`
- Create: `tools/ai-grading-poc/data/trainees/ayub-ferdinan.json`
- Create: `tools/ai-grading-poc/data/trainees/kevin.json`
- Create: `tools/ai-grading-poc/data/trainees/hansel-vallerio.json`
- Create: `tools/ai-grading-poc/data/trainees/linra.json`
- Create: `tools/ai-grading-poc/data/trainees/fingki-irma-delia.json`

Each file is `{ "nama": string, "jawaban": { "<nomorSoal>": "<raw typed-answer text>" } }` — one
multi-line string per soal, exactly mirroring FTTI Hub's actual data model (`Jawaban.teksJawaban`
is a single string per soal, not pre-split per chart cell — see design spec §"Error Handling").
Transcription is best-effort from the photographed handwriting, for algorithm-validation purposes.

- [ ] **Step 1: Nathaniel Vincent Timothy — Soal 1 only, all correct**

```json
{
  "nama": "Nathaniel Vincent Timothy",
  "jawaban": {
    "1": "Kehendak Perkenan (Ef 1:5)\nRapat Tujuan (Ef 1:11)\nRencana Ekonomi (Ef 1:10)\nPemilihan (Ef 1:4)\nPenakdiran (Ef 1:5)\nKeputraan (Ef 1:5)\nPenyaluran\nAdministrasi PB\nAdministrasi PL\nPenciptaan (Kej 1:26)"
  }
}
```

- [ ] **Step 2: Yosea Kamam — Soal 1, known deviations (term substitution + swapped cells)**

```json
{
  "nama": "Yosea Kamam",
  "jawaban": {
    "1": "Keheudak Perkenan (Efes 1:5)\nRapat ilah (Efes 1:11)\nRencana Ekonomi (Efes 1:10)\nPenetapan Allah (Efes 1:4)\nPenciptaan (Kejadian 1:26)\nKeputraan (Efes 1:5)\nAdministrasi Perjanjian Lama\nAdministrasi Baru, Penebusan (Realitas)"
  }
}
```

- [ ] **Step 3: Karina Hardianti — Soal 1, 3, 4, 7, all correct/near-complete**

```json
{
  "nama": "Karina Hardianti",
  "jawaban": {
    "1": "Kehendak Pertenan (Ef 1:5)\nRapat Tujuan (Ef 1:11)\nRencana Ekonomi (Ef 1:10)\nPemilihan (Ef 1:4)\nPenakdiran (Ef 1:5)\nKeputraan (Ef 1:5²) (Rm 8:15)\nPenyaluran\nAdministrasi Perjanjian Baru (realitas)\nAdministrasi Perjanjian Lama (bayang-bayang)\nPenciptaan (Kej 1:26)",
    "3": "1. Hanya ada satu Allah — 1 Kor 8:4b; Yes 45:5a\n2. Allah memiliki 3 aspek — Bapa, Putra, dan Roh — Kej 1:26a\n3. Ketiganya ada dengan sendirinya dari kekekalan sampai kekekalan — Ef 1:17a; Yoh 1:1\n4. Saling huni dan tidak dapat dipisahkan — Yoh 6:46\n5. Ketiganya adalah satu — 1 Kor 15:45b",
    "4": "Allah itu tiga-satu karena 3 aspek Allah — Bapa, Putera, dan Roh — semuanya adalah Allah. Ketiga aspek ini tidak dapat dipisahkan, dan ketiganya serempak ada. 2 Kor 13:13 Anugerah Tuhan Yesus Kristus, kasih Allah, dan persekutuan Roh Kudus menyertai kamu sekalian.",
    "7": "1. sebagai kekuatan (1 Kor 1:24a)\n2. sebagai hikmat (1 Kor 1:24b)\n3. sebagai kebenaran (1 Kor 1:30)\n4. sebagai pengudusan (1 Kor 1:30)\n5. sebagai penebusan (1 Kor 1:30)"
  }
}
```

- [ ] **Step 4: Trifena Fenofa — Soal 1, 3, word-order variant on box 1**

```json
{
  "nama": "Trifena Fenofa",
  "jawaban": {
    "1": "Perkenan Kehendak (Efesus 1:5)\nRapat Tujuan (Efesus 1:11)\nRencana Ekonomi (Efesus 1:10)\nPemilihan (Efesus 1:4)\nPenakdiran (Efesus 1:5)\nKeputraan (Efesus 1:5 cat 2)\nPenyaluran\nAdministrasi PB (Realitas)\nAdministrasi PL (bayang-bayang)\nPenciptaan (Kej 1:26)",
    "3": "1. Hanya ada satu Allah — 1 Korintus 8:4b, Ulangan 6:4\n2. Sama dengan 3 aspek Bapa, Putra, dan Roh — Yesaya 6:8, Kejadian 1:26\n3. Yang ada dengan sendirinya dari keketalan sampai keketalan — Yesaya 9:5, Ibrani 1:12\n4. Saling huni dan tidak dapat dipisahkan — Yohanes 15:26\n5. Ketiganya adalah satu — Yohanes 10:30"
  }
}
```

- [ ] **Step 5: Khen Oliver Katminto — Soal 1, position-shifted/wrong terms (expected low score)**

```json
{
  "nama": "Khen Oliver Katminto",
  "jawaban": {
    "1": "Pemilihan\nPenakdiran\nEkonomi Kekal\nPerencanaan\nPemilihan\nKeputrran\nAdministrasi Perjanjian Baru (Realitas)\nAdministrasi Perjanjian Lama (Bayang-bayang)\nPenciptaan"
  }
}
```

- [ ] **Step 6: Ayub Ferdinan Irianto Nari — Soal 1, synonym case ("Realisasi" vs "Administrasi")**

```json
{
  "nama": "Ayub Ferdinan Irianto Nari",
  "jawaban": {
    "1": "Efesus 1:5 Kehendak Perkenan\nEfesus 1:11 Rapat Tujuan\nEfesus 1:10 Rencana Ekonomi\nEfesus 1:4 Pemilihan\nEfesus 1:5 Penakdiran\nEfesus 1:5² Keputraan\nRealisasi Perjanjian Baru\nAdministrasi Perjanjian Lama\nKejadian 1:26 Penciptaan"
  }
}
```

- [ ] **Step 7: Kevin — Soal 1, 3, 4, all correct and detailed**

```json
{
  "nama": "Kevin",
  "jawaban": {
    "1": "kehendak Perkenan — Ef 1:5 (Rm 8:15, Gal 4:5)\nRapat Tujuan — Ef 1:11\nRencana Ekonomi — Ef 1:10\nPemilihan — Ef 1:4\nPenakdiran — Ef 1:5\nKeputraan — Ef 1:5\nAdministrasi Perjanjian Baru (Realitas)\nAdministrasi Perjanjian Lama (Bayangan)\nPenciptaan — Kej 1:26",
    "3": "1. Allah adalah satu — Yesaya 45:5a, 1 Korintus 8:4b\n2. Allah memiliki 3 Aspek — Bapa, Putra, dan Roh — Yesaya 6:9, Matius 28:19\n3. Allah telah ada sejak kekekalan sampai kekekalan — Yohanes 1:1, 2 Korintus 13:13\n4. Allah Tritunggal saling huni dan tidak terpisahkan — Yohanes 6:46, Lukas 4:1\n5. Ketiganya Bapa Putra dan Roh adalah satu — 1 Korintus 15:45b, 2 Korintus 3:17",
    "4": "Allah itu hanya satu, ini dapat dilihat dalam Yesaya 45:5a. Namun penjelasan secara sederhananya walaupun tidak lengkap adalah tiga ini seperti 3 persona, seperti seorang ayah adalah ayah terhadap anak, suami terhadap istri, dan rekan kerja terhadap rekan dikantor. Allah kita tiga-satu, karena Allah telah ada sejak kekekalan sampai kekekalan. Kita bisa lihat di Yohanes 1:1 bahwa firman itu adalah Allah, dimana Yohanes 1:1 ini waktunya adalah di kekekalan lampau. Lalu di 2 korintus 13:13 kita melihat ketiga aspek Allah Tritunggal ini secara bersamaan menyertai kaum beriman. Jadi Allah ini saling huni, seperti dalam Lukas 4:1."
  }
}
```

- [ ] **Step 8: Hansel Vallerio Handono — Soal 1, 4, 5, correct, left Soal 6-8 blank**

```json
{
  "nama": "Hansel Vallerio Handono",
  "jawaban": {
    "1": "Ef 1:5 Kehendak Perkenan\nEf 1:11 Rapat Tujuan\nEf 1:10 Rencana Ekonomi\nEf 1:4 Pemilihan\nEf 1:5 Penakdiran\nEf 1:5² Keputraan\nPenyaluran\nAdministrasi Perjanjian Baru\nAdministrasi Perjanjian Lama\nKej 1:26 Penciptaan",
    "4": "Dalam 2 Kor 13:13 dikatakan bahwa ada kasih karunia dari Tuhan Yesus Kristus, kasih Allah (Bapa), dan persekutuan Roh itu menyertai kita sekalian. Hal ini membuktikan bahwa Allah Tritunggal itu satu, tetapi memiliki 3 aspek yaitu Bapa, Putera, dan Roh. Allah Tritunggal saling huni dan tidak dapat dipisahkan (Yoh 15:26a), karena ketiga aspek Bapa-Putera-Roh tidak terpisahkan maka tiga aspek ini adalah satu (Yoh 14:9). Inilah alasan-alasan mengapa Allah itu tiga-satu, bahwa Tuhan Yesus adalah kasih karunia dan Bapa yang mengasihi kita dan kita terima melalui persekutuan Roh Kudus dengan roh kita di dalam diri kita (2 Kor 13:13)."
  }
}
```

- [ ] **Step 9: Linra — Soal 1, 3, correct**

```json
{
  "nama": "Linra",
  "jawaban": {
    "1": "Ef 1:5 Kehendak Perkenan\nEf 1:11 Rapat Tujuan\nEf 1:10 Rencana Ekonomi\nEf 1:4 Pemilihan\nEf 1:5 Penakdiran\nEf 1:5 Roma 8:15 Galatia 4:5 Keputraan\nPenyaluran\nAdministrasi PB Realitas\nAdministrasi PL Bayang-Bayang\nKej 1:26 Penciptaan",
    "3": "1. Hanya ada satu Allah — 1 Korintus 8:4b\n2. Allah memiliki aspek Bapa, Putra, dan Roh — Imamat 24:9\n3. Bapa Putra dan Roh tidak dapat dipisahkan — Yesaya 9:5\n4. Ketiganya Putra dan Roh adalah satu — 2 Korintus 13:13"
  }
}
```

- [ ] **Step 10: Fingki Irma Delia — Soal 1, correct**

```json
{
  "nama": "Fingki Irma Delia",
  "jawaban": {
    "1": "Kehendak Perkenan (EF 1:5)\nRapat Tujuan (EF 1:11)\nRencana Ekonomi (EF 1:10)\nPemilihan (EF 1:4)\nPenakdiran (EF 1:5)\nKeputraan (Efesus 1:5²)\nAdministrasi PB (Realitas)\nAdministrasi PL (Bayang-bayang)\nPenciptaan (Kej 1:26)"
  }
}
```

- [ ] **Step 11: Commit all fixtures**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/data/trainees/
git commit -m "Add 10 real trainee answer fixtures transcribed from Truth Test (1) sheets"
```

**Scope note:** Soal 2, 5, 6, 8 are not transcribed for any trainee in this PoC — the design spec's
rubric schema already covers their shape (nested "pilih salah satu" bonus items, big multi-column
tables), but transcribing all 10 trainees across all 8 questions is disproportionate to this PoC's
goal (validating the matching *algorithm*, not building a complete graded dataset). Soal 1 (all 10
trainees), Soal 3/4 (several trainees, validates OR-logic verse matching), and Soal 7 (Karina,
validates `pilihNDari`) already exercise every code path in `matcher.ts`/`scorer.ts`.

---

### Task 10: CLI runner

**Files:**
- Create: `tools/ai-grading-poc/scripts/run-poc.ts`

- [ ] **Step 1: Write run-poc.ts**

```typescript
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreSoal } from "../src/scorer.ts";
import { formatSoalReport } from "../src/report.ts";
import { textSimilarity } from "../src/vendor-similarity.ts";
import type { RubricSoal, LlmEscalateFn } from "../src/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

const rubrics: RubricSoal[] = JSON.parse(
  readFileSync(join(dataDir, "rubrics", "truth-test-1.json"), "utf-8"),
);

// No live LLM wiring in this PoC phase — ambiguous (mid-similarity) butir are
// flagged for manual/LLM review rather than auto-scored, so the PoC's reported
// numbers reflect only the deterministic + embedding layers (see spec §Testing).
const flagForReview: LlmEscalateFn = async (label) => ({
  poin: 0,
  evidence: `NEEDS_LLM_REVIEW (ambiguous match against "${label}")`,
});

const traineeFiles = readdirSync(join(dataDir, "trainees")).filter((f) => f.endsWith(".json"));

for (const file of traineeFiles) {
  const trainee = JSON.parse(readFileSync(join(dataDir, "trainees", file), "utf-8"));
  for (const [nomorSoalStr, jawabanTeks] of Object.entries(trainee.jawaban)) {
    const nomorSoal = Number(nomorSoalStr);
    const rubric = rubrics.find((r) => r.nomorSoal === nomorSoal);
    if (!rubric) continue;
    const result = await scoreSoal(rubric, jawabanTeks as string, textSimilarity, flagForReview);
    console.log(formatSoalReport(trainee.nama, result));
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK"
git add tools/ai-grading-poc/scripts/run-poc.ts
git commit -m "Add CLI runner for the grading PoC"
```

---

### Task 11: Run the PoC against real data and review results

- [ ] **Step 1: Run the full test suite one more time**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npx vitest run`
Expected: all tests across normalize/matcher/scorer PASS.

- [ ] **Step 2: Run the PoC**

Run: `cd "/Users/apple/Documents/SERVICES/TRUTH QUESTION BANK/tools/ai-grading-poc" && npm run poc`

**Note before running:** the first run downloads the `Xenova/paraphrase-multilingual-mpnet-base-v2`
model (~1GB) and needs network access — this is a real resource cost, not something to run silently.
Confirm with the user before this step if that hasn't already been approved, since it's the kind of
one-time but non-trivial download a user may want a heads-up on.

Expected output: one report block per trainee per soal they answered, e.g.:

```
=== Nathaniel Vincent Timothy — Soal 1 ===
  ✓ [exact   ] Kehendak Perkenan — 0.5/0.5 (Kehendak Perkenan)
  ✓ [exact   ] Kehendak Perkenan — ayat — 0.5/0.5 (Ef 1:5)
  ...
  TOTAL: 8.5/8.5
```

- [ ] **Step 3: Review against expected human-grader judgment**

Check the printed totals against what's documented in this conversation:
- Nathaniel Vincent, Karina, Kevin, Hansel Vallerio, Linra, Fingki Irma → expect Soal 1 at or near
  8.5/8.5 (full marks).
- Ayub Ferdinan → expect the "Administrasi Perjanjian Baru" butir to resolve via `status: "semantic"`
  (his "Realisasi Perjanjian Baru" phrasing), not `exact` or `no_match` — this is the paraphrase case
  the embedding layer exists to catch.
- Yosea Kamam → expect a noticeably lower Soal 1 total, but watch specifically for whether
  "Penciptaan" scores as matched even though he wrote it in the wrong chart position — if so, this
  confirms the known **position-blindness limitation** already flagged in the design spec's Error
  Handling section (whole-blob matching can't verify which answer belongs in which chart cell,
  because FTTI Hub stores one free-text answer per soal, not per cell). Record this as a concrete,
  evidenced finding — it's a genuine limitation worth raising with Samuel if chart-type questions
  become common, not a PoC bug to fix here.
- Khen Oliver → expect a low Soal 1 total; his answer has both genuinely wrong terms ("Ekonomi
  Kekal", "Perencanaan") and position-shifted correct terms — review the printed per-butir breakdown
  to separate which is which.
- Trifena Fenofa → her box 1 ("Perkenan Kehendak", words reversed from "Kehendak Perkenan") should
  NOT match on the `exact` substring check (word order differs) — confirm it instead resolves via
  `semantic` (high embedding similarity despite reordering). If it instead falls through to
  `no_match` or an LLM-review flag, that's a useful signal that the `SEMANTIC_HIGH` threshold (0.85)
  may need tuning — note it, don't silently change the constant without flagging it to the user first.

- [ ] **Step 4: Report results back to the user**

Summarize, in Indonesian, per the project's established communication pattern: concrete scores per
trainee, which matcher path each interesting case resolved through, and the position-blindness
finding — before proposing any next step (localhost UI, LLM escalation wiring, or raising this with
Samuel).

---

## Self-Review Notes

- **Spec coverage:** Compatibility strategy (§1) — out of scope for this PoC (no FTTI Hub repo
  touched at all, per the user's explicit instruction). Point precision (§2) — not needed in the PoC
  since `scorer.ts` works in plain JS numbers, not Int-constrained Prisma columns; the 0.5-point
  subset rule is exercised directly (Task 4 tests). Rubric schema (§3) — implemented in Task 2,
  camelCase instead of the spec's snake_case for idiomatic TypeScript (noted here as a deliberate
  naming deviation from the spec's illustrative JSON, not a functional gap). Hybrid matching (§4) —
  Task 4. TA-facing output (§5) — out of scope (no UI this phase, per user). PDF-to-rubric
  extraction (§6) — out of scope this phase (rubric was hand-transcribed from the PDF in this
  conversation, not yet automated) — flagged as a follow-up, not silently dropped.
- **Placeholder scan:** none found — every step has real, complete code.
- **Type consistency:** `RubricSoal`/`Butir`/etc. defined once in Task 2, used identically in
  Tasks 4/5/8/10 — no renamed fields across tasks.
