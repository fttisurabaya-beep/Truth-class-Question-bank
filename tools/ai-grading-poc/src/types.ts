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
