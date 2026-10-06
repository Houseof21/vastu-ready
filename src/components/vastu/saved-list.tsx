"use client";

import Link from "next/link";
import { PropertyCard } from "./property-card";
import { ButtonLink } from "@/components/ui/button";
import { useUserState, type Feedback } from "@/components/providers/user-state";
import { useScoredFeed } from "@/lib/use-scored";

const FEEDBACK_LABEL: Record<Feedback, string> = {
  love: "Loved",
  consider: "Considering",
  pass: "Passed",
  dealbreaker: "Dealbreaker",
};

export function SavedList() {
  const { saved, feedback } = useUserState();
  const items = useScoredFeed();
  const savedItems = items.filter((i) => saved.includes(i.property.id));

  // Group anything with feedback too, even if not explicitly saved.
  const reactedIds = Object.keys(feedback).filter((id) => !saved.includes(id));
  const reacted = items.filter((i) => reactedIds.includes(i.property.id));

  if (savedItems.length === 0 && reacted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
          Save homes from your feed to keep them here, then compare your shortlist side by side.
        </p>
        <div className="mt-4">
          <ButtonLink href="/feed" variant="primary" size="sm">
            Browse homes
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {savedItems.length > 0 ? (
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Saved ({savedItems.length})</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedItems.map((i) => (
              <PropertyCard key={i.property.id} property={i.property} analysis={i.analysis} />
            ))}
          </div>
        </section>
      ) : null}

      {reacted.length > 0 ? (
        <section>
          <h2 className="mb-1 font-display text-xl font-semibold text-ink">You reacted to these</h2>
          <p className="mb-4 text-sm text-muted">
            Homes you gave feedback on. <Link href="/feed" className="text-forest underline">Back to feed</Link>
          </p>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {reacted.map((i) => (
              <li key={i.property.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/property/${i.property.id}`} className="min-w-0">
                  <p className="truncate font-medium text-ink">{i.property.address.line1}</p>
                  <p className="truncate text-xs text-muted">{i.property.address.neighborhood}</p>
                </Link>
                <span className="shrink-0 text-xs font-medium text-ink-2">
                  {FEEDBACK_LABEL[feedback[i.property.id]!]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
