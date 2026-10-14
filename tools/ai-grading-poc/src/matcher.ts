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
