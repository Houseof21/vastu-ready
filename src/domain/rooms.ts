import type { Zone, BrahmasthanCondition, PropertyVastu, VastuAttribute } from "./types";
import { outwardBearing, bearingToCardinal8 } from "./orientation";

/**
 * Interior room zones from a floor plan.
 *
 * The person places each room on their plan; we derive its cardinal zone
 * geometrically from the marker's position relative to the plan center and the
 * confirmed north. This is user-placed evidence (source "floorplan"), never an
 * inference — a room with no marker stays unknown. The Brahmasthan (center)
 * condition is derived from whether a heavy feature sits in the center zone.
 */

export type RoomKind = "kitchen" | "primary_bedroom" | "bathroom" | "staircase" | "garage";

export const ROOM_LABEL: Record<RoomKind, string> = {
  kitchen: "Kitchen",
  primary_bedroom: "Primary bedroom",
  bathroom: "Bathroom",
  staircase: "Staircase",
  garage: "Garage",
};

export type PlacedRoom = { kind: RoomKind; x: number; y: number }; // x,y are fractions 0..1 of the plan

/** Markers within this radius of the plan center are the center (Brahmasthan) zone. */
export const CENTER_RADIUS = 0.14;

/** Cardinal/CENTER zone of a point on the plan, given where north points. */
export function roomZoneFromPosition(x: number, y: number, planNorthDeg: number): Zone {
  const dx = x - 0.5;
  const dy = y - 0.5; // screen y-down, matches the engine's outwardBearing
  if (Math.hypot(dx, dy) < CENTER_RADIUS) return "CENTER";
  const bearing = outwardBearing(dx, dy, planNorthDeg);
  return bearing == null ? "CENTER" : bearingToCardinal8(bearing);
}

export type InteriorVastu = Pick<
  PropertyVastu,
  "kitchenZone" | "primaryBedroomZone" | "bathroomZones" | "staircaseZone" | "garageZone" | "brahmasthan"
>;

function fp<T>(v: T | null, confidence: number): VastuAttribute<T> {
  return v == null ? { value: null, confidence: 0, source: "unknown" } : { value: v, confidence, source: "floorplan" };
}

/** Build the interior Vastu attributes from placed room markers. */
export function buildInteriorVastu(rooms: PlacedRoom[], planNorthDeg: number, confidence = 0.85): InteriorVastu {
  const zoneOf = (k: RoomKind): Zone | null => {
    const r = rooms.find((rm) => rm.kind === k);
    return r ? roomZoneFromPosition(r.x, r.y, planNorthDeg) : null;
  };
  const bathZones = rooms
    .filter((r) => r.kind === "bathroom")
    .map((r) => roomZoneFromPosition(r.x, r.y, planNorthDeg));

  // Brahmasthan: a heavy feature in the center obstructs it.
  const centerObstructed = rooms.some(
    (r) => (r.kind === "kitchen" || r.kind === "staircase" || r.kind === "bathroom") &&
      roomZoneFromPosition(r.x, r.y, planNorthDeg) === "CENTER",
  );
  const brahmasthan: BrahmasthanCondition = centerObstructed ? "obstructed" : "open";

  return {
    kitchenZone: fp(zoneOf("kitchen"), confidence),
    primaryBedroomZone: fp(zoneOf("primary_bedroom"), confidence),
    bathroomZones: bathZones.length
      ? { value: bathZones, confidence, source: "floorplan" }
      : { value: null, confidence: 0, source: "unknown" },
    staircaseZone: fp(zoneOf("staircase"), confidence),
    garageZone: fp(zoneOf("garage"), confidence),
    brahmasthan:
      rooms.length === 0
        ? { value: null, confidence: 0, source: "unknown" }
        : { value: brahmasthan, confidence: 0.7, source: "floorplan" },
  };
}
