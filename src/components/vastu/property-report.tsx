"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bed, Bath, Ruler, Trees, Car, Calendar, Home, Pencil, Trash2, AlertTriangle, Compass } from "lucide-react";
import type { Property } from "@/domain/property";
import type { PropertyAnalysis } from "@/domain/scoring";
import type { UserPreferences } from "@/domain/profile";
import { recommendationResult } from "@/ai";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { ScoreRing } from "./score-ring";
import { VerdictBadge } from "./badges";
import { CategoryAnalysisRow } from "./category-row";
import { CompassDiagram } from "./compass-diagram";
import { CompsTable } from "./comps-table";
import { FeedbackButtons } from "./feedback-buttons";
import { SaveButton, CompareButton } from "./actions";
import { PropertyImage } from "./property-image";
import { FictionalBanner, ManualEntryBanner, RealListingBanner, GisDerivedBanner } from "./disclosure-banner";
import { OrientationConfirm } from "@/components/orientation/orientation-confirm";
import { InteriorRoomsCard } from "@/components/orientation/interior-rooms-card";
import { useUserState } from "@/components/providers/user-state";
import { formatUsd, formatSqft, formatAcres, formatBaths, formatDriveTime } from "@/lib/format";
import { DEALBREAKER_LABEL } from "@/domain/profile";
import { HOME_TYPE_LABEL } from "@/domain/labels";
import { dataCoverage } from "@/domain/coverage";
import { DIRECTION_LABEL } from "@/domain/directions";

export function PropertyReport({
  property: p,
  analysis: a,
  prefs,
}: {
  property: Property;
  analysis: PropertyAnalysis;
  prefs: UserPreferences;
}) {
  const router = useRouter();
  const { removeProperty } = useUserState();
  const ai = recommendationResult({ property: p, analysis: a, prefs });
  const isManual = p.source === "manual";
  // GIS/address homes are stored like manual entries and can be edited to add
  // the facts county data doesn't carry (beds, baths, lot).
  const editable = isManual || p.source === "gis";
  const coverage = dataCoverage(p.vastu);

  // Per-fact provenance tag when a licensed listing was cross-referenced.
  const mlsFields = p.mls?.fields ?? {};
  const tagFor = (f: "beds" | "baths" | "sqft" | "yearBuilt" | "lotAcres") => {
    switch (mlsFields[f]) {
      case "mls":
        return { text: "MLS", tone: "mls" as const };
      case "corroborated":
        return { text: "✓ MLS", tone: "ok" as const };
      case "conflict":
        return { text: "⚠ differs", tone: "warn" as const };
      default:
        return null;
    }
  };

  // Unknown facts (common for GIS/address lookups) read "Unknown", never "0".
  const facing = p.vastu.facingDirection.value;
  const facts = [
    { Icon: Compass, label: facing ? `Faces ${DIRECTION_LABEL[facing]}` : "Facing to confirm", tag: null },
    { Icon: Bed, label: p.beds > 0 ? `${p.beds} beds` : "Beds unknown", tag: tagFor("beds") },
    { Icon: Bath, label: p.baths > 0 ? `${formatBaths(p.baths)} baths` : "Baths unknown", tag: tagFor("baths") },
    { Icon: Ruler, label: p.sqft > 0 ? formatSqft(p.sqft) : "Size unknown", tag: tagFor("sqft") },
    { Icon: Trees, label: p.lotAcres > 0 ? `${formatAcres(p.lotAcres)} lot` : "Lot unknown", tag: tagFor("lotAcres") },
    { Icon: Car, label: p.driveMinutes != null ? formatDriveTime(p.driveMinutes) : "Commute unknown", tag: null },
    { Icon: Calendar, label: p.yearBuilt ? `Built ${p.yearBuilt}` : "Year unknown", tag: tagFor("yearBuilt") },
    { Icon: Home, label: HOME_TYPE_LABEL[p.homeType], tag: null },
  ];
  const tagClass = (tone: "mls" | "ok" | "warn") =>
    tone === "warn"
      ? "border-[color:var(--color-caution-soft)] bg-caution-soft/50 text-caution"
      : tone === "ok"
        ? "border-[color:var(--color-good-soft)] bg-good-soft/40 text-forest"
        : "border-line bg-surface-2 text-ink-2";

  function onDelete() {
    removeProperty(p.id);
    router.push("/feed");
  }

  return (
    <div className="space-y-8">
      {p.isDemo ? <FictionalBanner /> : null}
      {p.source === "rentcast" ? <RealListingBanner /> : null}
      {p.source === "gis" ? <GisDerivedBanner /> : null}
      {isManual ? <ManualEntryBanner /> : null}

      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="aspect-[16/10]">
            <PropertyImage imageKey={p.heroImage || p.id} url={p.floorPlanDataUrl ?? undefined} alt={p.address.line1} rounded="" />
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge level={a.verdict.level} />
              {p.newConstruction ? <Badge tone="info">New construction</Badge> : null}
              {isManual ? <Badge tone="neutral">Your entry</Badge> : null}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold text-ink">{p.price ? formatUsd(p.price) : "Price not set"}</h1>
            <p className="mt-1 text-lg text-ink">{p.address.line1}</p>
            <p className="text-sm text-muted">
              {[p.address.neighborhood, p.address.city, p.address.state].filter(Boolean).join(", ")} {p.address.zip}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-2">
              {facts.map((f) => (
                <span key={f.label} className="inline-flex items-center gap-1.5">
                  <f.Icon size={15} aria-hidden /> {f.label}
                  {f.tag ? (
                    <span className={`rounded-pill border px-1.5 py-0.5 text-[0.6rem] font-medium leading-none ${tagClass(f.tag.tone)}`}>
                      {f.tag.text}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
            {p.mls ? (
              <p className="mt-3 text-xs text-muted">
                Beds, baths{p.mls.floorPlanUrl ? ", and floor plan" : ""} from a licensed{" "}
                <span className="font-medium text-ink-2">{p.mls.sourceMls.toUpperCase()}</span> listing ({p.mls.status}
                {p.mls.listedAt ? ` · updated ${new Date(p.mls.listedAt).toLocaleDateString()}` : ""}).
                {p.mls.coordConfirmed ? " Exact house confirmed from the listing's own location." : ""}
                {p.mls.discrepancies.length > 0
                  ? ` County and listing differ on ${p.mls.discrepancies
                      .map((d) => `${d.field} (${d.deltaPct}%)`)
                      .join(", ")} — the county record is shown.`
                  : ""}
              </p>
            ) : p.source === "gis" ? (
              <p className="mt-3 text-xs text-muted">
                Beds, baths, and floor plan aren&apos;t in public GIS. Connect a licensed MLS feed to auto-fill them
                when the home is listed, or add them yourself with &ldquo;Add details &amp; recalculate.&rdquo;
              </p>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <SaveButton propertyId={p.id} />
            <CompareButton propertyId={p.id} />
            {editable ? (
              <>
                <Link
                  href={`/analyze/manual?id=${encodeURIComponent(p.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
                >
                  <Pencil size={14} aria-hidden /> {p.source === "gis" ? "Add details & recalculate" : "Edit & recalculate"}
                </Link>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-concern hover:bg-surface-2"
                >
                  <Trash2 size={14} aria-hidden /> Delete
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Constraint flags — stated requirements this home misses */}
      {a.constraints.length > 0 ? (
        <div className="rounded-lg border border-[color:var(--color-caution-soft)] bg-caution-soft/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-caution">
            <AlertTriangle size={15} aria-hidden /> Doesn&apos;t meet {a.constraints.length} of your stated requirements
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-2">
            {a.constraints.map((c) => (
              <li key={c.key}>• {c.detail}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            A home that misses a requirement you set can&apos;t rank as a &ldquo;Strong Match,&rdquo; even when
            other scores are high.
          </p>
        </div>
      ) : null}

      {/* Scores */}
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Overall match", v: a.scores.overall },
            { label: "Vastu", v: a.scores.vastu },
            { label: "Personal fit", v: a.scores.personalMatch },
            { label: "Value", v: a.scores.value },
          ].map((s) => (
            <Card key={s.label}>
              <CardBody className="flex flex-col items-center gap-1 p-4">
                <ScoreRing score={s.v} label={s.label} size={84} />
              </CardBody>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          Overall match is weighted by your priorities and capped by dealbreakers and unmet requirements —
          not a simple average. Expand any Vastu category below to see its evidence and rule.
        </p>

        {/* Data coverage — shown separately from Vastu alignment */}
        <div className="mt-3 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Data coverage: {coverage.known}/{coverage.total} attributes known ({Math.round(coverage.ratio * 100)}%)</span>
            {!coverage.sufficient ? <Badge tone="caution">Scores provisional</Badge> : <Badge tone="good">Well-covered</Badge>}
          </div>
          {!coverage.sufficient ? (
            <p className="max-w-md text-center text-[0.7rem] text-muted">
              Too little verified information to treat these aggregate scores as firm — they&apos;re a
              provisional read until more is confirmed. Coverage is distinct from alignment: a home can be
              well-covered and score low, or barely covered and score high on what little is known.
            </p>
          ) : null}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>Advisor recommendation</Eyebrow>
                {ai.isMock ? (
                  <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted">Grounded demo advisor</span>
                ) : null}
              </div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{ai.headline}</h2>
              <div className="mt-3 space-y-3">
                {ai.reasoning.map((para, i) => (
                  <p key={i} className="text-[0.95rem] leading-relaxed text-ink-2">{para}</p>
                ))}
              </div>
              {a.violations.length > 0 ? (
                <div className="mt-4 rounded-md border border-[color:var(--color-concern-soft)] bg-concern-soft/60 p-3">
                  <p className="text-sm font-semibold text-concern">Dealbreakers triggered</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-ink-2">
                    {a.violations.map((v) => (
                      <li key={v.dealbreaker}>• {DEALBREAKER_LABEL[v.dealbreaker]} — {v.detail}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <Eyebrow>Vastu analysis</Eyebrow>
                <span className="text-xs text-muted">{a.vastu.categories.length} categories</span>
              </div>
              <p className="mt-1 text-sm text-ink-2">
                Each area shows its score, how confident we are in the underlying data, and — on expand — the
                exact evidence and scoring rule behind it.
              </p>
              <div className="mt-2">
                {a.vastu.categories.map((c) => (
                  <CategoryAnalysisRow key={c.key} category={c} />
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CompsTable property={p} />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <Eyebrow>Lot &amp; orientation</Eyebrow>
              <div className="mt-3">
                <CompassDiagram vastu={p.vastu} />
              </div>
            </CardBody>
          </Card>

          {p.orientation ? (
            <Card>
              <CardBody>
                <OrientationConfirm property={p} />
              </CardBody>
            </Card>
          ) : null}

          {!p.isDemo ? (
            <Card>
              <CardBody>
                <InteriorRoomsCard property={p} />
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody>
              <Eyebrow>Correctability</Eyebrow>
              <div className="mt-3 flex items-center gap-4">
                <ScoreRing score={a.correctabilityScore} size={72} />
                <p className="text-sm text-ink-2">
                  How practical it is to improve this home&apos;s Vastu concerns. Higher means mostly easy,
                  low-cost fixes; lower means structural changes.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Eyebrow>Your take</Eyebrow>
              <p className="mt-1 text-sm text-ink-2">Tell the advisor how you feel — it tunes what it surfaces next.</p>
              <div className="mt-3">
                <FeedbackButtons propertyId={p.id} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Eyebrow>Methodology</Eyebrow>
              <dl className="mt-2 space-y-1 text-xs text-muted">
                <div className="flex justify-between gap-2"><dt>Scoring</dt><dd className="text-ink-2">{a.scoringVersion}</dd></div>
                <div className="flex justify-between gap-2"><dt>Vastu methodology</dt><dd className="text-ink-2">{a.vastu.methodologyVersion}</dd></div>
                <div className="flex justify-between gap-2"><dt>Strictness</dt><dd className="text-ink-2 capitalize">{a.vastu.strictness}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">
                Scores are deterministic and reproducible. Full rules are in each category&apos;s evidence
                drawer and the docs.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
