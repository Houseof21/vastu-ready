/** Maps / drive-time abstraction. Swap in Mapbox or Google later. */

export type LatLng = { lat: number; lng: number };

export interface MapsProvider {
  readonly id: string;
  readonly isMock: boolean;
  driveMinutes(from: LatLng, to: LatLng): Promise<number | null>;
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line estimate with an urban road factor (deterministic). */
export const MockMapsProvider: MapsProvider = {
  id: "mock",
  isMock: true,
  async driveMinutes(from, to) {
    const miles = haversineMiles(from, to);
    // ~1.35 road factor, ~1.9 min/mile in suburban Raleigh + 3 min base.
    return Math.round(3 + miles * 1.35 * 1.9);
  },
};

export function getMapsProvider(): MapsProvider {
  // Mapbox/Google adapters branch on env here; mock otherwise.
  return MockMapsProvider;
}
