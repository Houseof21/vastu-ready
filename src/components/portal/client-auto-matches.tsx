"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Plus, Check, Compass } from "lucide-react";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { useScoredFeed } from "@/lib/use-scored";
import { autoMatch, FACING_FIT_LABEL, type FacingFit } from "@/domain/auto-match";
import { describeSearch } from "@/domain/search";
import { formatUsd } from "@/lib/format";
import type { WorkspaceActor } from "@/domain/workspace";

/**
 * Per-client auto-matched shortlist. Runs the auto-match engine over available
 * inventory against the buyer's linked saved search — ranked best-fit first, with
 * the home's facing handled per the client's required/preferred setting. The
 * realtor can add any match to the shared workspace in one click.
 *
 * Inventory is whatever the catalog currently holds: the labeled sample homes
 * today, real NC listings once a licensed MLS feed is connected. Honest either
 * way — nothing here is fabricated.
 */
export function ClientAutoMatches({ workspaceId, actor }: { workspaceId: string; actor: WorkspaceActor }) {
  const { savedSearches, workspaces, upsertWorkspace } = useUserState();
  const feed = useScoredFeed();

  const ws = workspaces.find((w) => w.id === workspaceId);
  const linked = savedSearches.filter((s) => s.workspaceId === workspaceId);
  const search = linked[0];

  const sharedIds = React.useMemo(() => new Set((ws?.sharedHomes ?? []).map((h) => h.propertyId)), [ws]);

  const matches = React.useMemo(() => {
    if (!search) return [];
    return autoMatch(search, feed, { facingMode: search.facingMode, limit: 12 });
  }, [search, feed]);

  const showFacing = Boolean(search && search.hard.acceptableFacings.length > 0);

  const facingTone = (f: FacingFit): "good" | "caution" | "neutral" =>
    f === "match" ? "good" : f === "off" ? "caution" : "neutral";

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>
            <span className="inline-flex items-center gap-1.5"><Sparkles size={13} /> Auto-matched homes</span>
          </Eyebrow>
          {search ? <Badge tone={matches.length ? "good" : "neutral"}>{matches.length} ranked</Badge> : null}
        </div>

        {!search ? (
          <div className="mt-2">
            <p className="text-sm text-ink-2">
              Link a saved search to this client to auto-surface homes that fit their criteria — budget, beds,
              baths, lot, commute, and facing.
            </p>
            <ButtonLink href="/searches/new" variant="secondary" size="sm" className="mt-3">Create a search</ButtonLink>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">
              From <Link href={`/searches/${search.id}`} className="text-forest hover:underline">{search.name || "search"}</Link>:{" "}
              {describeSearch(search)}
              {showFacing ? ` · facing ${search.facingMode}` : ""}. Ranked best-fit first.
            </p>

            {matches.length === 0 ? (
              <p className="mt-3 text-sm text-ink-2">
                No available home meets these requirements yet. Loosen a criterion, or new matches appear here as
                inventory updates (live NC listings once a licensed MLS feed is connected).
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {matches.map(({ property, rankScore, facingFit }) => {
                  const already = sharedIds.has(property.id);
                  return (
                    <li key={property.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
                      <div className="min-w-0">
                        <Link href={`/property/${property.id}`} className="block truncate text-sm font-medium text-ink hover:text-forest">
                          {property.address.line1}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          <span>{property.price > 0 ? formatUsd(property.price) : "Price n/a"}</span>
                          <span>· Match {rankScore}</span>
                          {showFacing ? (
                            <Badge tone={facingTone(facingFit)}>
                              <span className="inline-flex items-center gap-1"><Compass size={11} /> {FACING_FIT_LABEL[facingFit]}</span>
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      {actor === "realtor" ? (
                        already ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-forest"><Check size={13} /> Shared</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (!ws || ws.sharedHomes.some((h) => h.propertyId === property.id)) return;
                              upsertWorkspace({
                                ...ws,
                                sharedHomes: [...ws.sharedHomes, { propertyId: property.id, addedBy: actor, at: Date.now(), comments: [], reactions: {} }],
                              });
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-sage-soft"
                          >
                            <Plus size={12} /> Share
                          </button>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
