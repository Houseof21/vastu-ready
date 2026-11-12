"use client";

import * as React from "react";
import { Compass, Check } from "lucide-react";
import { Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OrientationSummary } from "./orientation-summary";
import { OrientationStudio, type OrientationResult, type OrientationSeed } from "./orientation-studio";
import { useUserState } from "@/components/providers/user-state";
import { normDeg, type StoredOrientation } from "@/domain/orientation";
import type { Property } from "@/domain/property";

/**
 * Report-side orientation panel. Shows the current orientation and, when it's an
 * unconfirmed estimate (e.g. GIS-derived), lets the person open the Studio
 * pre-seeded with that estimate to confirm it against the aerial. Confirming
 * writes a user-confirmed orientation back to the stored property and upgrades
 * the coarse facing so the report re-scores with verified provenance.
 */
export function OrientationConfirm({ property }: { property: Property }) {
  const { upsertProperty, role } = useUserState();
  const [editing, setEditing] = React.useState(false);
  const o = property.orientation;
  if (!o) return null;

  const party: "buyer" | "realtor" = role === "realtor" ? "realtor" : "buyer";
  const confirmed = o.entranceFacing.confirmed;

  const seed: OrientationSeed = {
    outwardBearingDeg: o.entranceFacing.bearingDeg,
    northScreenAngle: normDeg(360 - (o.planNorthDeg ?? 0)),
    northConfirmed: o.northType !== "unknown",
    northType: o.northType,
    frontage: o.buildingFrontage,
    zone: o.entranceLocationZone,
  };

  function onConfirm(r: OrientationResult) {
    const facing = r.entranceFacing.cardinal;
    const updatedOrientation: StoredOrientation = {
      entranceFacing: r.entranceFacing,
      entranceLocationZone: r.entranceLocationZone,
      buildingFrontage: r.buildingFrontage,
      streetDirection: o!.streetDirection,
      northType: r.northType,
      planNorthDeg: r.planNorthDeg,
      needsConfirmation: r.needsConfirmation,
      evidence: o!.evidence,
      activity: [
        ...o!.activity,
        {
          at: Date.now(),
          by: party,
          action: `Confirmed entrance-facing ${facing ?? "unknown"} (${Math.round(r.entranceFacing.bearingDeg ?? 0)}°)`,
        },
      ],
    };
    upsertProperty({
      ...property,
      orientation: updatedOrientation,
      vastu: {
        ...property.vastu,
        facingDirection: facing
          ? { value: facing, confidence: 0.92, source: "manual" }
          : property.vastu.facingDirection,
      },
    });
    setEditing(false);
  }

  return (
    <div>
      <OrientationSummary orientation={o} />

      {!confirmed ? (
        <div className="mt-3">
          {!editing ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Compass size={14} /> Confirm orientation
            </Button>
          ) : (
            <div className="rounded-lg border border-line bg-surface-2 p-3">
              <div className="flex items-center justify-between">
                <Eyebrow>Confirm entrance</Eyebrow>
                <button onClick={() => setEditing(false)} className="text-xs text-muted hover:text-ink">Cancel</button>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                The arrow is pre-pointed at the estimated facing on the north-up aerial. Stand at the main
                entrance, look outside, and adjust the arrow to match — then confirm.
              </p>
              <div className="mt-3">
                <OrientationStudio imageUrl={property.floorPlanDataUrl} onConfirm={onConfirm} seed={seed} party={party} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-strong">
          <Check size={13} /> Orientation confirmed by {party}.
        </p>
      )}
    </div>
  );
}

export function OrientationBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed ? <Badge tone="strong">Confirmed</Badge> : <Badge tone="caution">Estimate</Badge>;
}
