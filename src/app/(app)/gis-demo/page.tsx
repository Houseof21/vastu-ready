"use client";

import * as React from "react";
import { Compass, MapPin, Home, AlertTriangle, Loader2, Trees, Route } from "lucide-react";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import type { GisOrientationResult } from "@/providers/gis/orientation-from-gis";
import { NEEDS_CONFIRMATION_LABEL } from "@/domain/orientation";

const EXAMPLES = [
  "2515 Sanderson Dr, Raleigh, NC 27608",
  "2605 Sanderson Dr, Raleigh, NC 27608",
  "2528 Wake Dr, Raleigh, NC 27608",
];

const LOT_LABEL: Record<string, string> = {
  regular: "Regular",
  slightly_irregular: "Slightly irregular",
  irregular: "Irregular",
  triangular: "Triangular",
};
const ROAD_LABEL: Record<string, string> = {
  mid_block: "Mid-block",
  corner: "Corner lot",
  cul_de_sac: "Cul-de-sac",
  t_junction: "T-junction",
  dead_end: "Dead end",
};
const QUALITY_LABEL: Record<string, string> = { open: "Open", moderate: "Moderate", obstructed: "Obstructed" };

export default function GisDemoPage() {
  const [address, setAddress] = React.useState(EXAMPLES[0]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<GisOrientationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run(addr: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/gis-orientation?address=${encodeURIComponent(addr)}`);
      const data = (await res.json()) as GisOrientationResult;
      setResult(data);
      if (!data.ok) setError(data.message);
    } catch {
      setError("Request failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-8">
      <Eyebrow>Proof of concept</Eyebrow>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">GIS orientation — Wake County</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Enter a Raleigh address. We pull the building footprint, parcel boundary, and street centerlines from
        county GIS, then compute the home&apos;s exterior orientation geometrically — no listing feed carries this.
        Entrance-facing is an honest <span className="font-medium text-ink">estimate</span> (the street-facing
        façade) and is flagged for confirmation. Interior room zones need a floor plan and are left unknown.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(address)}
          placeholder="123 Main St, Raleigh, NC"
          className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        />
        <Button variant="primary" onClick={() => run(address)} disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Deriving…
            </span>
          ) : (
            "Derive orientation"
          )}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-xs text-muted">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setAddress(ex);
              run(ex);
            }}
            className="rounded-pill border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2"
          >
            {ex.split(",")[0]}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-[color:var(--color-caution-soft)] bg-caution-soft/50 px-4 py-3 text-sm text-ink-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-caution" /> {error}
        </div>
      ) : null}

      {result?.ok && result.derived && result.orientation ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <Eyebrow>Derived exterior orientation</Eyebrow>
                  <Badge tone="caution">Estimate — needs confirmation</Badge>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-2 border-forest bg-sage-soft">
                    <Compass size={20} className="text-forest" />
                    <span className="mt-0.5 font-display text-xl font-semibold text-forest">
                      {result.derived.facing}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      Faces {result.derived.facing} · {result.derived.facingBearingDeg}°
                    </p>
                    <p className="text-sm text-ink-2">
                      Front elevation faces the street
                      {result.derived.streetName ? ` (${titleCase(result.derived.streetName)})` : ""}. ±
                      {Math.round(result.orientation.entranceFacing.uncertaintyDeg)}° uncertainty.
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Row icon={<Home size={14} />} label="Building frontage" value={result.derived.frontage} />
                  <Row
                    icon={<Route size={14} />}
                    label="Street run"
                    value={result.derived.streetHeadingDeg != null ? `${result.derived.streetHeadingDeg}° axis` : "—"}
                  />
                  <Row icon={<MapPin size={14} />} label="Lot shape" value={LOT_LABEL[result.derived.lotShape] ?? result.derived.lotShape} />
                  <Row icon={<Route size={14} />} label="Road position" value={ROAD_LABEL[result.derived.roadPosition] ?? result.derived.roadPosition} />
                  <Row icon={<Trees size={14} />} label="Open space NE" value={QUALITY_LABEL[result.derived.openSpaceNE] ?? result.derived.openSpaceNE} />
                  <Row icon={<Home size={14} />} label="Footprint" value={`${result.derived.footprintAreaSqFt.toLocaleString()} ft²`} />
                </dl>

                {result.orientation.needsConfirmation.length > 0 ? (
                  <div className="mt-4 rounded-md border border-[color:var(--color-caution-soft)] bg-caution-soft/40 p-3">
                    <p className="text-xs font-semibold text-caution">Needs confirmation</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
                      {result.orientation.needsConfirmation.map((n) => (
                        <li key={n}>• {NEEDS_CONFIRMATION_LABEL[n]}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-muted">
                  Diagnostics: façade-snap {result.derived.snapDeg}°, building elongation{" "}
                  {result.derived.elongation}, street {result.derived.streetDistanceFt >= 0 ? `${result.derived.streetDistanceFt} ft away` : "not found"}.
                  North reference: true (NC State Plane grid, &lt;0.25° off).
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Eyebrow>Parcel facts (Wake County)</Eyebrow>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Row label="Site address" value={titleCase(result.parcel?.siteAddress ?? "—")} />
                  <Row label="Jurisdiction" value={titleCase(result.parcel?.city ?? "—")} />
                  <Row label="Year built" value={result.parcel?.yearBuilt?.toString() ?? "—"} />
                  <Row label="Heated area" value={result.parcel?.heatedAreaSqft ? `${result.parcel.heatedAreaSqft.toLocaleString()} ft²` : "—"} />
                  <Row label="Lot size" value={result.parcel?.deedAcres != null ? `${result.parcel.deedAcres} ac` : "—"} />
                  <Row label="Assessed value" value={result.parcel?.assessedValue ? `$${result.parcel.assessedValue.toLocaleString()}` : "—"} />
                </dl>
                <p className="mt-2 text-xs text-muted">Matched: {result.matchedAddress}</p>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardBody>
                <Eyebrow>Aerial (north up)</Eyebrow>
                {result.aerialUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.aerialUrl}
                    alt="Parcel aerial, north up"
                    className="mt-3 w-full rounded-lg border border-line"
                  />
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  North is up. The front elevation faces {fullDir(result.derived.facing)} toward the street —
                  eyeball it against the roof and driveway.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <Eyebrow>What this does &amp; doesn&apos;t cover</Eyebrow>
                <ul className="mt-3 space-y-2 text-sm text-ink-2">
                  <li>
                    <span className="font-medium text-ink">Covered (geometry):</span> facing, building frontage,
                    street direction, lot shape, road position, open-space direction.
                  </li>
                  <li>
                    <span className="font-medium text-ink">Estimated, confirm per home:</span> which façade is the
                    main entrance (we assume the street-facing one).
                  </li>
                  <li>
                    <span className="font-medium text-ink">Not covered here:</span> interior room zones (kitchen,
                    bedrooms, bath, Brahmasthan) — those need a floor plan aligned to this footprint.
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}
    </Container>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col border-b border-line-2 pb-1.5">
      <dt className="flex items-center gap-1 text-xs text-muted">
        {icon} {label}
      </dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function fullDir(c: string): string {
  const map: Record<string, string> = {
    N: "north", NE: "northeast", E: "east", SE: "southeast",
    S: "south", SW: "southwest", W: "west", NW: "northwest",
  };
  return map[c] ?? c;
}
