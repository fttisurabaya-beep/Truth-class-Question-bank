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
  [/\befes\b/g, "ef"],
  [/\bkejadian\b/g, "kej"],
  [/\blukas\b/g, "luk"],
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
