import {
  type CategoryResult,
  type CategorySource,
  type Correctability,
  type FindingStatus,
  type PropertyVastu,
  type Severity,
  type Strictness,
  type VastuAnalysis,
  type VastuAttribute,
  type VastuCategoryKey,
  type VerificationStatus,
  type Zone,
} from "../types";
import {
  clamp,
  DIRECTION_LABEL,
  FACING_FAVORABILITY,
  verificationOf,
  zoneLabel,
} from "../directions";

export const METHODOLOGY_VERSION = "vastu-ready-balanced-1.0";

/** Category weights for the Vastu score (sum to 1.0). */
const WEIGHTS: Record<VastuCategoryKey, number> = {
  entrance_orientation: 0.22,
  lot: 0.18,
  kitchen: 0.12,
  primary_bedroom: 0.12,
  bathrooms: 0.1,
  brahmasthan: 0.1,
  staircase: 0.06,
  garage: 0.05,
  water: 0.05,
};

const LABELS: Record<VastuCategoryKey, string> = {
  entrance_orientation: "Entrance & Orientation",
  lot: "Lot Analysis",
  kitchen: "Kitchen",
  primary_bedroom: "Primary Bedroom",
  bathrooms: "Bathrooms",
  brahmasthan: "Brahmasthan (Center)",
  staircase: "Staircase",
  garage: "Garage",
  water: "Water Features",
};

/** The ideal placement/condition per category (shown as the scoring target). */
const IDEALS: Record<VastuCategoryKey, string> = {
  entrance_orientation: "North-east, North, or East facing",
  lot: "Regular lot, open toward the north-east, no T-junction",
  kitchen: "South-east (agni); North-west acceptable",
  primary_bedroom: "South-west",
  bathrooms: "North-west, West, or South (avoid NE & center)",
  brahmasthan: "Open, unobstructed center",
  staircase: "South-west, South, or West",
  garage: "North-west or South-east",
  water: "North-east or North",
};

/** Base scoring rule per category; weight is appended at build time. */
const RULE_BASE: Record<VastuCategoryKey, string> = {
  entrance_orientation: "Facing and entrance scored on Vastu favorability (60/40 blend); NE/N/E rank highest.",
  lot: "Regular shape and open north-east add; irregular/triangular shapes and T-junctions subtract.",
  kitchen: "Scored by zone: SE ideal (fire element), NW acceptable, NE/center least favorable.",
  primary_bedroom: "Scored by zone: SW ideal; N/NE least favorable.",
  bathrooms: "Driven by the least-favorable bathroom; NE and center are flagged considerations.",
  brahmasthan: "Open center scores highest; an obstructed center is a consideration.",
  staircase: "Scored by zone: SW/S/W preferred.",
  garage: "Scored by zone: NW/SE preferred.",
  water: "Scored by direction: NE/N preferred; S/SW least favorable.",
};

function ruleFor(key: VastuCategoryKey): string {
  return `${RULE_BASE[key]} Weight ${Math.round(WEIGHTS[key] * 100)}% of the Vastu score.`;
}

/** Build one evidence row from a provenance-wrapped attribute. */
function src<T>(label: string, attr: VastuAttribute<T>, render: (v: T) => string): CategorySource {
  return {
    label,
    value: attr.value == null ? "Unknown" : render(attr.value),
    source: attr.source,
    confidence: attr.confidence,
  };
}

// Zone favorability maps (Vastu Ready balanced methodology).
const KITCHEN_FAV: Record<Zone, number> = { SE: 95, NW: 82, W: 66, E: 75, S: 60, SW: 60, N: 55, NE: 45, CENTER: 42 };
const PRIMARY_FAV: Record<Zone, number> = { SW: 95, S: 82, W: 78, NW: 70, SE: 62, E: 58, N: 56, NE: 46, CENTER: 50 };
const BATH_FAV: Record<Zone, number> = { NW: 82, W: 80, S: 78, SW: 70, SE: 62, E: 58, N: 56, NE: 40, CENTER: 40 };
const STAIR_FAV: Record<Zone, number> = { SW: 88, S: 82, W: 82, NW: 72, SE: 66, E: 60, N: 58, NE: 46, CENTER: 46 };
const GARAGE_FAV: Record<Zone, number> = { NW: 82, SE: 74, W: 72, S: 70, SW: 66, CENTER: 55, N: 62, E: 60, NE: 50 };
const WATER_FAV: Record<Zone, number> = { NE: 92, N: 85, E: 82, NW: 68, W: 62, SE: 48, S: 46, SW: 42, CENTER: 55 };

const CORRECTABILITY_WEIGHT: Record<Correctability, number> = {
  easy: 100,
  moderate: 60,
  major_structural: 28,
  not_practical: 5,
};

function findingStatusFromScore(score: number): FindingStatus {
  if (score >= 85) return "strong";
  if (score >= 75) return "favorable";
  if (score >= 65) return "neutral";
  if (score >= 55) return "consideration";
  return "concern";
}

function severityFromScore(score: number): Severity {
  if (score >= 75) return "none";
  if (score >= 65) return "minor";
  if (score >= 55) return "moderate";
  return "major";
}

const VERIF_RANK: Record<VerificationStatus, number> = {
  verified: 0,
  likely: 1,
  needs_verification: 2,
  potential_concern: 3,
};

function worstVerification(items: VerificationStatus[]): VerificationStatus {
  return items.reduce((worst, v) => (VERIF_RANK[v] > VERIF_RANK[worst] ? v : worst), "verified");
}

/** Apply strictness: widen deviations from the neutral baseline (70) when strict. */
function applyStrictness(score: number, strictness: Strictness): number {
  const mult = strictness === "strict" ? 1.25 : strictness === "flexible" ? 0.8 : 1;
  return clamp(70 + (score - 70) * mult);
}

type RawCategory = {
  key: VastuCategoryKey;
  rawScore: number;
  explanation: string;
  verification: VerificationStatus;
  correctabilityForConcern: Correctability;
  sources: CategorySource[];
};

function evaluateCategories(v: PropertyVastu): RawCategory[] {
  const cats: RawCategory[] = [];

  // --- Entrance & Orientation ---
  {
    const f = v.facingDirection;
    const e = v.entranceDirection;
    const fScore = f.value ? FACING_FAVORABILITY[f.value] : null;
    const eScore = e.value ? FACING_FAVORABILITY[e.value] : null;
    let raw = 70;
    if (fScore != null && eScore != null) raw = 0.6 * fScore + 0.4 * eScore;
    else if (fScore != null) raw = fScore;
    else if (eScore != null) raw = eScore;
    const facingLow = fScore != null && fScore < 60;
    const parts: string[] = [];
    parts.push(
      f.value
        ? `The home faces ${DIRECTION_LABEL[f.value]}`
        : "The facing direction is not confirmed",
    );
    if (e.value) parts.push(`with a ${DIRECTION_LABEL[e.value]} front entrance`);
    parts.push(
      raw >= 80
        ? "— a well-regarded orientation in Vastu."
        : raw >= 65
          ? "— an acceptable orientation with minor considerations."
          : "— an orientation that carries notable Vastu considerations.",
    );
    cats.push({
      key: "entrance_orientation",
      rawScore: raw,
      explanation: parts.join(" "),
      verification: worstVerification([verificationOf(f), verificationOf(e)]),
      correctabilityForConcern: facingLow ? "not_practical" : "moderate",
      sources: [
        src("Facing direction", f, (v) => DIRECTION_LABEL[v]),
        src("Entrance direction", e, (v) => DIRECTION_LABEL[v]),
      ],
    });
  }

  // --- Lot ---
  {
    let raw = 72;
    const notes: string[] = [];
    const shape = v.lotShape.value;
    if (shape === "regular") {
      raw += 10;
      notes.push("a regular, well-proportioned lot");
    } else if (shape === "slightly_irregular") {
      raw += 2;
      notes.push("a slightly irregular lot");
    } else if (shape === "irregular") {
      raw -= 12;
      notes.push("an irregular lot shape");
    } else if (shape === "triangular") {
      raw -= 18;
      notes.push("a triangular lot");
    }
    const road = v.roadPosition.value;
    if (road === "cul_de_sac") {
      raw += 8;
      notes.push("a calm cul-de-sac position");
    } else if (road === "mid_block") {
      raw += 4;
    } else if (road === "corner") {
      raw -= 4;
      notes.push("a corner position");
    } else if (road === "t_junction") {
      raw -= 18;
      notes.push("a T-junction road approach (a common Vastu concern)");
    }
    const open = v.openSpaceNE.value;
    if (open === "open") {
      raw += 10;
      notes.push("open space toward the north/east");
    } else if (open === "obstructed") {
      raw -= 12;
      notes.push("limited north/east open space");
    }
    const shapeOrRoadIssue =
      (shape === "irregular" || shape === "triangular" || road === "t_junction");
    cats.push({
      key: "lot",
      rawScore: clamp(raw),
      explanation: notes.length
        ? `The property sits on ${notes.join(", ")}.`
        : "Lot characteristics appear broadly neutral.",
      verification: worstVerification([
        verificationOf(v.lotShape),
        verificationOf(v.roadPosition),
        verificationOf(v.openSpaceNE),
      ]),
      correctabilityForConcern: shapeOrRoadIssue ? "not_practical" : "easy",
      sources: [
        src("Lot shape", v.lotShape, (s) => s.replace(/_/g, " ")),
        src("Road position", v.roadPosition, (s) => s.replace(/_/g, " ")),
        src("NE open space", v.openSpaceNE, (s) => s),
      ],
    });
  }

  cats.push(zoneCategory("kitchen", v.kitchenZone.value, v.kitchenZone, KITCHEN_FAV, "major_structural"));
  cats.push(zoneCategory("primary_bedroom", v.primaryBedroomZone.value, v.primaryBedroomZone, PRIMARY_FAV, "easy"));

  // --- Bathrooms (worst placement drives it) ---
  {
    const zones = v.bathroomZones.value ?? [];
    let raw = 72;
    if (zones.length > 0) {
      const scores = zones.map((z) => BATH_FAV[z]);
      const min = Math.min(...scores);
      const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
      raw = 0.5 * min + 0.5 * avg;
    }
    const problem = zones.filter((z) => z === "NE" || z === "CENTER");
    cats.push({
      key: "bathrooms",
      rawScore: clamp(raw),
      explanation: zones.length
        ? problem.length
          ? `A bathroom in the ${problem.map(zoneLabel).join(" / ")} is treated as a Vastu consideration.`
          : `Bathroom placement (${zones.map(zoneLabel).join(", ")}) is broadly acceptable.`
        : "Bathroom locations are not confirmed from available data.",
      verification: verificationOf(v.bathroomZones),
      correctabilityForConcern: "moderate",
      sources: [src("Bathroom zones", v.bathroomZones, (zs) => zs.map(zoneLabel).join(", ") || "none noted")],
    });
  }

  // --- Brahmasthan ---
  {
    const c = v.brahmasthan.value;
    const raw = c === "open" ? 95 : c === "partial" ? 70 : c === "obstructed" ? 45 : 68;
    cats.push({
      key: "brahmasthan",
      rawScore: raw,
      explanation:
        c === "open"
          ? "The central zone (Brahmasthan) appears open and unobstructed."
          : c === "obstructed"
            ? "The central zone appears obstructed by heavy or wet functions — a Vastu consideration."
            : "The central zone condition is not fully confirmed.",
      verification: verificationOf(v.brahmasthan),
      correctabilityForConcern: "easy",
      sources: [src("Center condition", v.brahmasthan, (s) => s)],
    });
  }

  cats.push(zoneCategory("staircase", v.staircaseZone.value, v.staircaseZone, STAIR_FAV, "major_structural"));
  cats.push(zoneCategory("garage", v.garageZone.value, v.garageZone, GARAGE_FAV, "not_practical"));

  // --- Water features ---
  {
    const feats = v.waterFeatures.value ?? [];
    let raw = 76;
    if (feats.length > 0) {
      const scores = feats.map((f) => (f.direction ? WATER_FAV[f.direction] : 68));
      raw = scores.reduce((s, n) => s + n, 0) / scores.length;
    }
    const bad = feats.filter((f) => f.direction && WATER_FAV[f.direction] < 55);
    cats.push({
      key: "water",
      rawScore: clamp(raw),
      explanation: feats.length
        ? bad.length
          ? `Water in the ${bad.map((f) => (f.direction ? DIRECTION_LABEL[f.direction] : "")).join(", ")} is treated as a consideration; the northeast/north is traditionally preferred.`
          : "Water features sit in traditionally favorable directions."
        : "No water features noted.",
      verification: verificationOf(v.waterFeatures),
      correctabilityForConcern: "moderate",
      sources: [
        src("Water features", v.waterFeatures, (fs) =>
          fs.length ? fs.map((f) => (f.direction ? DIRECTION_LABEL[f.direction] : "unknown dir.")).join(", ") : "none noted",
        ),
      ],
    });
  }

  return cats;
}

function zoneCategory(
  key: VastuCategoryKey,
  zone: Zone | null,
  attr: VastuAttribute<unknown>,
  fav: Record<Zone, number>,
  correctability: Correctability,
): RawCategory {
  const raw = zone ? fav[zone] : 70;
  const ideal = Object.entries(fav).sort((a, b) => b[1] - a[1])[0]![0] as Zone;
  const explanation = zone
    ? raw >= 80
      ? `${LABELS[key]} in the ${zoneLabel(zone)} aligns well with Vastu guidance.`
      : raw >= 65
        ? `${LABELS[key]} in the ${zoneLabel(zone)} is acceptable with minor considerations.`
        : `${LABELS[key]} in the ${zoneLabel(zone)} is treated as a Vastu consideration (${zoneLabel(ideal)} is preferred).`
    : `${LABELS[key]} placement is not confirmed from available data.`;
  return {
    key,
    rawScore: raw,
    explanation,
    verification: verificationOf(attr),
    correctabilityForConcern: correctability,
    sources: [src(LABELS[key] + " zone", attr, (z) => zoneLabel(z as Zone))],
  };
}

/**
 * Run the deterministic Vastu analysis. Same (property, strictness) always
 * yields the same numeric result (reproducible for stored reports).
 */
export function analyzeVastu(v: PropertyVastu, strictness: Strictness): VastuAnalysis {
  const raw = evaluateCategories(v);

  const categories: CategoryResult[] = raw.map((r) => {
    const score = Math.round(applyStrictness(r.rawScore, strictness));
    const isConcern = score < 70;
    const correctability = isConcern ? r.correctabilityForConcern : null;
    return {
      key: r.key,
      label: LABELS[r.key],
      score,
      findingStatus: findingStatusFromScore(score),
      severity: severityFromScore(score),
      verification: r.verification,
      explanation: r.explanation,
      correctability,
      correctable: correctability ? correctability !== "not_practical" : true,
      weight: WEIGHTS[r.key],
      sources: r.sources,
      rule: ruleFor(r.key),
      ideal: IDEALS[r.key],
    };
  });

  const vastuScore = Math.round(
    clamp(categories.reduce((sum, c) => sum + c.score * c.weight, 0)),
  );

  const concerns = categories.filter((c) => c.correctability != null);
  const correctabilityScore =
    concerns.length === 0
      ? 100
      : Math.round(
          concerns.reduce((s, c) => s + CORRECTABILITY_WEIGHT[c.correctability!], 0) /
            concerns.length,
        );

  return {
    vastuScore,
    correctabilityScore,
    categories,
    methodologyVersion: METHODOLOGY_VERSION,
    strictness,
  };
}
