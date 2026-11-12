import { Info } from "lucide-react";

/**
 * Prominent, in-context disclosure that demo homes are fictional — not buried
 * in the footer. Shown on the feed and on every demo property's report.
 */
export function FictionalBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-[color:var(--color-caution-soft)] bg-caution-soft/60 px-4 py-3 text-sm text-ink-2 ${className}`}
      role="note"
    >
      <Info size={16} className="mt-0.5 shrink-0 text-caution" aria-hidden />
      <p>
        <span className="font-semibold text-ink">Sample data.</span> These homes, addresses, and comparable
        sales are fictional, created to demonstrate the analysis. Nothing here represents a real listing.
      </p>
    </div>
  );
}

/**
 * Shown when the feed/report is built from REAL listings (via a licensed data
 * provider such as RentCast). Facts are real; Vastu orientation is not in any
 * listing feed, so it stays flagged for verification.
 */
export function RealListingBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-[color:var(--color-info-soft)] bg-info-soft/60 px-4 py-3 text-sm text-ink-2 ${className}`}
      role="note"
    >
      <Info size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
      <p>
        <span className="font-semibold text-ink">Real listings.</span> Facts — price, beds, baths, size,
        lot, year — come from a licensed data provider (RentCast). Vastu orientation and room placement
        aren&apos;t carried by any listing feed, so they&apos;re marked{" "}
        <span className="font-medium text-ink">&ldquo;needs verification&rdquo;</span> until confirmed for
        each home. Value uses the list price as a disclosed stand-in, not an independent estimate.
      </p>
    </div>
  );
}

/** Shown on reports built from county GIS records (address lookup). */
export function GisDerivedBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-[color:var(--color-info-soft)] bg-info-soft/60 px-4 py-3 text-sm text-ink-2 ${className}`}
      role="note"
    >
      <Info size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
      <p>
        <span className="font-semibold text-ink">From public GIS.</span> Where county coverage exists, lot
        size, heated area, year built, and assessed value come from county records; otherwise only the
        footprint-derived facing is available. The orientation is{" "}
        <span className="font-medium text-ink">estimated from the building footprint</span> and needs your
        confirmation. Beds, baths, and interior room zones aren&apos;t in these sources — add them to complete
        the report. Any assessed value shown is a disclosed stand-in, not a list price or appraisal.
      </p>
    </div>
  );
}

/** Shown on reports built from buyer-entered data. */
export function ManualEntryBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-[color:var(--color-info-soft)] bg-info-soft/60 px-4 py-3 text-sm text-ink-2 ${className}`}
      role="note"
    >
      <Info size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
      <p>
        <span className="font-semibold text-ink">Your entry.</span> This report is built entirely from the
        details you provided. Anything you left as &ldquo;Unknown&rdquo; is scored conservatively and flagged
        to verify — nothing is inferred to fill gaps.
      </p>
    </div>
  );
}
