import type { Cardinal8, LotShape } from "@/domain/types";
import { CARDINALS } from "@/domain/types";
import { normDeg, bearingToCardinal8 } from "@/domain/orientation";

/**
 * Pure planar geometry for GIS-derived orientation (Layer 1).
 *
 * Coordinates are a PROJECTED CRS in feet — NC State Plane NAD83 (EPSG:2264 /
 * esri wkid 102719) for Wake County — as [x, y] where +x = East, +y = North.
 * In this projection grid-north differs from true-north by < 0.25° across Wake,
 * far below the 45° Vastu sectors, so we treat grid north as true north.
 *
 * Nothing here touches the network, randomness, or time: it's deterministic and
 * unit-tested against real Raleigh parcels/footprints.
 */

export type Pt = [number, number];
export type Ring = Pt[];

/** Compass bearing (0=N, 90=E, 180=S, 270=W) of a map vector (dx=East, dy=North). */
export function mapBearing(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 0;
  return normDeg((Math.atan2(dx, dy) * 180) / Math.PI);
}

/** Smallest absolute difference between two bearings, in [0, 180]. */
export function bearingDelta(a: number, b: number): number {
  const d = Math.abs(normDeg(a) - normDeg(b)) % 360;
  return d > 180 ? 360 - d : d;
}

function closed(ring: Ring): Ring {
  if (ring.length < 2) return ring;
  const [fx, fy] = ring[0]!;
  const [lx, ly] = ring[ring.length - 1]!;
  return fx === lx && fy === ly ? ring : [...ring, ring[0]!];
}

/** Absolute polygon area (sq ft) via the shoelace formula. */
export function ringAreaSqFt(ring: Ring): number {
  const r = closed(ring);
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const [x1, y1] = r[i]!;
    const [x2, y2] = r[i + 1]!;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Area-weighted polygon centroid. Falls back to vertex mean for degenerate rings. */
export function ringCentroid(ring: Ring): Pt {
  const r = closed(ring);
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const [x1, y1] = r[i]!;
    const [x2, y2] = r[i + 1]!;
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < 1e-6) {
    const n = ring.length;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

/** Squared distance from point p to segment ab, plus the nearest point. */
function nearestOnSegment(p: Pt, a: Pt, b: Pt): { point: Pt; dist2: number } {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const q: Pt = [a[0] + t * abx, a[1] + t * aby];
  const dx = p[0] - q[0];
  const dy = p[1] - q[1];
  return { point: q, dist2: dx * dx + dy * dy };
}

/** Nearest point (and distance in feet) from p to a set of polylines. */
export function nearestOnPaths(p: Pt, paths: Pt[][]): { point: Pt; distance: number } | null {
  let best: { point: Pt; dist2: number } | null = null;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const r = nearestOnSegment(p, path[i]!, path[i + 1]!);
      if (!best || r.dist2 < best.dist2) best = r;
    }
  }
  return best ? { point: best.point, distance: Math.sqrt(best.dist2) } : null;
}

/** Direction a polyline runs at the segment nearest to p, as a bearing in [0,180). */
export function pathHeadingNear(p: Pt, paths: Pt[][]): number | null {
  let best: { dist2: number; seg: [Pt, Pt] } | null = null;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const r = nearestOnSegment(p, path[i]!, path[i + 1]!);
      if (!best || r.dist2 < best.dist2) best = { dist2: r.dist2, seg: [path[i]!, path[i + 1]!] };
    }
  }
  if (!best) return null;
  const [a, b] = best.seg;
  return normDeg(mapBearing(b[0] - a[0], b[1] - a[1])) % 180;
}

/**
 * Principal building axes via PCA of the footprint vertices. Returns the four
 * orthogonal façade-normal bearings (the building "grid"): a rectangular house
 * has façades facing these four directions. `elongation` is the ratio of the
 * two principal spreads (1 = square, higher = more rectangular).
 */
export function principalAxes(footprint: Ring): { normals: number[]; elongation: number } {
  const [cx, cy] = ringCentroid(footprint);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of footprint) {
    const dx = x - cx;
    const dy = y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy); // major-axis angle (math frame)
  const major: Pt = [Math.cos(theta), Math.sin(theta)];
  const b0 = mapBearing(major[0], major[1]);
  const normals = [b0, normDeg(b0 + 90), normDeg(b0 + 180), normDeg(b0 + 270)];
  // eigenvalues of the 2x2 covariance for elongation
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.max(0, (tr * tr) / 4 - det);
  const l1 = tr / 2 + Math.sqrt(disc);
  const l2 = tr / 2 - Math.sqrt(disc);
  const elongation = l2 > 1e-6 ? Math.sqrt(l1 / l2) : Infinity;
  return { normals, elongation };
}

export type Frontage = {
  bearingDeg: number;
  cardinal: Cardinal8;
  /** How far the street direction had to be snapped to a building façade (°). */
  snapDeg: number;
  elongation: number;
};

/**
 * Building frontage: snap the "toward the street" direction to the nearest
 * façade normal of the building. This yields a bearing aligned to the building's
 * own walls (not the raw, noisy building→street vector), which is what a front
 * elevation actually faces.
 */
export function frontageFromStreet(footprint: Ring, towardStreetBearing: number): Frontage {
  const { normals, elongation } = principalAxes(footprint);
  let best = normals[0]!;
  let bestDelta = Infinity;
  for (const n of normals) {
    const d = bearingDelta(n, towardStreetBearing);
    if (d < bestDelta) {
      bestDelta = d;
      best = n;
    }
  }
  return { bearingDeg: best, cardinal: bearingToCardinal8(best), snapDeg: bestDelta, elongation };
}

/** Max projection of a ring's vertices onto a unit direction (reach toward it). */
function reach(ring: Ring, ux: number, uy: number): number {
  let m = -Infinity;
  for (const [x, y] of ring) m = Math.max(m, x * ux + y * uy);
  return m;
}

/**
 * Open space (setback, feet) beyond the building toward each of the 8 compass
 * directions: how much parcel lies past the footprint in that direction. A large
 * value means that side of the lot is open.
 */
export function openSpaceByDirection(parcel: Ring, footprint: Ring): Record<Cardinal8, number> {
  const out = {} as Record<Cardinal8, number>;
  for (let i = 0; i < CARDINALS.length; i++) {
    const bearing = i * 45;
    const rad = (bearing * Math.PI) / 180;
    // unit vector for this compass bearing in map frame (E = sin, N = cos)
    const ux = Math.sin(rad);
    const uy = Math.cos(rad);
    out[CARDINALS[i]!] = reach(parcel, ux, uy) - reach(footprint, ux, uy);
  }
  return out;
}

/** Qualitative open-space rating for one direction vs. the lot's own median setback. */
export function openSpaceQuality(
  setbacks: Record<Cardinal8, number>,
  dir: Cardinal8,
): "open" | "moderate" | "obstructed" {
  const vals = CARDINALS.map((c) => setbacks[c]).sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)]!;
  const v = setbacks[dir];
  if (median <= 0) return "moderate";
  if (v >= median * 1.25) return "open";
  if (v <= median * 0.6) return "obstructed";
  return "moderate";
}

/**
 * Classify lot shape from the parcel polygon. Uses the fill ratio against the
 * minimum-area oriented bounding box plus corner count. Deterministic, coarse,
 * and intentionally conservative.
 */
export function classifyLotShape(parcel: Ring): LotShape {
  const ring = dedupeClose(parcel);
  const corners = significantCorners(ring);
  const area = ringAreaSqFt(ring);
  const obb = minAreaRectArea(ring);
  const fill = obb > 0 ? area / obb : 1;

  if (corners <= 3) return "triangular";
  if (corners === 4 && fill >= 0.9) return "regular";
  if (fill >= 0.82 && corners <= 6) return "slightly_irregular";
  return "irregular";
}

function dedupeClose(ring: Ring): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1) out.push(p);
  }
  if (out.length > 1) {
    const [fx, fy] = out[0]!;
    const [lx, ly] = out[out.length - 1]!;
    if (Math.hypot(fx - lx, fy - ly) <= 1) out.pop();
  }
  return out;
}

/** Count vertices whose interior turn is sharper than ~20° (true corners). */
function significantCorners(ring: Ring): number {
  const n = ring.length;
  if (n < 3) return n;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n]!;
    const b = ring[i]!;
    const c = ring[(i + 1) % n]!;
    const v1x = b[0] - a[0];
    const v1y = b[1] - a[1];
    const v2x = c[0] - b[0];
    const v2y = c[1] - b[1];
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    if (m1 < 1 || m2 < 1) continue;
    const cos = (v1x * v2x + v1y * v2y) / (m1 * m2);
    const turn = Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    if (turn > 20) count++;
  }
  return count;
}

/** Area of the minimum-area bounding rectangle (rotating calipers over the hull). */
function minAreaRectArea(ring: Ring): number {
  const hull = convexHull(ring);
  if (hull.length < 3) return 0;
  let best = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len < 1e-6) continue;
    const ux = ex / len;
    const uy = ey / len;
    // perpendicular
    const px = -uy;
    const py = ux;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * ux + y * uy;
      const v = x * px + y * py;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    best = Math.min(best, (maxU - minU) * (maxV - minV));
  }
  return best === Infinity ? 0 : best;
}

/** Andrew's monotone chain convex hull. */
function convexHull(points: Ring): Ring {
  const pts = dedupeClose(points)
    .slice()
    .sort((p, q) => (p[0] === q[0] ? p[1] - q[1] : p[0] - q[0]));
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Ring = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Ring = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
