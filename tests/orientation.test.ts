import { describe, it, expect } from "vitest";
import {
  outwardBearing,
  bearingToCardinal8,
  estimateFromVector,
  enteringBearing,
  isNearSectorBoundary,
  distanceToSectorBoundary,
  candidateCardinals,
  magneticToTrue,
  normDeg,
} from "@/domain/orientation";

// Screen space: y increases downward, so "up" = (0,-1). Default planNorthDeg=0 (up = north).
const UP = { dx: 0, dy: -1 };
const RIGHT = { dx: 1, dy: 0 };
const DOWN = { dx: 0, dy: 1 };
const LEFT = { dx: -1, dy: 0 };
const UP_RIGHT = { dx: 1, dy: -1 };
const DOWN_LEFT = { dx: -1, dy: 1 };

describe("outward vector → compass bearing (up = north)", () => {
  it("maps the cardinal screen directions correctly", () => {
    expect(outwardBearing(UP.dx, UP.dy)).toBe(0); // N
    expect(outwardBearing(RIGHT.dx, RIGHT.dy)).toBe(90); // E
    expect(outwardBearing(DOWN.dx, DOWN.dy)).toBe(180); // S
    expect(outwardBearing(LEFT.dx, LEFT.dy)).toBe(270); // W
  });
  it("maps diagonals", () => {
    expect(outwardBearing(UP_RIGHT.dx, UP_RIGHT.dy)).toBeCloseTo(45); // NE
    expect(outwardBearing(DOWN_LEFT.dx, DOWN_LEFT.dy)).toBeCloseTo(225); // SW
  });
  it("returns null for a zero vector", () => {
    expect(outwardBearing(0, 0)).toBeNull();
  });
});

describe("explicit directional checks from the spec (NEVER reversed)", () => {
  it("an outward arrow pointing north produces north-facing", () => {
    const e = estimateFromVector(UP.dx, UP.dy, 0);
    expect(e.cardinal).toBe("N");
  });
  it("an outward arrow pointing northeast produces northeast-facing", () => {
    const e = estimateFromVector(UP_RIGHT.dx, UP_RIGHT.dy, 0);
    expect(e.cardinal).toBe("NE");
  });
  it("an outward arrow pointing southwest produces southwest-facing", () => {
    const e = estimateFromVector(DOWN_LEFT.dx, DOWN_LEFT.dy, 0);
    expect(e.cardinal).toBe("SW");
  });
  it("facing is NOT the direction faced while entering (opposite)", () => {
    // Outward points north ⇒ facing N; entering (walking in) faces S. Must stay distinct.
    const facing = estimateFromVector(UP.dx, UP.dy, 0).bearingDeg!;
    expect(bearingToCardinal8(facing)).toBe("N");
    expect(bearingToCardinal8(enteringBearing(facing))).toBe("S");
  });
});

describe("rotated plans (north not up)", () => {
  it("when plan-up points east (planNorthDeg=90), an up arrow faces east", () => {
    const e = estimateFromVector(UP.dx, UP.dy, 90);
    expect(e.bearingDeg).toBe(90);
    expect(e.cardinal).toBe("E");
  });
  it("when plan is rotated so up points NW (planNorthDeg=315), a right arrow faces NE", () => {
    // screen right = 90 clockwise from up; up points to 315 ⇒ right points to 315+90=45 = NE
    const e = estimateFromVector(RIGHT.dx, RIGHT.dy, 315);
    expect(e.bearingDeg).toBe(45);
    expect(e.cardinal).toBe("NE");
  });
});

describe("bearingToCardinal8 boundaries", () => {
  it("rounds at sector centers and edges", () => {
    expect(bearingToCardinal8(0)).toBe("N");
    expect(bearingToCardinal8(359)).toBe("N");
    expect(bearingToCardinal8(22)).toBe("N");
    expect(bearingToCardinal8(23)).toBe("NE");
    expect(bearingToCardinal8(337)).toBe("NW"); // N sector starts at 337.5
    expect(bearingToCardinal8(338)).toBe("N");
    expect(bearingToCardinal8(180)).toBe("S");
  });
});

describe("sector boundary uncertainty", () => {
  it("flags a bearing near a boundary as ambiguous", () => {
    expect(isNearSectorBoundary(22.5)).toBe(true); // exact N/NE boundary
    expect(isNearSectorBoundary(0)).toBe(false); // sector center
    expect(distanceToSectorBoundary(0)).toBeCloseTo(22.5);
    expect(distanceToSectorBoundary(22.5)).toBeCloseTo(0);
  });
  it("offers both candidate directions at a boundary", () => {
    const cands = candidateCardinals(22.5, 5);
    expect(cands).toContain("N");
    expect(cands).toContain("NE");
  });
});

describe("north reference conversion", () => {
  it("applies declination for magnetic → true", () => {
    expect(magneticToTrue(10, 5)).toBe(15);
    expect(normDeg(magneticToTrue(358, 5))).toBe(3);
  });
});
