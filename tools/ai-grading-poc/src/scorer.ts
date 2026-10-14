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
