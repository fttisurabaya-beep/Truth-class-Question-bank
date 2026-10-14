import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreSoal } from "../src/scorer";
import { formatSoalReport } from "../src/report";
import { textSimilarity } from "../src/vendor-similarity";
import type { RubricSoal, LlmEscalateFn } from "../src/types";

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
    if (!rubric) {
      console.warn(`No rubric for soal ${nomorSoal} (trainee ${trainee.nama}) — skipping`);
      continue;
    }
    const result = await scoreSoal(rubric, jawabanTeks as string, textSimilarity, flagForReview);
    console.log(formatSoalReport(trainee.nama, result));
  }
}
