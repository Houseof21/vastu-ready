"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { emptySavedSearch, NOTIFY_LABEL, type SavedSearch, type NotificationChoice } from "@/domain/search";
import { CARDINALS, type Cardinal8 } from "@/domain/types";
import { PRIORITY_LABEL, type Priority } from "@/domain/profile";

/** Create or edit a saved search: hard requirements, flexible preferences, alerts. */
export function SavedSearchForm({ existing, onSaved }: { existing?: SavedSearch; onSaved?: (s: SavedSearch) => void }) {
  const router = useRouter();
  const { upsertSavedSearch, workspaces } = useUserState();
  const rid = React.useId();
  const [s, setS] = React.useState<SavedSearch>(() => existing ?? emptySavedSearch(`ss-${rid.replace(/:/g, "")}`));

  function setHard<K extends keyof SavedSearch["hard"]>(k: K, v: SavedSearch["hard"][K]) {
    setS((p) => ({ ...p, hard: { ...p.hard, [k]: v } }));
  }
  function numOrNull(v: string): number | null {
    const n = Number(v);
    return v === "" || Number.isNaN(n) ? null : n;
  }
  function toggleFacing(c: Cardinal8) {
    setHard("acceptableFacings", s.hard.acceptableFacings.includes(c) ? s.hard.acceptableFacings.filter((x) => x !== c) : [...s.hard.acceptableFacings, c]);
  }
  function togglePriority(p: Priority) {
    setS((prev) => ({
      ...prev,
      flexible: { ...prev.flexible, priorities: prev.flexible.priorities.includes(p) ? prev.flexible.priorities.filter((x) => x !== p) : [...prev.flexible.priorities, p] },
    }));
  }

  function save() {
    const saved: SavedSearch = { ...s, name: s.name.trim() || "Untitled search", updatedAt: Date.now() };
    upsertSavedSearch(saved);
    if (onSaved) onSaved(saved);
    else router.push(`/searches/${saved.id}`);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardBody>
          <Eyebrow>Search name</Eyebrow>
          <input value={s.name} onChange={(e) => setS((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. North Raleigh, NE-facing" className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Eyebrow>Hard requirements (enforced)</Eyebrow>
          <p className="mt-1 text-xs text-muted">A home that misses any of these is not a match. Leave blank to ignore.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Num label="Max budget ($)" value={s.hard.maxBudget} onChange={(v) => setHard("maxBudget", v)} numOrNull={numOrNull} />
            <Num label="Min beds" value={s.hard.minBeds} onChange={(v) => setHard("minBeds", v)} numOrNull={numOrNull} />
            <Num label="Min baths" value={s.hard.minBaths} onChange={(v) => setHard("minBaths", v)} numOrNull={numOrNull} />
            <Num label="Min sq ft" value={s.hard.minSqft} onChange={(v) => setHard("minSqft", v)} numOrNull={numOrNull} />
            <Num label="Min lot (ac)" value={s.hard.minLotAcres} onChange={(v) => setHard("minLotAcres", v)} numOrNull={numOrNull} />
            <Num label="Max commute (min)" value={s.hard.maxDriveMinutes} onChange={(v) => setHard("maxDriveMinutes", v)} numOrNull={numOrNull} />
          </div>
          <div className="mt-3">
            <span className="text-xs text-muted">Acceptable facings (empty = any)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CARDINALS.map((c) => (
                <button key={c} onClick={() => toggleFacing(c)} className={`rounded-pill border px-2.5 py-1 text-xs ${s.hard.acceptableFacings.includes(c) ? "border-forest bg-sage-soft text-forest" : "border-line text-ink-2 hover:bg-surface-2"}`}>{c}</button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Eyebrow>Flexible preferences (influence ranking)</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <button key={p} onClick={() => togglePriority(p)} className={`rounded-pill border px-2.5 py-1 text-xs ${s.flexible.priorities.includes(p) ? "border-forest bg-sage-soft text-forest" : "border-line text-ink-2 hover:bg-surface-2"}`}>{PRIORITY_LABEL[p]}</button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Eyebrow>Notifications</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["off", "daily", "instant"] as NotificationChoice[]).map((n) => (
              <button key={n} onClick={() => setS((p) => ({ ...p, notify: n }))} className={`rounded-pill border px-3 py-1.5 text-sm ${s.notify === n ? "border-forest bg-sage-soft text-forest" : "border-line text-ink-2 hover:bg-surface-2"}`}>{NOTIFY_LABEL[n]}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Your choice is saved, but automated alerts aren&apos;t delivered in this demo — there&apos;s no
            background job or email configured yet. &ldquo;View matches&rdquo; runs the search on demand.
          </p>
        </CardBody>
      </Card>

      {workspaces.length > 0 ? (
        <Card>
          <CardBody>
            <Eyebrow>Link to a client workspace (optional)</Eyebrow>
            <select value={s.workspaceId ?? ""} onChange={(e) => setS((p) => ({ ...p, workspaceId: e.target.value || null }))} className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <option value="">Not linked</option>
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.clientName}</option>)}
            </select>
          </CardBody>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Button variant="primary" onClick={save}>Save search</Button>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, numOrNull }: { label: string; value: number | null; onChange: (v: number | null) => void; numOrNull: (v: string) => number | null }) {
  return (
    <label className="text-sm">
      <span className="text-xs text-muted">{label}</span>
      <input inputMode="numeric" value={value ?? ""} onChange={(e) => onChange(numOrNull(e.target.value))} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
    </label>
  );
}
