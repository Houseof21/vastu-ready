"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { normDeg } from "@/domain/orientation";
import { zoneLabel } from "@/domain/directions";
import { roomZoneFromPosition, ROOM_LABEL, CENTER_RADIUS, type RoomKind, type PlacedRoom } from "@/domain/rooms";

const BOX = 320;
const KINDS: RoomKind[] = ["kitchen", "primary_bedroom", "bathroom", "staircase", "garage"];
const DOT_COLORS: Record<RoomKind, string> = {
  kitchen: "#c2641d",
  primary_bedroom: "#2f6f4e",
  bathroom: "#2563a8",
  staircase: "#7a5bd0",
  garage: "#777",
};

/**
 * Place each room on the floor plan; its cardinal zone is derived from its
 * position relative to the plan center and the confirmed north. User-placed
 * (source "floorplan"), never inferred — an unplaced room stays unknown.
 */
export function RoomZoneStudio({
  imageUrl,
  planNorthDeg,
  northConfirmed = false,
  initial = [],
  onSave,
}: {
  imageUrl?: string | null;
  planNorthDeg: number;
  northConfirmed?: boolean;
  initial?: PlacedRoom[];
  onSave: (rooms: PlacedRoom[]) => void;
}) {
  const [rooms, setRooms] = React.useState<PlacedRoom[]>(initial);
  const [selected, setSelected] = React.useState<RoomKind>("kitchen");
  const svgRef = React.useRef<SVGSVGElement>(null);
  const northScreenAngle = normDeg(360 - planNorthDeg);

  function place(e: React.MouseEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setRooms((prev) => {
      const without = prev.filter((rm) => rm.kind !== selected);
      return [...without, { kind: selected, x, y }];
    });
  }

  function remove(kind: RoomKind) {
    setRooms((prev) => prev.filter((r) => r.kind !== kind));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <div className="mx-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOX} ${BOX}`}
          width={BOX}
          height={BOX}
          className="cursor-crosshair touch-none rounded-lg border border-line bg-surface-2"
          onClick={place}
        >
          {imageUrl ? (
            <image href={imageUrl} x={0} y={0} width={BOX} height={BOX} preserveAspectRatio="xMidYMid meet" opacity={0.9} />
          ) : (
            <>
              {[1, 2].map((i) => (
                <g key={i} stroke="var(--color-line-2)">
                  <line x1={(BOX / 3) * i} y1={0} x2={(BOX / 3) * i} y2={BOX} />
                  <line x1={0} y1={(BOX / 3) * i} x2={BOX} y2={(BOX / 3) * i} />
                </g>
              ))}
              <text x={BOX / 2} y={18} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
                No plan — grid shown for reference
              </text>
            </>
          )}

          {/* Center (Brahmasthan) zone */}
          <circle cx={BOX / 2} cy={BOX / 2} r={CENTER_RADIUS * BOX} fill="none" stroke="var(--color-line)" strokeDasharray="4 3" />
          <text x={BOX / 2} y={BOX / 2 - CENTER_RADIUS * BOX - 4} textAnchor="middle" fontSize={9} fill="var(--color-muted)">center</text>

          {/* North needle */}
          <g transform={`translate(${BOX - 34}, 34) rotate(${northScreenAngle})`}>
            <circle r={18} fill="var(--color-surface)" stroke="var(--color-line)" opacity={0.9} />
            <line x1={0} y1={12} x2={0} y2={-12} stroke="var(--color-concern)" strokeWidth={2} />
            <polygon points="0,-16 -3,-9 3,-9" fill="var(--color-concern)" />
            <text x={0} y={-19} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--color-concern)">N</text>
          </g>

          {/* Placed rooms */}
          {rooms.map((r) => (
            <g key={r.kind} onClick={(e) => { e.stopPropagation(); setSelected(r.kind); }}>
              <circle cx={r.x * BOX} cy={r.y * BOX} r={8} fill={DOT_COLORS[r.kind]} stroke="white" strokeWidth={2} />
              <text x={r.x * BOX} y={r.y * BOX - 12} textAnchor="middle" fontSize={9} fontWeight={600} fill={DOT_COLORS[r.kind]}>
                {ROOM_LABEL[r.kind]}
              </text>
            </g>
          ))}
        </svg>
        <p className="mt-2 text-xs text-muted">
          Pick a room, then click where it is on the plan. {northConfirmed ? "North is confirmed." : "Confirm orientation first for accurate zones — north is assumed up."}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-ink">Rooms</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium ${selected === k ? "border-forest bg-sage-soft text-forest" : "border-line text-ink-2 hover:bg-surface-2"}`}
              >
                {ROOM_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Placed rooms &amp; zones</p>
          {rooms.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">None placed yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {rooms.map((r) => (
                <li key={r.kind} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DOT_COLORS[r.kind] }} />
                    {ROOM_LABEL[r.kind]}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone="neutral">{zoneLabel(roomZoneFromPosition(r.x, r.y, planNorthDeg))}</Badge>
                    <button onClick={() => remove(r.kind)} className="text-xs text-muted hover:text-concern">remove</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button size="md" onClick={() => onSave(rooms)} disabled={rooms.length === 0}>
          <Check size={15} /> Save room zones
        </Button>
      </div>
    </div>
  );
}
