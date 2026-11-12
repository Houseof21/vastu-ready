"use client";

import * as React from "react";
import { DoorOpen, Upload, Info } from "lucide-react";
import { Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { RoomZoneStudio } from "./room-zone-studio";
import { buildInteriorVastu, type PlacedRoom } from "@/domain/rooms";
import { zoneLabel } from "@/domain/directions";
import type { Property } from "@/domain/property";

/**
 * Report card for mapping interior room zones from a floor plan. Opens the
 * Room-Zone Studio over the plan (or an uploaded one), derives each room's zone
 * from where it's placed relative to the confirmed north, and writes the result
 * to the property's Vastu. Automated pre-suggestion is a listed dependency
 * (a configured vision model); until then this is the honest, user-placed path.
 */
export function InteriorRoomsCard({ property }: { property: Property }) {
  const { upsertProperty, role } = useUserState();
  const [editing, setEditing] = React.useState(false);
  const [uploaded, setUploaded] = React.useState<string | null>(null);

  const party: "buyer" | "realtor" = role === "realtor" ? "realtor" : "buyer";
  const planNorthDeg = property.orientation?.planNorthDeg ?? 0;
  const northConfirmed = property.orientation?.entranceFacing.confirmed ?? false;
  // A manual entry's floorPlanDataUrl is a real floor plan; a GIS home's is the aerial.
  const defaultPlan = property.source === "manual" ? property.floorPlanDataUrl ?? null : null;
  const planImage = uploaded ?? defaultPlan;

  const v = property.vastu;
  const known = (
    [
      ["Kitchen", v.kitchenZone.value],
      ["Primary bedroom", v.primaryBedroomZone.value],
      ["Bathroom(s)", v.bathroomZones.value ? v.bathroomZones.value.join(", ") : null],
      ["Staircase", v.staircaseZone.value],
      ["Garage", v.garageZone.value],
      ["Center", v.brahmasthan.value],
    ] as const
  ).filter(([, val]) => val != null);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploaded(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function onSave(rooms: PlacedRoom[]) {
    const interior = buildInteriorVastu(rooms, planNorthDeg);
    const orientation = property.orientation
      ? {
          ...property.orientation,
          activity: [
            ...property.orientation.activity,
            { at: Date.now(), by: party, action: `Mapped ${rooms.length} interior room${rooms.length === 1 ? "" : "s"} from the floor plan` },
          ],
        }
      : property.orientation;
    upsertProperty({ ...property, vastu: { ...property.vastu, ...interior }, orientation });
    setEditing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Eyebrow>Interior rooms</Eyebrow>
        {known.length > 0 ? <Badge tone="good">{known.length} mapped</Badge> : <Badge tone="caution">Not mapped</Badge>}
      </div>

      {known.length > 0 ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {known.map(([label, val]) => (
            <div key={label} className="flex justify-between border-b border-line-2 pb-1">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium text-ink">{label === "Center" ? String(val) : zoneLabel(val as never)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-ink-2">
          No interior room zones yet. Map them from a floor plan — kitchen, bedrooms, bath, staircase, garage —
          and the Vastu analysis fills in.
        </p>
      )}

      {!northConfirmed ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-caution">
          <Info size={13} className="mt-0.5 shrink-0" /> Confirm the orientation first so room zones use the real north.
        </p>
      ) : null}

      {!editing ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setEditing(true)}>
          <DoorOpen size={14} /> {known.length > 0 ? "Re-map rooms" : "Map interior rooms"}
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Room-zone studio</Eyebrow>
            <button onClick={() => setEditing(false)} className="text-xs text-muted hover:text-ink">Cancel</button>
          </div>
          {!planImage ? (
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-surface px-3 py-2 text-sm text-ink-2 hover:bg-surface-2">
              <Upload size={14} /> Upload a floor plan to map against
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          ) : null}
          <div className="mt-3">
            <RoomZoneStudio imageUrl={planImage} planNorthDeg={planNorthDeg} northConfirmed={northConfirmed} onSave={onSave} />
          </div>
          {planImage ? (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-forest hover:underline">
              <Upload size={12} /> Replace plan
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          ) : null}
        </div>
      )}
    </div>
  );
}
