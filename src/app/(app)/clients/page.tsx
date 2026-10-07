"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Plus, Eye } from "lucide-react";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { newWorkspace } from "@/domain/workspace";
import { seedDemoWorkspace } from "@/lib/demo-workspace";

export default function ClientsPage() {
  const { workspaces, upsertWorkspace, realtorProfile, role } = useUserState();
  const [clientName, setClientName] = React.useState("");
  const realtorName = realtorProfile?.name || "Your Agent";

  function addDemo() {
    upsertWorkspace(seedDemoWorkspace(realtorName, "Sample Client"));
  }
  function addClient() {
    if (!clientName.trim()) return;
    upsertWorkspace(newWorkspace(`ws-${Date.now().toString(36)}`, clientName.trim(), realtorName));
    setClientName("");
  }

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Realtor</Eyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">Clients</h1>
        </div>
        {role !== "realtor" ? (
          <Badge tone="caution">Switch to Realtor mode in Settings to manage clients</Badge>
        ) : null}
      </div>

      <Card className="mt-5">
        <CardBody>
          <Eyebrow>New client workspace</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <Button variant="primary" onClick={addClient}><Plus size={14} /> Create</Button>
            <Button variant="secondary" onClick={addDemo}>Add demo workspace</Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {workspaces.map((w) => (
          <Card key={w.id}>
            <CardBody>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-medium text-ink"><Users size={15} /> {w.clientName}</p>
                <Badge tone="neutral">{w.sharedHomes.length} homes</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{w.tours.length} tours · {w.tasks.length} tasks</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/workspace/${w.id}`} className="inline-flex items-center gap-1.5 rounded-pill bg-forest px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Open</Link>
                <Link href={`/workspace/${w.id}?view=client`} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2"><Eye size={13} /> Preview client view</Link>
              </div>
            </CardBody>
          </Card>
        ))}
        {workspaces.length === 0 ? (
          <p className="text-sm text-ink-2">No client workspaces yet. Create one or add the demo workspace.</p>
        ) : null}
      </div>
    </Container>
  );
}
