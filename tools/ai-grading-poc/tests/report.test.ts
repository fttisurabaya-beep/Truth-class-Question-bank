import { describe, it, expect } from "vitest";
import { formatSoalReport } from "../src/report";
import type { SoalScoreResult } from "../src/types";

function makeResult(butirResults: SoalScoreResult["butirResults"]): SoalScoreResult {
  return {
    nomorSoal: 1,
    butirResults,
    ayatPoinDidapat: 0,
    ayatMaxPoin: 0,
    totalPoin: butirResults.reduce((a, r) => a + r.poin, 0),
    totalMaxPoin: butirResults.reduce((a, r) => a + r.maxPoin, 0),
  };
}

describe("formatSoalReport marker selection", () => {
  it("shows ✗ for a zero-point subset match, not ~ (regression test)", () => {
    const result = makeResult([
      { label: "near-miss phrase", status: "subset", poin: 0, maxPoin: 1 },
    ]);
    const report = formatSoalReport("Test Trainee", result);
    expect(report).toContain("✗");
    expect(report).not.toContain("~");
  });

  it("shows ✗ for a zero-point llm-judged match, not ~", () => {
    const result = makeResult([
      { label: "ambiguous answer", status: "llm", poin: 0, maxPoin: 1 },
    ]);
    const report = formatSoalReport("Test Trainee", result);
    expect(report).toContain("✗");
  });

  it("still shows ~ for a genuine partial-credit match", () => {
    const result = makeResult([
      { label: "half credit", status: "subset", poin: 0.5, maxPoin: 1 },
    ]);
    const report = formatSoalReport("Test Trainee", result);
    expect(report).toContain("~");
  });

  it("still shows ✓ for a full-credit match", () => {
    const result = makeResult([{ label: "full credit", status: "exact", poin: 1, maxPoin: 1 }]);
    const report = formatSoalReport("Test Trainee", result);
    expect(report).toContain("✓");
  });
});
