"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Container, Eyebrow, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PropertyCard } from "@/components/vastu/property-card";
import { SavedSearchForm } from "@/components/search/saved-search-form";
import { useUserState, useHydrated } from "@/components/providers/user-state";
import { useScoredFeed } from "@/lib/use-scored";
import { matchesHard, describeSearch } from "@/domain/search";

export default function SearchDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const editing = search.get("edit") === "1";
  const hydrated = useHydrated();
  const { savedSearches } = useUserState();
  const feed = useScoredFeed();

  const s = savedSearches.find((x) => x.id === params.id);

  const matches = React.useMemo(() => {
    if (!s) return [];
    return feed.filter(({ property }) => matchesHard(s, property, property.vastu.facingDirection.value));
  }, [s, feed]);

  if (!s) {
    return (
      <Container className="py-10">
        {!hydrated ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <div>
            <p className="font-display text-lg font-semibold text-ink">Search not found</p>
            <ButtonLink href="/searches" variant="secondary" size="sm" className="mt-3">Back to searches</ButtonLink>
          </div>
        )}
      </Container>
    );
  }

  if (editing) {
    return (
      <Container className="py-6">
        <Link href={`/searches/${s.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-forest"><ArrowLeft size={15} /> Back to matches</Link>
        <div className="mt-4">
          <Eyebrow>Edit search</Eyebrow>
          <h1 className="mb-5 mt-1 font-display text-2xl font-semibold text-ink">{s.name}</h1>
          <SavedSearchForm existing={s} onSaved={() => router.push(`/searches/${s.id}`)} />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-6">
      <Link href="/searches" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-forest"><ArrowLeft size={15} /> Searches</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{s.name}</h1>
          <p className="mt-1 text-sm text-ink-2">{describeSearch(s)}</p>
        </div>
        <ButtonLink href={`/searches/${s.id}?edit=1`} variant="secondary" size="sm"><Pencil size={13} /> Edit</ButtonLink>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Badge tone={matches.length ? "good" : "neutral"}>{matches.length} {matches.length === 1 ? "match" : "matches"}</Badge>
        <span className="text-xs text-muted">Hard requirements are enforced; homes missing any requirement are excluded. Unknown commute/facing can&apos;t satisfy a requirement.</span>
      </div>

      {matches.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map(({ property, analysis }) => (
            <PropertyCard key={property.id} property={property} analysis={analysis} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-2">No homes meet this search&apos;s hard requirements right now. Loosen a requirement or check back as new listings arrive.</p>
      )}
    </Container>
  );
}
