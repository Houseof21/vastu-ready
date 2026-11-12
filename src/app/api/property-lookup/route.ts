import { NextResponse } from "next/server";
import { deriveOrientationFromAddress } from "@/providers/gis/orientation-from-gis";
import { gisResultToProperty } from "@/providers/gis/to-property";
import { resolveListingByAddress } from "@/providers/mls";
import { crossReferenceListing } from "@/domain/cross-reference";
import { parseAddress } from "@/domain/listing";
import type { AddressQuery } from "@/providers/mls";
import type { MlsContext } from "@/providers/mls";

/**
 * Single-address property lookup: derive exterior orientation from county/GIS,
 * then (when a licensed MLS feed is connected) cross-reference the listing to
 * fill beds/baths, corroborate sqft/year/lot, pull the floor plan, and re-anchor
 * the exact house. Runs only on the server so MLS secrets never reach the client.
 *
 * Honest: without a connected feed the response still returns the GIS property,
 * with `listing.connected: false` so the UI can offer the manual path — nothing
 * is fabricated or scraped.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// System identity for the public lookup. The env-configured Trestle (Doorify)
// credentials, if present, back this; otherwise the resolver reports not-connected.
const LOOKUP_CTX: MlsContext = { ownerKey: "system", mlsKey: "doorify", scope: null };
const PROVIDER_KEY = "trestle";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ ok: false, stage: "geocode", message: "Provide ?address=" }, { status: 400 });
  }

  try {
    const gis = await deriveOrientationFromAddress(address);
    const baseProperty = gis.ok ? gisResultToProperty(gis) : null;

    // Try the licensed feed for listing facts (beds/baths/floor plan).
    let property = baseProperty;
    let crossRef = null;
    const parsed = parseAddress(address);
    const query: AddressQuery = {
      raw: address,
      streetNumber: parsed.streetNumber,
      streetName: parsed.streetName,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip ?? gis.parcel?.zip ?? null,
      lat: gis.coords?.lat ?? null,
      lng: gis.coords?.lng ?? null,
    };
    const listing = await resolveListingByAddress(PROVIDER_KEY, LOOKUP_CTX, query);

    if (baseProperty && listing.found && listing.facts) {
      const merged = crossReferenceListing(baseProperty, listing.facts);
      property = merged.property;
      crossRef = merged.crossRef;
    }

    // Non-secret summary of the listing attempt for the UI.
    const listingStatus = {
      connected: listing.connected,
      found: listing.found,
      message: listing.message,
      candidatesConsidered: listing.candidatesConsidered,
    };

    return NextResponse.json(
      { ok: gis.ok, gis, property, crossRef, listing: listingStatus },
      { status: gis.ok ? 200 : 422 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, stage: "error", message: `Property lookup failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
