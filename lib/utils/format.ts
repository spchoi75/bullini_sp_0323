/**
 * 숫자 포맷 유틸리티
 */

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatBeta(value: number | null | undefined): string {
  if (value == null) return "β=?";
  return `β=${value.toFixed(2)}`;
}

export function formatCorrelation(value: number | null | undefined): string {
  if (value == null) return "r=?";
  return `r=${value.toFixed(2)}`;
}

export function formatPValue(value: number | null | undefined): string {
  if (value == null) return "p=?";
  if (value < 0.001) return `p=${value.toExponential(1)}`;
  return `p=${value.toFixed(3)}`;
}

export function formatDelta(value: number | null | undefined): string {
  if (value == null) return "Δ=?";
  const sign = value > 0 ? "+" : "";
  return `Δ=${sign}${value}%`;
}

export function formatProbability(value: number | null | undefined): string {
  if (value == null) return "P=?";
  return `P=${(value * 100).toFixed(0)}%`;
}

export function formatTheta(value: number | null | undefined): string {
  if (value == null) return "θ=?";
  return `θ=${value}`;
}

export function formatTimeLag(years: number): string {
  if (years === 0) return "즉시";
  if (years < 1) return `${Math.round(years * 12)}개월`;
  return `${years}년`;
}

export function confidenceColor(conf: string): string {
  switch (conf) {
    case "high":
      return "var(--green)";
    case "medium":
      return "var(--yellow)";
    case "low":
      return "var(--red)";
    default:
      return "var(--dim)";
  }
}
