import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  mapBearing,
  ringCentroid,
  ringAreaSqFt,
  nearestOnPaths,
  pathHeadingNear,
  principalAxes,
  frontageFromStreet,
  openSpaceByDirection,
  openSpaceQuality,
  classifyLotShape,
  type Ring,
  type Pt,
} from "@/providers/gis/geometry";
import { CARDINALS } from "@/domain/types";
import { bearingToCardinal8 } from "@/domain/orientation";

const samples = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/providers/gis/__fixtures__/wake-samples.json", import.meta.url)), "utf8"),
) as {
  streets: { name: string; paths: Pt[][] }[];
  homes: {
    address: string;
    expectedFacingCardinal: string;
    parcelRing: Ring;
    footprintRing: Ring;
  }[];
};

function adjacent(a: string, b: string): boolean {
  if (a === b) return true;
  const i = CARDINALS.indexOf(a as (typeof CARDINALS)[number]);
  const j = CARDINALS.indexOf(b as (typeof CARDINALS)[number]);
  if (i < 0 || j < 0) return false;
  const d = Math.abs(i - j);
  return d === 1 || d === 7;
}

describe("mapBearing (map frame: +x=E, +y=N)", () => {
  it("maps the four cardinals correctly", () => {
    expect(mapBearing(0, 1)).toBe(0); // North
    expect(mapBearing(1, 0)).toBe(90); // East
    expect(mapBearing(0, -1)).toBe(180); // South
    expect(mapBearing(-1, 0)).toBe(270); // West
  });
});

describe("principalAxes", () => {
  it("finds axis-aligned façade normals for an axis-aligned rectangle", () => {
    const rect: Ring = [
      [0, 0],
      [40, 0],
      [40, 20],
      [0, 20],
    ];
    const { normals, elongation } = principalAxes(rect);
    const cardinals = normals.map((b) => bearingToCardinal8(b)).sort();
    expect(cardinals).toEqual(["E", "N", "S", "W"]);
    expect(elongation).toBeGreaterThan(1.5); // 2:1 rectangle
  });
});

describe("frontageFromStreet snaps to the building grid", () => {
  it("returns North when the street is roughly north and the house is axis-aligned", () => {
    const rect: Ring = [
      [0, 0],
      [40, 0],
      [40, 20],
      [0, 20],
    ];
    const f = frontageFromStreet(rect, 10); // street ~N
    expect(f.cardinal).toBe("N");
    expect(f.snapDeg).toBeLessThanOrEqual(10);
  });
});

describe("ring area & centroid", () => {
  it("computes a known rectangle's area and centroid", () => {
    const rect: Ring = [
      [0, 0],
      [40, 0],
      [40, 20],
      [0, 20],
    ];
    expect(ringAreaSqFt(rect)).toBeCloseTo(800, 5);
    const [cx, cy] = ringCentroid(rect);
    expect(cx).toBeCloseTo(20, 5);
    expect(cy).toBeCloseTo(10, 5);
  });
});

describe("lot shape classification", () => {
  it("classifies a near-square parcel as regular", () => {
    const sq: Ring = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    expect(classifyLotShape(sq)).toBe("regular");
  });
  it("classifies a triangle as triangular", () => {
    const tri: Ring = [
      [0, 0],
      [100, 0],
      [50, 90],
    ];
    expect(classifyLotShape(tri)).toBe("triangular");
  });
  it("classifies an L-shaped lot as irregular", () => {
    const l: Ring = [
      [0, 0],
      [100, 0],
      [100, 40],
      [40, 40],
      [40, 100],
      [0, 100],
    ];
    expect(classifyLotShape(l)).toBe("irregular");
  });
});

describe("open space by direction", () => {
  it("reports open NE when the house sits in the SW of the lot", () => {
    const parcel: Ring = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    const house: Ring = [
      [5, 5],
      [35, 5],
      [35, 35],
      [5, 35],
    ];
    const sb = openSpaceByDirection(parcel, house);
    expect(sb.NE).toBeGreaterThan(sb.SW);
    expect(openSpaceQuality(sb, "NE")).toBe("open");
    expect(openSpaceQuality(sb, "SW")).toBe("obstructed");
  });
});

describe("real Wake County homes — frontage matches aerial/street reality", () => {
  const allPaths = samples.streets.flatMap((s) => s.paths);

  for (const home of samples.homes) {
    it(`${home.address} faces ~${home.expectedFacingCardinal}`, () => {
      const centroid = ringCentroid(home.footprintRing);
      const near = nearestOnPaths(centroid, allPaths);
      expect(near).not.toBeNull();
      const toward = mapBearing(near!.point[0] - centroid[0], near!.point[1] - centroid[1]);
      const f = frontageFromStreet(home.footprintRing, toward);
      // Computed façade direction should match the real facing within one sector.
      expect(adjacent(f.cardinal, home.expectedFacingCardinal)).toBe(true);
      // Footprint should be a plausible house (hundreds+ of sq ft) and reasonably rectangular.
      expect(ringAreaSqFt(home.footprintRing)).toBeGreaterThan(800);
    });
  }

  it("derives a sane street heading near a home", () => {
    const h = samples.homes[0]!;
    const centroid = ringCentroid(h.footprintRing);
    const heading = pathHeadingNear(centroid, allPaths);
    expect(heading).not.toBeNull();
    expect(heading!).toBeGreaterThanOrEqual(0);
    expect(heading!).toBeLessThan(180);
  });
});
