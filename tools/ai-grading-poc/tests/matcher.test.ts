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
