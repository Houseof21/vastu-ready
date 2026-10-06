import { formatUsd } from "@/lib/format";
import { DIRECTION_LABEL } from "@/domain/directions";
import type {
  AICompareResult,
  AIProvider,
  AIRecommendation,
  CompareContext,
  RecommendationContext,
} from "./types";
import type { CategoryResult } from "@/domain/types";

/**
 * Deterministic mock advisor. Produces grounded, conversational reasoning from
 * the analysis — and only ever says something is "verified" when the data is.
 * Lets the full experience work with no AI credentials.
 */

function verifyPhrase(c: CategoryResult): string {
  switch (c.verification) {
    case "verified":
      return "is confirmed";
    case "likely":
      return "appears to be";
    case "needs_verification":
      return "is not fully confirmed and should be verified";
    case "potential_concern":
      return "looks like a potential concern to confirm";
  }
}

export const MockAIProvider: AIProvider = {
  id: "mock",
  isMock: true,

  async generateRecommendation(ctx: RecommendationContext): Promise<AIRecommendation> {
    return recommendationResult(ctx);
  },

  async compareProperties(ctx: CompareContext): Promise<AICompareResult> {
    return compareResult(ctx);
  },
};

/** Pure, synchronous recommendation logic (also used directly on the client). */
export function recommendationResult(ctx: RecommendationContext): AIRecommendation {
  {
    const { property: p, analysis: a } = ctx;
    const lines: string[] = [];

    const strengths = a.vastu.categories
      .filter((c) => c.score >= 80)
      .sort((x, y) => y.score - x.score);
    const concerns = a.vastu.categories
      .filter((c) => c.score < 62)
      .sort((x, y) => x.score - y.score);
    const toVerify = a.vastu.categories.filter((c) => c.verification === "needs_verification");

    // Lead
    if (a.verdict.level === "strong_match") {
      lines.push(
        `This property fits you unusually well. ${strengthSentence(p, strengths)} At ${formatUsd(p.price)}, the overall picture is one of your strongest matches so far.`,
      );
    } else if (a.verdict.level === "good_with_concerns") {
      lines.push(
        `A good property overall. ${strengthSentence(p, strengths)} There are a couple of things worth confirming before you get too far.`,
      );
    } else if (a.verdict.level === "mixed") {
      lines.push(
        `This one is a genuine trade-off. ${strengthSentence(p, strengths)} But there are real considerations that keep it out of the top tier for your priorities.`,
      );
    } else {
      lines.push(
        `I'd pass on this one for your criteria. ${concerns.length ? "The concerns below are the main reasons." : "It doesn't line up well with what you've told me matters most."}`,
      );
    }

    // Dealbreakers
    if (a.violations.length > 0) {
      lines.push(
        `Heads up — this trips a dealbreaker you set: ${a.violations.map((v) => v.detail).join(" ")}`,
      );
    }

    // Stated requirements missed (keeps it out of a strong match)
    if (a.constraints.length > 0) {
      lines.push(
        `It also misses something you asked for: ${a.constraints.map((c) => c.detail).join(" ")} That's why it can't rank as a strong match, even where the rest is good.`,
      );
    }

    // Concerns + correctability
    if (concerns.length > 0) {
      const c = concerns[0]!;
      const fixable =
        c.correctability === "easy"
          ? "and it's an easy, low-cost fix"
          : c.correctability === "moderate"
            ? "and it's a moderate fix"
            : c.correctability === "major_structural"
              ? "but correcting it would be a major structural change"
              : "and it isn't really practical to change";
      lines.push(`The main consideration is the ${c.label.toLowerCase()} — it ${verifyPhrase(c)}, ${fixable}.`);
    }

    // Value stance
    const vs = a.scores.value;
    lines.push(
      vs >= 85
        ? `On price, this looks like strong value relative to comparable homes.`
        : vs >= 70
          ? `On price, it's priced fairly for what it offers.`
          : `On price, it looks a bit rich for the fundamentals — worth a negotiation conversation.`,
    );

    // What to verify
    if (toVerify.length > 0) {
      lines.push(
        `Before an offer, I'd verify: ${toVerify.map((c) => c.label.toLowerCase()).join(", ")}. I've flagged these as not fully confirmed rather than guessing.`,
      );
    }

    return { headline: a.verdict.headline, reasoning: lines, provider: "mock", isMock: true };
  }
}

/** Pure, synchronous comparison logic (also used directly on the client). */
export function compareResult(ctx: CompareContext): AICompareResult {
  const ranked = [...ctx.items].sort((x, y) => y.analysis.scores.overall - x.analysis.scores.overall);
  const top = ranked[0];
  if (!top) return { pickPropertyId: null, reasoning: ["Add homes to compare."], provider: "mock", isMock: true };

  const lines: string[] = [];
    const topName = top.property.address.line1;
    lines.push(
      `Of these ${ranked.length} homes, I'd choose ${topName}. It has the highest overall match (${top.analysis.scores.overall}) for your priorities.`,
    );
    const runner = ranked[1];
    if (runner) {
      const tHi = top.analysis.scores;
      const rHi = runner.analysis.scores;
      const edge =
        tHi.vastu - rHi.vastu >= 6
          ? "its orientation and layout align better with Vastu"
          : tHi.value - rHi.value >= 6
            ? "it's the stronger value"
            : "it's the better all-around fit for what you've prioritized";
      lines.push(
        `${runner.property.address.line1} is close, but ${edge}. If move-in condition matters most to you, it's worth a second look.`,
      );
    }
    const correctable = ranked.find((r) => r.analysis.correctabilityScore >= 70 && r.analysis.scores.vastu < 80);
    if (correctable) {
      lines.push(
        `One note: ${correctable.property.address.line1}'s Vastu concerns are largely correctable, so a slightly lower score there may matter less if you're comfortable making changes.`,
      );
    }
  return { pickPropertyId: top.property.id, reasoning: lines, provider: "mock", isMock: true };
}

function strengthSentence(
  p: { vastu: { facingDirection: { value: string | null } }; lotAcres: number },
  strengths: CategoryResult[],
): string {
  const bits: string[] = [];
  const facing = p.vastu.facingDirection.value;
  if (facing && (facing === "N" || facing === "NE" || facing === "E")) {
    bits.push(`the ${DIRECTION_LABEL[facing as "N" | "NE" | "E"].toLowerCase()}-facing orientation`);
  }
  if (p.lotAcres >= 0.8) bits.push(`the ${p.lotAcres.toFixed(2)}-acre lot`);
  const topCat = strengths.find((c) => c.key !== "entrance_orientation" && c.key !== "lot");
  if (topCat) bits.push(`a well-placed ${topCat.label.toLowerCase()}`);
  if (bits.length === 0) return "The fundamentals are reasonable.";
  return `I like ${bits.slice(0, 3).join(", ")}.`;
}
