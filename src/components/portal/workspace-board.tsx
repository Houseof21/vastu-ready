"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, ThumbsUp, X, MessageSquare, CalendarClock, ListChecks, Lock, Plus, GitCompare } from "lucide-react";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { useScoredForIds, useAllProperties } from "@/lib/use-scored";
import { formatUsd } from "@/lib/format";
import {
  clientView,
  REACTION_LABEL,
  TOUR_STATUS_LABEL,
  type Workspace,
  type WorkspaceActor,
  type Reaction,
} from "@/domain/workspace";

type Tab = "homes" | "tours" | "tasks" | "messages" | "notes";

/**
 * The shared client–realtor workspace. `actor` is who is viewing. When the actor
 * is the client, the board reads through `clientView` and never renders realtor
 * private notes or agent-only tabs.
 */
export function WorkspaceBoard({ workspaceId, actor }: { workspaceId: string; actor: WorkspaceActor }) {
  const { workspaces, upsertWorkspace, setCompareList } = useUserStateExt();
  const ws = workspaces.find((w) => w.id === workspaceId);
  const [tab, setTab] = React.useState<Tab>("homes");

  if (!ws) {
    return <p className="text-sm text-ink-2">Workspace not found.</p>;
  }
  const isClient = actor === "client";
  const safe = isClient ? clientView(ws) : ws;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; realtorOnly?: boolean }[] = [
    { key: "homes", label: isClient ? "Shared homes" : "Homes", icon: <Heart size={14} /> },
    { key: "tours", label: "Tours", icon: <CalendarClock size={14} /> },
    { key: "messages", label: "Messages", icon: <MessageSquare size={14} /> },
    { key: "tasks", label: "Tasks", icon: <ListChecks size={14} />, realtorOnly: true },
    { key: "notes", label: "Private notes", icon: <Lock size={14} />, realtorOnly: true },
  ];
  const visibleTabs = tabs.filter((t) => !t.realtorOnly || !isClient);

  function update(mut: (w: Workspace) => Workspace) {
    upsertWorkspace(mut({ ...ws! }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Shared workspace</Eyebrow>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {ws.clientName} <span className="text-muted">·</span> {ws.realtorName}
          </h1>
        </div>
        <Badge tone="info">{isClient ? "Client view" : "Realtor view"}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-line-2 pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-sage-soft text-forest" : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "homes" ? <HomesTab ws={safe} actor={actor} update={update} setCompareList={setCompareList} /> : null}
        {tab === "tours" ? <ToursTab ws={safe} actor={actor} update={update} /> : null}
        {tab === "messages" ? <MessagesTab ws={safe} /> : null}
        {tab === "tasks" && !isClient ? <TasksTab ws={ws} actor={actor} update={update} /> : null}
        {tab === "notes" && !isClient ? <NotesTab ws={ws} update={update} /> : null}
      </div>
    </div>
  );
}

// user-state augmented with a compare setter helper
function useUserStateExt() {
  const s = useUserState();
  const setCompareList = (ids: string[]) => {
    // rebuild compare tray deterministically
    s.clearCompare();
    ids.slice(0, 4).forEach((id) => s.toggleCompare(id));
  };
  return { ...s, setCompareList };
}

function HomesTab({
  ws,
  actor,
  update,
  setCompareList,
}: {
  ws: Pick<Workspace, "id" | "sharedHomes">;
  actor: WorkspaceActor;
  update: (m: (w: Workspace) => Workspace) => void;
  setCompareList: (ids: string[]) => void;
}) {
  const ids = ws.sharedHomes.map((h) => h.propertyId);
  const scored = useScoredForIds(ids);
  const all = useAllProperties();
  const authorName = actor === "realtor" ? "Agent" : "Client";
  const candidates = all.filter((p) => !ids.includes(p.id)).slice(0, 8);
  const [adding, setAdding] = React.useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{ids.length} shared {ids.length === 1 ? "home" : "homes"}</p>
        <div className="flex gap-2">
          {ids.length >= 2 ? (
            <Link href="/compare" onClick={() => setCompareList(ids)} className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2">
              <GitCompare size={13} /> Compare
            </Link>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => setAdding((v) => !v)}><Plus size={13} /> Add home</Button>
        </div>
      </div>

      {adding ? (
        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs text-muted">Add a home to this workspace</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidates.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  update((w) => ({
                    ...w,
                    sharedHomes: [...w.sharedHomes, { propertyId: p.id, addedBy: actor, at: Date.now(), comments: [], reactions: {} }],
                  }));
                  setAdding(false);
                }}
                className="rounded-pill border border-line bg-surface px-3 py-1.5 text-xs text-ink-2 hover:bg-sage-soft"
              >
                {p.address.line1} · {formatUsd(p.price)}
              </button>
            ))}
            {candidates.length === 0 ? <span className="text-xs text-muted">No more homes to add.</span> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {ws.sharedHomes.map((home) => {
          const sc = scored.find((s) => s.property.id === home.propertyId);
          return (
            <Card key={home.propertyId}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/property/${home.propertyId}`} className="font-medium text-ink hover:text-forest">
                      {sc?.property.address.line1 ?? home.propertyId}
                    </Link>
                    <p className="text-xs text-muted">
                      {sc ? `${formatUsd(sc.property.price)} · Match ${sc.analysis.scores.overall}` : ""} · added by {home.addedBy}
                    </p>
                  </div>
                  <ReactionBar
                    value={home.reactions[actor]}
                    onReact={(r) =>
                      update((w) => ({
                        ...w,
                        sharedHomes: w.sharedHomes.map((h) =>
                          h.propertyId === home.propertyId ? { ...h, reactions: { ...h.reactions, [actor]: r } } : h,
                        ),
                      }))
                    }
                  />
                </div>

                <CommentThread
                  comments={home.comments}
                  onAdd={(text) =>
                    update((w) => ({
                      ...w,
                      sharedHomes: w.sharedHomes.map((h) =>
                        h.propertyId === home.propertyId
                          ? { ...h, comments: [...h.comments, { id: `c-${Date.now()}`, by: actor, authorName, text, at: Date.now() }] }
                          : h,
                      ),
                    }))
                  }
                />
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      update((w) => ({
                        ...w,
                        tours: [
                          ...w.tours,
                          { id: `t-${Date.now()}`, propertyId: home.propertyId, by: actor, proposedFor: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 16), status: "proposed", at: Date.now() },
                        ],
                      }))
                    }
                  >
                    <CalendarClock size={13} /> Request tour
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
        {ws.sharedHomes.length === 0 ? <p className="text-sm text-ink-2">No homes shared yet.</p> : null}
      </div>
    </div>
  );
}

function ReactionBar({ value, onReact }: { value?: Reaction; onReact: (r: Reaction) => void }) {
  const opts: { r: Reaction; icon: React.ReactNode }[] = [
    { r: "love", icon: <Heart size={14} /> },
    { r: "like", icon: <ThumbsUp size={14} /> },
    { r: "pass", icon: <X size={14} /> },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <button
          key={o.r}
          onClick={() => onReact(o.r)}
          title={REACTION_LABEL[o.r]}
          className={`grid h-8 w-8 place-items-center rounded-full border ${value === o.r ? "border-forest bg-sage-soft text-forest" : "border-line text-ink-2 hover:bg-surface-2"}`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function CommentThread({ comments, onAdd }: { comments: Workspace["sharedHomes"][number]["comments"]; onAdd: (t: string) => void }) {
  const [text, setText] = React.useState("");
  return (
    <div className="mt-3 border-t border-line-2 pt-3">
      <ul className="space-y-1.5">
        {comments.map((c) => (
          <li key={c.id} className="text-sm">
            <span className={`font-medium ${c.by === "realtor" ? "text-forest" : "text-ink"}`}>{c.authorName}</span>{" "}
            <span className="text-ink-2">{c.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onAdd(text.trim()); setText(""); } }}
          placeholder="Add a comment…"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        />
        <Button variant="secondary" size="sm" onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); } }}>Send</Button>
      </div>
    </div>
  );
}

function ToursTab({ ws, actor, update }: { ws: Pick<Workspace, "tours">; actor: WorkspaceActor; update: (m: (w: Workspace) => Workspace) => void }) {
  if (ws.tours.length === 0) return <p className="text-sm text-ink-2">No tours yet. Request one from a shared home.</p>;
  return (
    <div className="space-y-2">
      {ws.tours.map((t) => (
        <Card key={t.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link href={`/property/${t.propertyId}`} className="text-sm font-medium text-ink hover:text-forest">{t.propertyId}</Link>
              <p className="text-xs text-muted">{new Date(t.proposedFor).toLocaleString()} · proposed by {t.by}{t.note ? ` · ${t.note}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={t.status === "confirmed" ? "good" : t.status === "completed" ? "neutral" : "caution"}>{TOUR_STATUS_LABEL[t.status]}</Badge>
              {actor === "realtor" && t.status === "proposed" ? (
                <Button variant="secondary" size="sm" onClick={() => update((w) => ({ ...w, tours: w.tours.map((x) => x.id === t.id ? { ...x, status: "confirmed" } : x) }))}>Confirm</Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function MessagesTab({ ws }: { ws: Pick<Workspace, "sharedHomes"> }) {
  const all = ws.sharedHomes
    .flatMap((h) => h.comments.map((c) => ({ ...c, home: h.propertyId })))
    .sort((a, b) => a.at - b.at);
  if (all.length === 0) return <p className="text-sm text-ink-2">No messages yet.</p>;
  return (
    <ul className="space-y-2">
      {all.map((c) => (
        <li key={c.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
          <span className={`font-medium ${c.by === "realtor" ? "text-forest" : "text-ink"}`}>{c.authorName}</span>
          <span className="text-xs text-muted"> · on {c.home}</span>
          <p className="text-ink-2">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

function TasksTab({ ws, actor, update }: { ws: Workspace; actor: WorkspaceActor; update: (m: (w: Workspace) => Workspace) => void }) {
  const [title, setTitle] = React.useState("");
  return (
    <div>
      <ul className="space-y-1.5">
        {ws.tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={t.done} onChange={() => update((w) => ({ ...w, tasks: w.tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x) }))} />
            <span className={t.done ? "text-muted line-through" : "text-ink"}>{t.title}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task…" className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm" />
        <Button variant="secondary" size="sm" onClick={() => { if (title.trim()) { update((w) => ({ ...w, tasks: [...w.tasks, { id: `k-${Date.now()}`, title: title.trim(), done: false, by: actor, at: Date.now() }] })); setTitle(""); } }}>Add</Button>
      </div>
    </div>
  );
}

function NotesTab({ ws, update }: { ws: Workspace; update: (m: (w: Workspace) => Workspace) => void }) {
  const [text, setText] = React.useState("");
  return (
    <div>
      <div className="mb-3 flex items-start gap-2 rounded-md border border-[color:var(--color-caution-soft)] bg-caution-soft/40 p-3 text-xs text-ink-2">
        <Lock size={14} className="mt-0.5 shrink-0 text-caution" /> Private to you. Clients never see these notes.
      </div>
      <ul className="space-y-1.5">
        {ws.realtorPrivateNotes.map((n) => (
          <li key={n.id} className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-2">{n.text}</li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a private note…" className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm" />
        <Button variant="secondary" size="sm" onClick={() => { if (text.trim()) { update((w) => ({ ...w, realtorPrivateNotes: [...w.realtorPrivateNotes, { id: `p-${Date.now()}`, text: text.trim(), at: Date.now() }] })); setText(""); } }}>Add</Button>
      </div>
    </div>
  );
}
