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
  it("recognizes the partial book form 'Efes' as equivalent to 'Ef'", () => {
    const found = containsAyat("lihat Efes 1:10 untuk rencana ekonomi", ["Ef 1:10"]);
    expect(found).toBe("Ef 1:10");
  });
  it("recognizes 'Lukas' as equivalent to 'Luk'", () => {
    // Note: the trainee answer includes the "a" sub-verse letter here (unlike the raw
    // fixture text "Lukas 4:1") because containsAyat requires the trainee's normalized
    // answer to contain the full normalized opsi string, letter suffix included — that
    // substring-direction behavior is a separate, pre-existing limitation unrelated to
    // book-abbreviation coverage and is out of scope for this fix.
    const found = containsAyat("seperti dalam Lukas 4:1a", ["Luk 4:1a"]);
    expect(found).toBe("Luk 4:1a");
  });
});
