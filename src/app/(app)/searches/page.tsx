import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { DEMO_PREFERENCES } from "@/data/demo";
import { formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Saved searches" };

export default function SearchesPage() {
  const p = DEMO_PREFERENCES.profile;
  const searches = [
    {
      name: "North Raleigh · large lots",
      query: `${p.preferredAreas.slice(0, 3).join(", ")} · ${formatUsd(p.maxBudget, { compact: true })} max · ${p.minLotAcres}+ ac`,
      cadence: "Daily",
      newCount: 2,
    },
    {
      name: "North/NE-facing, move-in ready",
      query: `N/NE/E facing · ${p.minBeds}+ bd · ${p.minSqft.toLocaleString()}+ sq ft`,
      cadence: "Instant",
      newCount: 0,
    },
  ];

  return (
    <Container className="py-8">
      <Eyebrow>Stay ahead of the market</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Saved searches</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Save a set of criteria and we&apos;ll surface new matches as they come on the market — scored and
        ready for you.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {searches.map((s) => (
          <Card key={s.name}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-sage-soft text-forest">
                    <Search size={16} aria-hidden />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold text-ink">{s.name}</p>
                    <p className="text-xs text-muted">{s.query}</p>
                  </div>
                </div>
                {s.newCount > 0 ? <Badge tone="forest">{s.newCount} new</Badge> : null}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                  <Bell size={13} aria-hidden /> {s.cadence} alerts
                </span>
                <Link href="/feed" className="text-sm font-medium text-forest hover:underline">
                  View matches
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <ButtonLink href="/feed" variant="secondary" size="sm">
          + New saved search
        </ButtonLink>
      </div>
    </Container>
  );
}
