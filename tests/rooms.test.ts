import { describe, it, expect } from "vitest";
import { roomZoneFromPosition, buildInteriorVastu, type PlacedRoom } from "@/domain/rooms";

describe("roomZoneFromPosition", () => {
  it("maps the plan center to CENTER", () => {
    expect(roomZoneFromPosition(0.5, 0.5, 0)).toBe("CENTER");
  });
  it("maps the four edges correctly with north up", () => {
    expect(roomZoneFromPosition(0.5, 0.08, 0)).toBe("N");
    expect(roomZoneFromPosition(0.92, 0.5, 0)).toBe("E");
    expect(roomZoneFromPosition(0.5, 0.92, 0)).toBe("S");
    expect(roomZoneFromPosition(0.08, 0.5, 0)).toBe("W");
  });
  it("rotates zones when north is rotated", () => {
    // plan up points east (planNorthDeg = 90) → a marker at the top is to the north-of-plan
    // but compass-north is to the left, so the top marker reads E.
    expect(roomZoneFromPosition(0.5, 0.08, 90)).toBe("E");
  });
});

describe("buildInteriorVastu", () => {
  it("derives placed zones (floorplan source) and leaves unplaced unknown", () => {
    const rooms: PlacedRoom[] = [
      { kind: "kitchen", x: 0.85, y: 0.85 }, // SE
      { kind: "primary_bedroom", x: 0.85, y: 0.15 }, // NE
    ];
    const v = buildInteriorVastu(rooms, 0);
    expect(v.kitchenZone.value).toBe("SE");
    expect(v.kitchenZone.source).toBe("floorplan");
    expect(v.primaryBedroomZone.value).toBe("NE");
    expect(v.staircaseZone.value).toBeNull(); // unplaced stays unknown
    expect(v.brahmasthan.value).toBe("open");
  });
  it("flags the Brahmasthan obstructed when a heavy feature sits in the center", () => {
    const v = buildInteriorVastu([{ kind: "staircase", x: 0.5, y: 0.5 }], 0);
    expect(v.staircaseZone.value).toBe("CENTER");
    expect(v.brahmasthan.value).toBe("obstructed");
  });
  it("returns unknown brahmasthan with no rooms", () => {
    expect(buildInteriorVastu([], 0).brahmasthan.value).toBeNull();
  });
});
