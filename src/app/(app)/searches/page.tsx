"use client";

import Link from "next/link";
import { Plus, Bell, Pencil, Trash2 } from "lucide-react";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { describeSearch, NOTIFY_LABEL } from "@/domain/search";

export default function SearchesPage() {
  const { savedSearches, removeSavedSearch } = useUserState();
  const sorted = [...savedSearches].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Your searches</Eyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">Saved searches</h1>
        </div>
        <ButtonLink href="/searches/new" variant="primary"><Plus size={15} /> New saved search</ButtonLink>
      </div>

      {sorted.length === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <p className="text-sm text-ink-2">No saved searches yet. Create one to capture your must-haves and preferences, then view its matches any time.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sorted.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ink">{s.name}</p>
                  <Badge tone="neutral"><Bell size={11} className="mr-1 inline" />{NOTIFY_LABEL[s.notify]}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-2">{describeSearch(s)}</p>
                {s.notify !== "off" ? (
                  <p className="mt-1 text-[0.7rem] text-muted">Alerts aren&apos;t delivered yet (demo) — open to view matches on demand.</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/searches/${s.id}`} className="inline-flex items-center gap-1.5 rounded-pill bg-forest px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">View matches</Link>
                  <Link href={`/searches/${s.id}?edit=1`} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2"><Pencil size={12} /> Edit</Link>
                  <button onClick={() => removeSavedSearch(s.id)} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-concern hover:bg-surface-2"><Trash2 size={12} /> Delete</button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
