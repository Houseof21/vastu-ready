import type { OrientationEvidence, OrientationEstimate } from "@/domain/orientation";

/**
 * Document-analysis provider seam. In production this reads floor plans, plats,
 * aerial/property maps to *suggest* north, the building footprint, the main
 * entrance, and room locations. The app never depends on it: suggestions are
 * always labeled unconfirmed and a person confirms them in the Orientation
 * Studio. When no provider is configured, the full manual workflow stands in.
 *
 * No scraping; aerial/property maps come only through an authorized map provider.
 */

export type EntranceSuggestion = {
  /** Normalized position of the detected door on the plan (0..1), if any. */
  door?: { x: number; y: number };
  /** Outward vector suggestion. */
  outward?: { dx: number; dy: number };
  confidence: number;
};

export type DocumentAnalysis = {
  configured: boolean;
  /** Machine estimate — NEVER confirmed; the UI must label it unconfirmed. */
  estimate: OrientationEstimate | null;
  northScreenAngle: number | null;
  entrances: EntranceSuggestion[];
  /** Human-readable notes, including why automation is unavailable. */
  notes: string[];
};

export interface DocumentAnalysisProvider {
  readonly id: string;
  readonly configured: boolean;
  analyze(evidence: OrientationEvidence[]): Promise<DocumentAnalysis>;
}

/** Not-configured stub: returns no machine suggestions and says so plainly. */
export const UnconfiguredAnalysisProvider: DocumentAnalysisProvider = {
  id: "none",
  configured: false,
  async analyze() {
    return {
      configured: false,
      estimate: null,
      northScreenAngle: null,
      entrances: [],
      notes: [
        "Automated document analysis isn't configured. Set North and the outward entrance arrow " +
          "yourself in the Orientation Studio — nothing is inferred, and nothing is marked confirmed " +
          "until you confirm it.",
      ],
    };
  },
};

export function getAnalysisProvider(): DocumentAnalysisProvider {
  // A vision adapter (authorized map provider + model) plugs in here behind the
  // same interface; its output stays unconfirmed until a person confirms it.
  return UnconfiguredAnalysisProvider;
}
