import type { OrientationEvidence, OrientationEstimate } from "@/domain/orientation";
import type { RoomKind } from "@/domain/rooms";

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

/** A suggested room location on the plan (0..1), to be confirmed by a person. */
export type RoomSuggestion = {
  kind: RoomKind;
  x: number;
  y: number;
  confidence: number;
};

export type DocumentAnalysis = {
  configured: boolean;
  /** Machine estimate — NEVER confirmed; the UI must label it unconfirmed. */
  estimate: OrientationEstimate | null;
  northScreenAngle: number | null;
  entrances: EntranceSuggestion[];
  /** Suggested interior room positions (empty until a vision model is configured). */
  rooms: RoomSuggestion[];
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
      rooms: [],
      notes: [
        "Automated floor-plan reading isn't configured, so room positions aren't pre-suggested. " +
          "Place rooms on your plan yourself in the Room-Zone Studio and set the outward entrance arrow " +
          "in the Orientation Studio — nothing is inferred, and nothing is marked confirmed until you do. " +
          "Dependency to enable auto-suggestions: a configured vision model (set VISION_API_KEY and a " +
          "VISION_MODEL) behind this provider, reading the uploaded plan to propose north, the entrance, " +
          "and room locations — all still unconfirmed until a person confirms them.",
      ],
    };
  },
};

export function getAnalysisProvider(): DocumentAnalysisProvider {
  // A vision adapter (authorized map provider + model) plugs in here behind the
  // same interface; its output stays unconfirmed until a person confirms it.
  // Enable by configuring VISION_API_KEY/VISION_MODEL and returning a provider
  // whose analyze() calls the model and maps detections → RoomSuggestion[].
  return UnconfiguredAnalysisProvider;
}

/** Whether automated floor-plan analysis is configured (vision model present). */
export function isAnalysisConfigured(): boolean {
  return !!(process.env.VISION_API_KEY && process.env.VISION_API_KEY.trim());
}
