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
