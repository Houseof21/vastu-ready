"use client";

import Link from "next/link";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { useUserState } from "@/components/providers/user-state";
import { TOUR_STATUS_LABEL } from "@/domain/workspace";

export default function ToursPage() {
  const { workspaces } = useUserState();
  const tours = workspaces
    .flatMap((w) => w.tours.map((t) => ({ ...t, clientName: w.clientName, wsId: w.id })))
    .sort((a, b) => new Date(a.proposedFor).getTime() - new Date(b.proposedFor).getTime());

  return (
    <Container className="py-8">
      <Eyebrow>Realtor</Eyebrow>
      <h1 className="font-display text-3xl font-semibold text-ink">Tours</h1>
      <div className="mt-5 space-y-2">
        {tours.map((t) => (
          <Card key={t.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/property/${t.propertyId}`} className="text-sm font-medium text-ink hover:text-forest">{t.propertyId}</Link>
                <p className="text-xs text-muted">{t.clientName} · {new Date(t.proposedFor).toLocaleString()} · by {t.by}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={t.status === "confirmed" ? "good" : t.status === "completed" ? "neutral" : "caution"}>{TOUR_STATUS_LABEL[t.status]}</Badge>
                <Link href={`/workspace/${t.wsId}`} className="text-xs font-medium text-forest hover:underline">Open workspace</Link>
              </div>
            </CardBody>
          </Card>
        ))}
        {tours.length === 0 ? <p className="text-sm text-ink-2">No tours scheduled. Clients and you can request tours from shared homes.</p> : null}
      </div>
    </Container>
  );
}
