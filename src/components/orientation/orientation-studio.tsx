"use client";

import * as React from "react";
import { Compass, Check, RotateCw, Info } from "lucide-react";
import type { Cardinal8, Zone } from "@/domain/types";
import { CARDINALS } from "@/domain/types";
import { zoneLabel, DIRECTION_LABEL } from "@/domain/directions";
import {
  outwardBearing,
  bearingToCardinal8,
  enteringBearing,
  normDeg,
  isNearSectorBoundary,
  NORTH_TYPE_LABEL,
  NEEDS_CONFIRMATION_LABEL,
  type NorthType,
  type OrientationEstimate,
  type NeedsConfirmationReason,
} from "@/domain/orientation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";

const BOX = 320;
const ZONES: (Zone)[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "CENTER"];

export type OrientationResult = {
  entranceFacing: OrientationEstimate;
  entranceLocationZone: Zone | null;
  buildingFrontage: Cardinal8 | null;
  northType: NorthType;
  planNorthDeg: number;
  needsConfirmation: NeedsConfirmationReason[];
};

type Pt = { x: number; y: number }; // fractions 0..1 of the box

export function OrientationStudio({
  imageUrl,
  onConfirm,
  party = "buyer",
}: {
  imageUrl?: string | null;
  onConfirm: (r: OrientationResult) => void;
  party?: "buyer" | "realtor";
}) {
  // North needle angle, clockwise from "up" (0 = north is up on the plan).
  const [northScreenAngle, setNorthScreenAngle] = React.useState(0);
  const [northConfirmed, setNorthConfirmed] = React.useState(false);
  const [northType, setNorthType] = React.useState<NorthType>("unknown");
  const [door, setDoor] = React.useState<Pt>({ x: 0.5, y: 0.62 });
  const [tip, setTip] = React.useState<Pt>({ x: 0.5, y: 0.28 });
  const [entranceSet, setEntranceSet] = React.useState(false);
  const [zone, setZone] = React.useState<Zone | null>(null);
  const [frontage, setFrontage] = React.useState<Cardinal8 | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);

  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragging = React.useRef<"door" | "tip" | null>(null);

  // plan-up points to this compass bearing (engine convention).
  const planNorthDeg = normDeg(360 - northScreenAngle);
  const dx = (tip.x - door.x) * BOX;
  const dy = (tip.y - door.y) * BOX; // y-down, matches engine
  const bearing = outwardBearing(dx, dy, planNorthDeg);
  const cardinal = bearing == null ? null : bearingToCardinal8(bearing);
  const nearBoundary = bearing != null && isNearSectorBoundary(bearing);

  const needs: NeedsConfirmationReason[] = [];
  if (!northConfirmed) needs.push("no_north");
  if (!entranceSet) needs.push("no_entrance");
  if (nearBoundary) needs.push("near_sector_boundary");

  function ptFromEvent(e: React.PointerEvent): Pt {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const p = ptFromEvent(e);
    if (dragging.current === "door") setDoor(p);
    else setTip(p);
    setConfirmed(false);
  }

  const estimate: OrientationEstimate = {
    bearingDeg: bearing,
    cardinal,
    northType,
    uncertaintyDeg: nearBoundary ? 20 : northConfirmed ? 8 : 25,
    confirmed,
    source: "manual",
  };

  function doConfirm() {
    setConfirmed(true);
    onConfirm({
      entranceFacing: { ...estimate, confirmed: true },
      entranceLocationZone: zone,
      buildingFrontage: frontage,
      northType,
      planNorthDeg,
      needsConfirmation: needs,
    });
  }

  const px = (p: Pt) => ({ cx: p.x * BOX, cy: p.y * BOX });
  const d = px(door);
  const t = px(tip);

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      {/* Canvas */}
      <div className="mx-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOX} ${BOX}`}
          width={BOX}
          height={BOX}
          className="touch-none rounded-lg border border-line bg-surface-2"
          onPointerMove={onMove}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          {imageUrl ? (
            <image href={imageUrl} x={0} y={0} width={BOX} height={BOX} preserveAspectRatio="xMidYMid meet" opacity={0.92} />
          ) : (
            <>
              {[1, 2].map((i) => (
                <g key={i} stroke="var(--color-line-2)">
                  <line x1={(BOX / 3) * i} y1={0} x2={(BOX / 3) * i} y2={BOX} />
                  <line x1={0} y1={(BOX / 3) * i} x2={BOX} y2={(BOX / 3) * i} />
                </g>
              ))}
              <text x={BOX / 2} y={BOX / 2} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
                No plan uploaded — set north &amp; the outward arrow
              </text>
            </>
          )}

          {/* North needle (points where north is on the plan) */}
          <g transform={`translate(${BOX - 40}, 40) rotate(${northScreenAngle})`}>
            <circle r={22} fill="var(--color-surface)" stroke="var(--color-line)" opacity={0.9} />
            <line x1={0} y1={16} x2={0} y2={-16} stroke="var(--color-concern)" strokeWidth={2.5} />
            <polygon points="0,-20 -4,-12 4,-12" fill="var(--color-concern)" />
            <text x={0} y={-24} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--color-concern)">
              N
            </text>
          </g>

          {/* Outward arrow: door (inside) → tip (outside) */}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-forest)" />
            </marker>
          </defs>
          <line x1={d.cx} y1={d.cy} x2={t.cx} y2={t.cy} stroke="var(--color-forest)" strokeWidth={3} markerEnd="url(#arrowhead)" />
          {/* Door handle */}
          <circle
            cx={d.cx}
            cy={d.cy}
            r={9}
            fill="var(--color-forest)"
            stroke="white"
            strokeWidth={2}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              dragging.current = "door";
              setEntranceSet(true);
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          />
          <text x={d.cx} y={d.cy + 22} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--color-forest)">
            Door
          </text>
          {/* Tip handle */}
          <circle
            cx={t.cx}
            cy={t.cy}
            r={8}
            fill="var(--color-surface)"
            stroke="var(--color-forest)"
            strokeWidth={2.5}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              dragging.current = "tip";
              setEntranceSet(true);
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
          />
          <text x={t.cx} y={t.cy - 14} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--color-forest)">
            Outside
          </text>
        </svg>

        <div className="mt-3 flex items-start gap-2 rounded-md border border-[color:var(--color-info-soft)] bg-info-soft/50 p-2.5 text-xs text-ink-2">
          <Info size={14} className="mt-0.5 shrink-0 text-info" aria-hidden />
          <span>
            Stand inside at your main entrance and look outside. Confirm that this arrow points in the
            direction you are looking.
          </span>
        </div>
      </div>

      {/* Controls + readout */}
      <div className="space-y-4">
        {/* Readout */}
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Entrance-facing (outward)</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-3xl font-semibold text-ink">
              {cardinal ? DIRECTION_LABEL[cardinal] : "—"}
            </span>
            <span className="text-sm text-muted">{bearing == null ? "" : `${Math.round(bearing)}°`}</span>
            {confirmed ? <Badge tone="strong">Confirmed</Badge> : <Badge tone="caution">Estimate</Badge>}
          </div>
          {bearing != null ? (
            <p className="mt-1 text-xs text-muted">
              You&apos;d walk in facing {bearingToCardinal8(enteringBearing(bearing))} — the opposite. We score the
              outward direction only.
            </p>
          ) : null}
          {needs.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {needs.map((n) => (
                <li key={n} className="text-xs text-caution">• {NEEDS_CONFIRMATION_LABEL[n]}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-strong">Ready to confirm.</p>
          )}
        </div>

        {/* North */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink inline-flex items-center gap-1.5">
              <Compass size={14} /> Where is North on your plan?
            </span>
            <button
              type="button"
              onClick={() => setNorthScreenAngle(0)}
              className="inline-flex items-center gap-1 text-xs text-forest hover:underline"
            >
              <RotateCw size={12} /> North is up
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            value={northScreenAngle}
            onChange={(e) => {
              setNorthScreenAngle(Number(e.target.value));
              setConfirmed(false);
            }}
            className="mt-2 w-full accent-[color:var(--color-concern)]"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-muted">Rotate the red needle to match the plan&apos;s north arrow ({northScreenAngle}°)</span>
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input type="checkbox" checked={northConfirmed} onChange={(e) => setNorthConfirmed(e.target.checked)} className="h-3.5 w-3.5 accent-[color:var(--color-forest)]" />
              North confirmed
            </label>
          </div>
          <select
            value={northType}
            onChange={(e) => setNorthType(e.target.value as NorthType)}
            className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink"
          >
            {(Object.keys(NORTH_TYPE_LABEL) as NorthType[]).map((k) => (
              <option key={k} value={k}>{NORTH_TYPE_LABEL[k]}</option>
            ))}
          </select>
        </div>

        {/* Separate fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Entrance location (zone)</span>
            <span className="mt-0.5 block text-xs text-muted">Where the door sits — not the same as facing.</span>
            <select value={zone ?? ""} onChange={(e) => setZone((e.target.value || null) as Zone | null)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink">
              <option value="">Unknown</option>
              {ZONES.map((z) => <option key={z} value={z}>{zoneLabel(z)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Building frontage</span>
            <span className="mt-0.5 block text-xs text-muted">The way the front elevation faces.</span>
            <select value={frontage ?? ""} onChange={(e) => setFrontage((e.target.value || null) as Cardinal8 | null)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink">
              <option value="">Unknown</option>
              {CARDINALS.map((c) => <option key={c} value={c}>{DIRECTION_LABEL[c]}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="md" onClick={doConfirm} disabled={bearing == null}>
            <Check size={15} /> Confirm orientation
          </Button>
          {confirmed ? (
            <span className="text-xs text-strong">Saved as {party}-confirmed.</span>
          ) : (
            <span className="text-xs text-muted">Machine estimate until you confirm.</span>
          )}
        </div>
      </div>
    </div>
  );
}
