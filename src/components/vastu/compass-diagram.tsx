import type { PropertyVastu, Zone } from "@/domain/types";
import { zoneLabel } from "@/domain/directions";
import { cn } from "@/lib/cn";

/** Grid position (0-2) for each zone on a 3×3 directional plan. */
const ZONE_POS: Record<Zone, { col: number; row: number }> = {
  NW: { col: 0, row: 0 },
  N: { col: 1, row: 0 },
  NE: { col: 2, row: 0 },
  W: { col: 0, row: 1 },
  CENTER: { col: 1, row: 1 },
  E: { col: 2, row: 1 },
  SW: { col: 0, row: 2 },
  S: { col: 1, row: 2 },
  SE: { col: 2, row: 2 },
};

type Marker = { zone: Zone | null; label: string; confident: boolean };

/**
 * Compass + lot diagram. North is up. It plots only zones that are actually
 * known; anything inferred or missing is labeled, and the whole diagram carries
 * an "approximate — verify" note unless every placement is confirmed. It never
 * invents geometry.
 */
export function CompassDiagram({
  vastu,
  className,
}: {
  vastu: PropertyVastu;
  className?: string;
}) {
  const facing = vastu.facingDirection.value;
  const entrance = vastu.entranceDirection.value;

  const markers: Marker[] = [
    { zone: vastu.kitchenZone.value, label: "Kitchen", confident: vastu.kitchenZone.confidence >= 0.85 },
    {
      zone: vastu.primaryBedroomZone.value,
      label: "Primary",
      confident: vastu.primaryBedroomZone.confidence >= 0.85,
    },
    {
      zone: vastu.staircaseZone.value,
      label: "Stairs",
      confident: vastu.staircaseZone.confidence >= 0.85,
    },
    { zone: vastu.garageZone.value, label: "Garage", confident: vastu.garageZone.confidence >= 0.85 },
  ];
  const baths = vastu.bathroomZones.value ?? [];
  for (const b of baths) {
    markers.push({ zone: b, label: "Bath", confident: vastu.bathroomZones.confidence >= 0.85 });
  }

  const known = markers.filter((m) => m.zone != null);
  const allConfident =
    known.length > 0 &&
    known.every((m) => m.confident) &&
    vastu.facingDirection.confidence >= 0.85;

  const size = 300;
  const cell = size / 3;
  // Group markers by zone so multiple labels in one sector stack.
  const byZone = new Map<Zone, Marker[]>();
  for (const m of known) {
    if (!m.zone) continue;
    const arr = byZone.get(m.zone) ?? [];
    arr.push(m);
    byZone.set(m.zone, arr);
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative mx-auto w-full max-w-sm">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full" role="img" aria-label="Directional plan, north up">
          {/* Lot */}
          <rect x={6} y={6} width={size - 12} height={size - 12} rx={10} fill="var(--color-surface-2)" stroke="var(--color-line)" strokeWidth={1.5} />
          {/* Grid lines */}
          {[1, 2].map((i) => (
            <g key={i} stroke="var(--color-line-2)" strokeWidth={1}>
              <line x1={6 + cell * i} y1={6} x2={6 + cell * i} y2={size - 6} />
              <line x1={6} y1={6 + cell * i} x2={size - 6} y2={6 + cell * i} />
            </g>
          ))}
          {/* Open-space NE highlight (favorable zone) */}
          {vastu.openSpaceNE.value === "open" ? (
            <rect x={6 + cell * 2} y={6} width={cell - 6} height={cell - 6} fill="var(--color-strong-soft)" opacity={0.8} />
          ) : null}
          {/* Brahmasthan center */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={14}
            fill={
              vastu.brahmasthan.value === "obstructed"
                ? "var(--color-concern-soft)"
                : "var(--color-sage-soft)"
            }
            stroke="var(--color-line)"
          />
          {/* Zone markers */}
          {[...byZone.entries()].map(([zone, ms]) => {
            const pos = ZONE_POS[zone];
            const cx = 6 + pos.col * cell + cell / 2;
            const cy = 6 + pos.row * cell + cell / 2;
            return (
              <g key={zone}>
                {ms.map((m, i) => (
                  <g key={`${zone}-${m.label}-${i}`} transform={`translate(${cx}, ${cy + (i - (ms.length - 1) / 2) * 18})`}>
                    <rect
                      x={-30}
                      y={-9}
                      width={60}
                      height={18}
                      rx={9}
                      fill="var(--color-surface)"
                      stroke={m.confident ? "var(--color-forest)" : "var(--color-caution)"}
                      strokeWidth={1.25}
                      strokeDasharray={m.confident ? undefined : "3 2"}
                    />
                    <text x={0} y={3.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-ink)">
                      {m.label}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
          {/* Facing arrow */}
          {facing ? <FacingArrow facing={facing} size={size} /> : null}
          {/* Compass labels */}
          <CompassLabels size={size} />
        </svg>
      </div>

      {/* Legend + honesty note */}
      <div className="mt-3 space-y-1.5 text-xs text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <LegendDot solid label="Confirmed placement" />
          <LegendDot label="Inferred — verify" />
        </div>
        {!allConfident ? (
          <p className="font-medium text-caution">
            Approximate — requires verification. Zone placements are inferred where exact plans aren&apos;t
            available, and should be confirmed against a floor plan or on-site.
          </p>
        ) : null}
        {entrance ? (
          <p>
            Main entrance faces {zoneLabel(entrance)}
            {facing && facing !== entrance ? ` · home faces ${zoneLabel(facing)}` : ""}.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FacingArrow({ facing, size }: { facing: Zone; size: number }) {
  // Arrow points from center outward toward the facing direction.
  const pos = ZONE_POS[facing] ?? ZONE_POS.N;
  const cx = size / 2;
  const cy = size / 2;
  const tx = 6 + pos.col * (size / 3) + size / 6;
  const ty = 6 + pos.row * (size / 3) + size / 6;
  const angle = Math.atan2(ty - cy, tx - cx);
  const len = 44;
  const ex = cx + Math.cos(angle) * len;
  const ey = cy + Math.sin(angle) * len;
  return (
    <g stroke="var(--color-forest)" strokeWidth={2} fill="var(--color-forest)">
      <line x1={cx} y1={cy} x2={ex} y2={ey} />
      <circle
        cx={ex}
        cy={ey}
        r={3.5}
      />
    </g>
  );
}

function CompassLabels({ size }: { size: number }) {
  const labels: { t: string; x: number; y: number }[] = [
    { t: "N", x: size / 2, y: 20 },
    { t: "NE", x: size - 20, y: 24 },
    { t: "E", x: size - 14, y: size / 2 + 4 },
    { t: "SE", x: size - 20, y: size - 16 },
    { t: "S", x: size / 2, y: size - 12 },
    { t: "SW", x: 20, y: size - 16 },
    { t: "W", x: 14, y: size / 2 + 4 },
    { t: "NW", x: 20, y: 24 },
  ];
  return (
    <g>
      {labels.map((l) => (
        <text
          key={l.t}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill="var(--color-muted)"
          letterSpacing="0.05em"
        >
          {l.t}
        </text>
      ))}
    </g>
  );
}

function LegendDot({ label, solid = false }: { label: string; solid?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border"
        style={{
          borderColor: solid ? "var(--color-forest)" : "var(--color-caution)",
          borderStyle: solid ? "solid" : "dashed",
          backgroundColor: solid ? "var(--color-forest)" : "transparent",
        }}
      />
      {label}
    </span>
  );
}
