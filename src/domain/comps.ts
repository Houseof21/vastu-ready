import type { Comp } from "./property";

/**
 * Comparable-sales eligibility and statistics.
 *
 * TRUST PRINCIPLE: a fair-value estimate is only ever derived from the SAME
 * eligible comps shown in the table, with an explained methodology — never an
 * unexplained number, and never presented as an appraisal or established market
 * value. Invalid rows (nonpositive price/sqft, negative distance, bad address,
 * or a sale dated after the analysis date) are excluded before any stat or row
 * is displayed, so bad data can never reach the UI.
 */

/** A comp is eligible only if every field is valid and the sale is in the past. */
export function isEligibleComp(c: Comp | null | undefined, asOfMs: number): boolean {
  if (!c) return false;
  if (!(c.soldPrice > 0)) return false;
  if (!(c.sqft > 0)) return false;
  if (!(c.distanceMiles >= 0)) return false;
  if (typeof c.address !== "string" || c.address.trim() === "") return false;
  // A street address must start with a positive house number.
  const m = c.address.trim().match(/^(-?\d+)\b/);
  if (!m || Number(m[1]) <= 0) return false;
  const t = Date.parse(c.soldDate);
  if (Number.isNaN(t) || t > asOfMs) return false;
  return true;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

export type CompStats = {
  /** Only the comps that passed eligibility — these are what the table shows. */
  eligible: Comp[];
  count: number;
  /** Median of the eligible comps' sold prices (the prices actually displayed). */
  medianSoldPrice: number;
  /** Median of the eligible comps' per-home $/sq ft. */
  medianPsf: number;
  /** Fair-value estimate = medianPsf × subject sq ft (an estimate, not an appraisal). */
  impliedValue: number | null;
};

/**
 * Statistics computed strictly from the eligible comps. Returns null when no
 * comp is eligible — callers then show "Value assessment unavailable" rather
 * than inventing a number.
 */
export function compStats(
  comps: Comp[] | undefined,
  subjectSqft: number,
  asOfMs: number,
): CompStats | null {
  const eligible = (comps ?? []).filter((c) => isEligibleComp(c, asOfMs));
  if (eligible.length === 0) return null;
  const medianSoldPrice = Math.round(median(eligible.map((c) => c.soldPrice)));
  const medianPsf = median(eligible.map((c) => c.soldPrice / c.sqft));
  const impliedValue =
    subjectSqft > 0 ? Math.round((medianPsf * subjectSqft) / 1000) * 1000 : null;
  return { eligible, count: eligible.length, medianSoldPrice, medianPsf, impliedValue };
}
