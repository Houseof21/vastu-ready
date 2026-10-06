import Link from "next/link";
import { Bed, Bath, Ruler, Trees, Car, Compass } from "lucide-react";
import type { Property } from "@/domain/property";
import type { PropertyAnalysis } from "@/domain/scoring";
import { formatUsd, formatSqft, formatAcres, formatBaths, formatDriveTime } from "@/lib/format";
import { zoneLabel } from "@/domain/directions";
import { Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PropertyImage } from "./property-image";
import { VerdictBadge } from "./badges";
import { SaveButton, CompareButton } from "./actions";
import { scoreColor } from "./status";

function MiniScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="font-display text-base font-semibold leading-none"
        style={{ color: scoreColor(score) }}
      >
        {Math.round(score)}
      </span>
      <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

/**
 * Premium feed card. Photography-forward, four scores at a glance, a short
 * deterministic verdict, and the save/compare/analyze actions.
 */
export function PropertyCard({
  property: p,
  analysis: a,
}: {
  property: Property;
  analysis: PropertyAnalysis;
}) {
  const facing = p.vastu.facingDirection.value;
  const href = `/property/${p.id}`;
  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden">
        <PropertyImage imageKey={p.heroImage || p.id} alt={`${p.address.line1}, ${p.address.neighborhood}`} />
        <div className="absolute left-3 top-3">
          <VerdictBadge level={a.verdict.level} />
        </div>
        <div className="absolute right-3 top-3 rounded-pill bg-ink/80 px-2.5 py-1 text-xs font-semibold text-canvas backdrop-blur">
          Overall {a.scores.overall}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl font-semibold text-ink">{formatUsd(p.price)}</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2">
            <Compass size={13} aria-hidden />
            {facing ? `${zoneLabel(facing)}-facing` : "Facing unverified"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-ink">{p.address.line1}</p>
        <p className="truncate text-xs text-muted">
          {p.address.neighborhood} · {p.address.city}, {p.address.state}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1"><Bed size={13} aria-hidden />{p.beds} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={13} aria-hidden />{formatBaths(p.baths)} ba</span>
          <span className="inline-flex items-center gap-1"><Ruler size={13} aria-hidden />{formatSqft(p.sqft)}</span>
          <span className="inline-flex items-center gap-1"><Trees size={13} aria-hidden />{formatAcres(p.lotAcres)}</span>
          <span className="inline-flex items-center gap-1"><Car size={13} aria-hidden />{formatDriveTime(p.driveMinutes)}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-line-2 bg-surface-2 py-3">
          <MiniScore label="Vastu" score={a.scores.vastu} />
          <MiniScore label="Match" score={a.scores.personalMatch} />
          <MiniScore label="Value" score={a.scores.value} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-2">{a.verdict.headline}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
          <ButtonLink href={href} variant="primary" size="sm">
            View analysis
          </ButtonLink>
          <SaveButton propertyId={p.id} />
          <CompareButton propertyId={p.id} />
        </div>
      </div>
    </Card>
  );
}
