import type { Cardinal8 } from "./types";
import type { Priority } from "./profile";
import type { Property } from "./property";

/**
 * Saved searches. Hard requirements are ENFORCED (a home that misses one is not
 * a match); flexible preferences only influence ranking. Notification choices
 * are stored, but the app must not present alerts as active functionality unless
 * they are actually implemented (see SavedSearch.notify + the UI's demo labels).
 */

export type NotificationChoice = "off" | "instant" | "daily";

export const NOTIFY_LABEL: Record<NotificationChoice, string> = {
  off: "No alerts",
  instant: "Instant alerts",
  daily: "Daily digest",
};

export type HardCriteria = {
  maxBudget: number | null;
  minBeds: number | null;
  minBaths: number | null;
  minSqft: number | null;
  minLotAcres: number | null;
  maxDriveMinutes: number | null;
  /** Empty = any facing acceptable. */
  acceptableFacings: Cardinal8[];
};

export type FlexibleCriteria = {
  priorities: Priority[];
  preferredAreas: string[];
  preferredStyles: string[];
};

export type SavedSearch = {
  id: string;
  name: string;
  hard: HardCriteria;
  flexible: FlexibleCriteria;
  notify: NotificationChoice;
  /** Buyer workspace this search belongs to (client-realtor shared), if any. */
  workspaceId: string | null;
  createdAt: number;
  updatedAt: number;
};

export function emptyHard(): HardCriteria {
  return {
    maxBudget: null,
    minBeds: null,
    minBaths: null,
    minSqft: null,
    minLotAcres: null,
    maxDriveMinutes: null,
    acceptableFacings: [],
  };
}

export function emptySavedSearch(id: string): SavedSearch {
  const now = Date.now();
  return {
    id,
    name: "",
    hard: emptyHard(),
    flexible: { priorities: [], preferredAreas: [], preferredStyles: [] },
    notify: "off",
    workspaceId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Does a property satisfy this search's HARD requirements? Missing data is
 * treated as "unknown" and never silently passes a requirement that depends on
 * it (e.g., a null commute fails a maxDriveMinutes requirement).
 */
export function matchesHard(search: SavedSearch, p: Property, facing: Cardinal8 | null): boolean {
  const h = search.hard;
  if (h.maxBudget != null && !(p.price > 0 && p.price <= h.maxBudget)) return false;
  if (h.minBeds != null && !(p.beds >= h.minBeds)) return false;
  if (h.minBaths != null && !(p.baths >= h.minBaths)) return false;
  if (h.minSqft != null && !(p.sqft >= h.minSqft)) return false;
  if (h.minLotAcres != null && !(p.lotAcres >= h.minLotAcres)) return false;
  if (h.maxDriveMinutes != null) {
    if (p.driveMinutes == null) return false; // unknown commute can't satisfy a cap
    if (!(p.driveMinutes <= h.maxDriveMinutes)) return false;
  }
  if (h.acceptableFacings.length > 0) {
    if (facing == null) return false; // unknown facing can't satisfy a facing requirement
    if (!h.acceptableFacings.includes(facing)) return false;
  }
  return true;
}

/** Short human description of the hard criteria, for cards. */
export function describeSearch(s: SavedSearch): string {
  const h = s.hard;
  const parts: string[] = [];
  if (h.maxBudget != null) parts.push(`≤ $${Math.round(h.maxBudget / 1000)}k`);
  if (h.minBeds != null) parts.push(`${h.minBeds}+ bd`);
  if (h.minBaths != null) parts.push(`${h.minBaths}+ ba`);
  if (h.minLotAcres != null) parts.push(`${h.minLotAcres}+ ac`);
  if (h.maxDriveMinutes != null) parts.push(`≤ ${h.maxDriveMinutes} min`);
  if (h.acceptableFacings.length) parts.push(`${h.acceptableFacings.join("/")} facing`);
  return parts.length ? parts.join(" · ") : "Any home";
}
