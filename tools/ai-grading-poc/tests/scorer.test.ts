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
