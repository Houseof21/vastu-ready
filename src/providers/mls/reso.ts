import type { HotSheetEvent, HotSheetListing, HotSheetChangeType } from "@/domain/hotsheet";
import { listingKey } from "@/domain/hotsheet";

/**
 * RESO Web API (Data Dictionary) Property record → hot-sheet listing/event.
 *
 * Uses standard RESO field names so this works against any RESO-certified feed
 * (Trestle, Bridge, …). Agent-only fields (PrivateRemarks, ShowingInstructions)
 * are carried through on the listing and stripped for client views downstream.
 * Pure and deterministic — unit-tested without a live feed.
 */

export type ResoProperty = {
  ListingKey?: string;
  ListingId?: string;
  UnparsedAddress?: string;
  StreetNumber?: string;
  StreetDirPrefix?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City?: string;
  StateOrProvince?: string;
  PostalCode?: string;
  ListPrice?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeAcres?: number;
  YearBuilt?: number;
  StandardStatus?: string;
  PublicRemarks?: string;
  PrivateRemarks?: string;
  ShowingInstructions?: string;
  ModificationTimestamp?: string;
  Latitude?: number;
  Longitude?: number;
};

function composedAddress(r: ResoProperty): string {
  if (r.UnparsedAddress && r.UnparsedAddress.trim()) return r.UnparsedAddress.trim();
  const line = [r.StreetNumber, r.StreetDirPrefix, r.StreetName, r.StreetSuffix].filter(Boolean).join(" ").trim();
  const tail = [r.City, r.StateOrProvince, r.PostalCode].filter(Boolean).join(", ");
  return [line, tail].filter(Boolean).join(", ") || "Address unavailable";
}

export function resoToListing(r: ResoProperty, sourceMls: string): HotSheetListing | null {
  const sourceId = r.ListingKey || r.ListingId;
  if (!sourceId) return null;
  const updatedAt = r.ModificationTimestamp ? Date.parse(r.ModificationTimestamp) : Date.now();
  return {
    key: listingKey(sourceMls, sourceId),
    sourceMls,
    sourceId,
    address: composedAddress(r),
    price: typeof r.ListPrice === "number" ? r.ListPrice : 0,
    beds: typeof r.BedroomsTotal === "number" ? r.BedroomsTotal : 0,
    baths: typeof r.BathroomsTotalInteger === "number" ? r.BathroomsTotalInteger : 0,
    sqft: typeof r.LivingArea === "number" ? r.LivingArea : 0,
    status: r.StandardStatus || "Unknown",
    updatedAt: Number.isNaN(updatedAt) ? Date.now() : updatedAt,
    privateRemarks: r.PrivateRemarks,
    showingInstructions: r.ShowingInstructions,
    demo: false, // real feed data is never demo
  };
}

export function resoToEvent(
  r: ResoProperty,
  sourceMls: string,
  changeType: HotSheetChangeType = "update",
): HotSheetEvent | null {
  const listing = resoToListing(r, sourceMls);
  if (!listing) return null;
  return {
    eventId: `${listing.key}:${listing.updatedAt}:${changeType}`,
    sourceMls,
    sourceId: listing.sourceId,
    changeType,
    at: listing.updatedAt,
    listing,
  };
}

/** Map a RESO OData `value` array to hot-sheet events. */
export function resoBatchToEvents(records: ResoProperty[], sourceMls: string): HotSheetEvent[] {
  return records.map((r) => resoToEvent(r, sourceMls)).filter((e): e is HotSheetEvent => e != null);
}
