"use client";

import Link from "next/link";
import { Container, Card, CardBody, Eyebrow } from "@/components/ui/primitives";
import { useUserState } from "@/components/providers/user-state";

export default function TasksPage() {
  const { workspaces, upsertWorkspace } = useUserState();
  const rows = workspaces.flatMap((w) => w.tasks.map((t) => ({ ...t, clientName: w.clientName, wsId: w.id })));

  function toggle(wsId: string, taskId: string) {
    const w = workspaces.find((x) => x.id === wsId);
    if (!w) return;
    upsertWorkspace({ ...w, tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) });
  }

  return (
    <Container className="py-8">
      <Eyebrow>Realtor</Eyebrow>
      <h1 className="font-display text-3xl font-semibold text-ink">Tasks</h1>
      <div className="mt-5 space-y-2">
        {rows.map((t) => (
          <Card key={t.id}>
            <CardBody className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.wsId, t.id)} />
                <span className={t.done ? "text-muted line-through" : "text-ink"}>{t.title}</span>
              </label>
              <Link href={`/workspace/${t.wsId}`} className="text-xs text-muted hover:text-forest">{t.clientName}</Link>
            </CardBody>
          </Card>
        ))}
        {rows.length === 0 ? <p className="text-sm text-ink-2">No tasks yet. Add tasks inside a client workspace.</p> : null}
      </div>
    </Container>
  );
}
