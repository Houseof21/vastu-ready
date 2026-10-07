import type { PropertyVastu, VastuAttribute } from "./types";

/**
 * Data coverage = how much Vastu-relevant information we actually have for a home,
 * SEPARATE from how well it aligns with Vastu. Low coverage means the aggregate
 * scores rest on little evidence and should be marked provisional, not firm.
 */

const KEYS: (keyof PropertyVastu)[] = [
  "facingDirection",
  "entranceDirection",
  "lotShape",
  "roadPosition",
  "openSpaceNE",
  "kitchenZone",
  "primaryBedroomZone",
  "bathroomZones",
  "staircaseZone",
  "brahmasthan",
  "garageZone",
  "waterFeatures",
];

export type DataCoverage = {
  known: number;
  total: number;
  ratio: number;
  confidenceAvg: number;
  /** Enough known, confident attributes to present the aggregate scores as firm. */
  sufficient: boolean;
};

export function dataCoverage(v: PropertyVastu): DataCoverage {
  const total = KEYS.length;
  let known = 0;
  let confSum = 0;
  for (const k of KEYS) {
    const a = v[k] as VastuAttribute<unknown>;
    if (a.value != null) {
      known++;
      confSum += a.confidence;
    }
  }
  const ratio = known / total;
  const confidenceAvg = known ? confSum / known : 0;
  const sufficient = ratio >= 0.5 && confidenceAvg >= 0.5;
  return { known, total, ratio, confidenceAvg, sufficient };
}
