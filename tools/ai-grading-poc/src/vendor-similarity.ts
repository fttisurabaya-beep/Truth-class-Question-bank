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
