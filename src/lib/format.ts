/** Formatting helpers (US defaults for the Raleigh MVP). */

export function formatUsd(amount: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && amount >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: amount >= 1_000_000 ? 2 : 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSqft(sqft: number): string {
  return `${new Intl.NumberFormat("en-US").format(sqft)} sq ft`;
}

export function formatAcres(acres: number): string {
  return `${acres.toFixed(acres < 1 ? 2 : 1)} ac`;
}

export function formatBaths(baths: number): string {
  return Number.isInteger(baths) ? `${baths}` : baths.toFixed(1);
}

export function formatDriveTime(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  return `${Math.round(minutes)} min`;
}
