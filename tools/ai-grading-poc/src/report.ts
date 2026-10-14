import type { SoalScoreResult } from "./types";

export function pickMarker(poin: number, maxPoin: number): "✗" | "~" | "✓" {
  if (poin === 0) return "✗";
  if (poin < maxPoin) return "~";
  return "✓";
}

export function formatSoalReport(trainee: string, result: SoalScoreResult): string {
  const lines: string[] = [`\n=== ${trainee} — Soal ${result.nomorSoal} ===`];
  for (const r of result.butirResults) {
    const marker = pickMarker(r.poin, r.maxPoin);
    const evidence = r.evidence ? ` (${r.evidence})` : "";
    lines.push(`  ${marker} [${r.status.padEnd(8)}] ${r.label} — ${r.poin}/${r.maxPoin}${evidence}`);
  }
  if (result.ayatMaxPoin > 0) {
    lines.push(`  ayat_pool: ${result.ayatPoinDidapat}/${result.ayatMaxPoin}`);
  }
  lines.push(`  TOTAL: ${result.totalPoin}/${result.totalMaxPoin}`);
  return lines.join("\n");
}
