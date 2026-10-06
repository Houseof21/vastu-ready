import { describe, it, expect } from "vitest";
import { analyzeProperty, overallScore, personalMatch, valueScore } from "@/domain/scoring";
import { analyzeVastu, METHODOLOGY_VERSION } from "@/domain/vastu/engine";
import { DEMO_PREFERENCES, DEMO_PROPERTIES, getDemoProperty } from "@/data/demo";
import type { PropertyAnalysis } from "@/domain/scoring";

const AT = "2026-01-01T00:00:00.000Z";

function analyzeAll(): PropertyAnalysis[] {
  return DEMO_PROPERTIES.map((p) => analyzeProperty(p, DEMO_PREFERENCES, AT));
}

describe("deterministic scoring engine", () => {
  it("is pure: identical inputs produce byte-identical analyses", () => {
    const a = analyzeAll();
    const b = analyzeAll();
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("produces scores within [0,100] for every property and category", () => {
    for (const a of analyzeAll()) {
      const { overall, vastu, personalMatch: pm, value } = a.scores;
      for (const s of [overall, vastu, pm, value]) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
        expect(Number.isInteger(s)).toBe(true);
      }
      expect(a.correctabilityScore).toBeGreaterThanOrEqual(0);
      expect(a.correctabilityScore).toBeLessThanOrEqual(100);
      for (const c of a.vastu.categories) {
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("stamps methodology + scoring versions", () => {
    const a = analyzeProperty(DEMO_PROPERTIES[0]!, DEMO_PREFERENCES, AT);
    expect(a.vastu.methodologyVersion).toBe(METHODOLOGY_VERSION);
    expect(a.scoringVersion).toMatch(/^scoring-/);
    expect(a.createdAt).toBe(AT);
  });
});

describe("verdict distribution matches the seeded design", () => {
  it("yields the intended spread of excellent / good / mixed / pass", () => {
    const byId = new Map(analyzeAll().map((a) => [a.propertyId, a]));
    // Strong matches
    expect(byId.get("p-cardinal")!.verdict.level).toBe("strong_match");
    expect(byId.get("p-stillwater")!.verdict.level).toBe("strong_match");
    // Pass cases — a hard dealbreaker is disqualifying.
    expect(byId.get("p-thistle")!.verdict.level).toBe("pass");
    expect(byId.get("p-redmaple")!.verdict.level).toBe("pass");
    // Every verdict tier is represented in the demo set.
    const levels = new Set([...byId.values()].map((a) => a.verdict.level));
    expect(levels).toEqual(new Set(["strong_match", "good_with_concerns", "mixed", "pass"]));
    // Overall ordering: a strong match beats a pass
    expect(byId.get("p-cardinal")!.scores.overall).toBeGreaterThan(
      byId.get("p-thistle")!.scores.overall,
    );
  });
});

describe("dealbreakers cap the overall score", () => {
  it("SW-facing home trips poor_orientation and is capped", () => {
    const thistle = getDemoProperty("p-thistle")!;
    const a = analyzeProperty(thistle, DEMO_PREFERENCES, AT);
    expect(a.violations.some((v) => v.dealbreaker === "poor_orientation")).toBe(true);
    expect(a.scores.overall).toBeLessThanOrEqual(54);
  });

  it("over-budget home trips over_budget", () => {
    const redmaple = getDemoProperty("p-redmaple")!;
    const prefs = {
      ...DEMO_PREFERENCES,
      vastu: { ...DEMO_PREFERENCES.vastu, dealbreakers: ["over_budget" as const] },
    };
    const a = analyzeProperty(redmaple, prefs, AT);
    expect(redmaple.price).toBeGreaterThan(DEMO_PREFERENCES.profile.maxBudget);
    expect(a.violations.some((v) => v.dealbreaker === "over_budget")).toBe(true);
  });
});

describe("strictness widens deviation from the neutral baseline", () => {
  const score = (v: Parameters<typeof analyzeVastu>[0], s: Parameters<typeof analyzeVastu>[1]) =>
    analyzeVastu(v, s).vastuScore;

  it("amplifies a strong property above baseline: strict >= balanced >= flexible", () => {
    const v = getDemoProperty("p-cardinal")!.vastu; // well above 70
    expect(score(v, "balanced")).toBeGreaterThan(70);
    expect(score(v, "strict")).toBeGreaterThanOrEqual(score(v, "balanced"));
    expect(score(v, "balanced")).toBeGreaterThanOrEqual(score(v, "flexible"));
  });

  it("amplifies a weak property below baseline: strict <= balanced <= flexible", () => {
    const v = getDemoProperty("p-thistle")!.vastu; // below 70
    expect(score(v, "balanced")).toBeLessThan(70);
    expect(score(v, "strict")).toBeLessThanOrEqual(score(v, "balanced"));
    expect(score(v, "balanced")).toBeLessThanOrEqual(score(v, "flexible"));
  });
});

describe("value + personal match sub-scores are grounded", () => {
  it("a home priced under its estimate scores higher value than one priced over", () => {
    const cardinal = getDemoProperty("p-cardinal")!; // priced under estimate
    const greystone = getDemoProperty("p-greystone")!; // overpriced
    expect(valueScore(cardinal)).toBeGreaterThan(valueScore(greystone));
  });

  it("personal match rewards a home that meets the buyer's hard minimums", () => {
    const cardinal = getDemoProperty("p-cardinal")!;
    const pm = personalMatch(cardinal, DEMO_PREFERENCES.profile);
    expect(pm).toBeGreaterThan(70);
  });
});

describe("overallScore respects violation capping directly", () => {
  it("caps harder as violations accumulate", () => {
    const s = { vastu: 90, personalMatch: 90, value: 90 };
    const profile = DEMO_PREFERENCES.profile;
    const noViol = overallScore(s, profile, []);
    const oneViol = overallScore(s, profile, [{ dealbreaker: "poor_orientation", detail: "x" }]);
    const twoViol = overallScore(s, profile, [
      { dealbreaker: "poor_orientation", detail: "x" },
      { dealbreaker: "over_budget", detail: "y" },
    ]);
    expect(noViol).toBeGreaterThan(oneViol);
    expect(oneViol).toBeGreaterThan(twoViol);
  });
});
