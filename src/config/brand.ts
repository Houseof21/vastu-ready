/**
 * Central brand configuration (sections: BRAND). "Vastu Ready" is the working
 * MVP name. Read everything from here so a rename is a one-file change.
 */
export const brand = {
  name: "Vastu Ready",
  tagline: "Find a home that feels right.",
  oneLiner:
    "AI-powered home discovery using Vastu, lifestyle preferences, location, and real-estate intelligence.",
  description:
    "Vastu Ready screens every home for the things your family actually cares about — orientation, lot, layout, lifestyle, value, and correctable Vastu concerns — and gives you a clear recommendation.",
  supportEmail: "hello@vastuready.example",
  /** MVP market. Architecture supports more markets + frameworks later. */
  market: "Raleigh, North Carolina",
  frameworks: ["vastu"] as const,
  legalName: "Vastu Ready, Inc. (working name)",
} as const;

export type Brand = typeof brand;
