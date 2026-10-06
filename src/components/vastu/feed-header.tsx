"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/primitives";
import { usePreferences, useHasCustomPreferences } from "@/lib/use-scored";
import { formatUsd } from "@/lib/format";

/** Feed intro that reflects the buyer's *current* (possibly edited) preferences. */
export function FeedHeader() {
  const prefs = usePreferences();
  const custom = useHasCustomPreferences();
  const p = prefs.profile;
  return (
    <div>
      <Eyebrow>Your feed · {p.name}</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Homes in {p.preferredAreas[0] ?? "your areas"} &amp; nearby
      </h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Ranked by overall match for your priorities — up to {formatUsd(p.maxBudget, { compact: true })},{" "}
        {p.minBeds}+ beds, {p.minLotAcres}+ acre lots, {p.maxDriveMinutes}-min commute to {p.destinationLabel}.
        Each score blends Vastu alignment, your personal fit, and value.{" "}
        <Link href="/preferences" className="font-medium text-forest hover:underline">
          {custom ? "Edit preferences" : "Personalize"}
        </Link>
        .
      </p>
    </div>
  );
}
