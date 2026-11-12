import type { HotSheetEvent, HotSheetListing, HotSheetChangeType } from "@/domain/hotsheet";
import { listingKey } from "@/domain/hotsheet";
import type { ListingFacts } from "@/domain/listing";

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
  /** Present when the query used $expand=Media. */
  Media?: ResoMedia[];
};

/**
 * RESO Media resource record. Floor plans are carried as Media with
 * MediaCategory "Floor Plan" (RESO Data Dictionary enum); photos as "Photo".
 */
export type ResoMedia = {
  MediaKey?: string;
  MediaURL?: string;
  MediaCategory?: string;
  Order?: number;
  ShortDescription?: string;
  MimeType?: string;
  /** Some feeds flag the preferred/hero image. */
  PreferredPhotoYN?: boolean;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function isFloorPlan(m: ResoMedia): boolean {
  const cat = (m.MediaCategory ?? "").toLowerCase();
  const desc = (m.ShortDescription ?? "").toLowerCase();
  return /floor\s*plan/.test(cat) || /floor\s*plan/.test(desc);
}

function isPhoto(m: ResoMedia): boolean {
  const cat = (m.MediaCategory ?? "").toLowerCase();
  // Default-to-photo when uncategorized but a URL exists; never count floor plans.
  if (isFloorPlan(m)) return false;
  return cat === "" || cat.includes("photo") || cat.includes("image");
}

/**
 * Map a RESO Property record (optionally with expanded Media) to the normalized
 * ListingFacts the cross-reference engine consumes. Pure and deterministic.
 * Returns null without a usable listing key. Never fabricates missing facts —
 * absent fields stay null.
 */
export function resoPropertyToFacts(r: ResoProperty, media: ResoMedia[] = []): ListingFacts | null {
  const key = r.ListingKey || r.ListingId;
  if (!key) return null;

  const all = media.length ? media : r.Media ?? [];
  const floorPlan = all.find(isFloorPlan);
  const photos = all
    .filter(isPhoto)
    .filter((m) => typeof m.MediaURL === "string" && m.MediaURL)
    .sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0))
    .map((m) => m.MediaURL as string);

  const lat = num(r.Latitude);
  const lng = num(r.Longitude);
  const updated = r.ModificationTimestamp ? Date.parse(r.ModificationTimestamp) : Date.now();

  return {
    listingKey: key,
    sourceMls: "", // filled by caller (which MLS this came from)
    status: r.StandardStatus || "Unknown",
    listPrice: num(r.ListPrice),
    beds: num(r.BedroomsTotal),
    baths: num(r.BathroomsTotalInteger),
    sqft: num(r.LivingArea),
    lotAcres: num(r.LotSizeAcres),
    yearBuilt: num(r.YearBuilt),
    coords: lat != null && lng != null ? { lat, lng } : null,
    address: composedAddress(r),
    floorPlanUrl: floorPlan?.MediaURL ?? null,
    photoUrls: photos,
    updatedAt: Number.isNaN(updated) ? Date.now() : updated,
  };
}

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
