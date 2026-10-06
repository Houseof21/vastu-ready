import type { StoredOrientation } from "@/domain/orientation";
import {
  NORTH_TYPE_LABEL,
  NEEDS_CONFIRMATION_LABEL,
  EVIDENCE_LABEL,
  bearingToCardinal8,
  enteringBearing,
} from "@/domain/orientation";
import { DIRECTION_LABEL, zoneLabel } from "@/domain/directions";
import { Eyebrow, Badge } from "@/components/ui/primitives";

/**
 * Report view of the orientation record. Keeps every direction concept separate
 * and never labels a machine estimate "verified".
 */
export function OrientationSummary({ orientation: o }: { orientation: StoredOrientation }) {
  const ef = o.entranceFacing;
  const facingLabel = ef.cardinal ? DIRECTION_LABEL[ef.cardinal] : "Unknown";
  return (
    <div>
      <div className="flex items-center justify-between">
        <Eyebrow>Orientation</Eyebrow>
        {ef.confirmed ? <Badge tone="strong">Confirmed</Badge> : <Badge tone="caution">Estimate — needs confirmation</Badge>}
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Entrance-facing (outward)" value={`${facingLabel}${ef.bearingDeg != null ? ` · ${Math.round(ef.bearingDeg)}°` : ""}`} strong />
        {ef.bearingDeg != null ? (
          <Row label="Direction when entering" value={`${DIRECTION_LABEL[bearingToCardinal8(enteringBearing(ef.bearingDeg))]} (opposite — not scored)`} muted />
        ) : null}
        <Row label="Entrance location (zone)" value={o.entranceLocationZone ? zoneLabel(o.entranceLocationZone) : "Unknown"} />
        <Row label="Building frontage" value={o.buildingFrontage ? DIRECTION_LABEL[o.buildingFrontage] : "Unknown"} />
        <Row label="Street direction" value={o.streetDirection ? DIRECTION_LABEL[o.streetDirection] : "Unknown"} />
        <Row label="North reference" value={NORTH_TYPE_LABEL[o.northType]} />
      </dl>

      {o.needsConfirmation.length > 0 ? (
        <div className="mt-3 rounded-md border border-[color:var(--color-caution-soft)] bg-caution-soft/40 p-2.5">
          <p className="text-xs font-semibold text-caution">Needs confirmation</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
            {o.needsConfirmation.map((n) => <li key={n}>• {NEEDS_CONFIRMATION_LABEL[n]}</li>)}
          </ul>
        </div>
      ) : null}

      {o.evidence.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Evidence: {o.evidence.map((e) => `${EVIDENCE_LABEL[e.kind]} (${e.footprint.replace(/_/g, " ")})`).join(", ")}.
        </p>
      ) : null}

      {o.activity.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Activity</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
            {o.activity.slice(-4).map((a, i) => (
              <li key={i}>
                <span className="capitalize text-ink">{a.by}</span> · {a.action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-2 pb-1.5 last:border-b-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-right text-sm ${strong ? "font-semibold text-ink" : muted ? "text-muted" : "font-medium text-ink"}`}>{value}</dd>
    </div>
  );
}
