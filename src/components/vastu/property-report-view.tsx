"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PropertyReport } from "./property-report";
import { useScoredProperty, usePreferences } from "@/lib/use-scored";
import { useHydrated } from "@/components/providers/user-state";

/**
 * Client report page. Resolves the property (demo catalog or the buyer's own
 * entries) and scores it against the buyer's current preferences, so edits to
 * preferences re-rank reports live.
 */
export function PropertyReportView({ id }: { id: string }) {
  const hydrated = useHydrated();
  const scored = useScoredProperty(id);
  const prefs = usePreferences();

  return (
    <Container className="py-6">
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-forest">
        <ArrowLeft size={15} aria-hidden /> Back to feed
      </Link>

      <div className="mt-4">
        {scored ? (
          <PropertyReport property={scored.property} analysis={scored.analysis} prefs={prefs} />
        ) : !hydrated ? (
          <div className="py-24 text-center text-muted">Loading report…</div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center">
            <p className="font-display text-lg font-semibold text-ink">We couldn&apos;t find that home</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
              It may have been deleted, or the link is out of date.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <ButtonLink href="/feed" variant="primary" size="sm">Browse homes</ButtonLink>
              <ButtonLink href="/analyze" variant="secondary" size="sm">Analyze a home</ButtonLink>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
