"use client";

import * as React from "react";
import { BadgeCheck, Info } from "lucide-react";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { SUPPORTED_MLS } from "@/domain/mls";
import { emptyRealtorProfile, PRO_VERIFICATION_LABEL, type RealtorProfile } from "@/domain/realtor";

/**
 * Realtor profile. Professional verification is DISPLAYED as a separate status;
 * entering a license or member ID never flips it to "verified" and never unlocks
 * listings — that requires real verification and a real MLS data authorization.
 */
export function RealtorProfileForm() {
  const { realtorProfile, setRealtorProfile } = useUserState();
  const [draft, setDraft] = React.useState<RealtorProfile>(realtorProfile ?? emptyRealtorProfile());
  const [saved, setSaved] = React.useState(false);

  // Sync the draft when the persisted profile arrives (e.g. after hydration),
  // using the render-time "store info from previous render" pattern (no effect).
  const [syncedFrom, setSyncedFrom] = React.useState<RealtorProfile | null>(realtorProfile);
  if (realtorProfile && realtorProfile !== syncedFrom) {
    setSyncedFrom(realtorProfile);
    setDraft(realtorProfile);
  }

  function set<K extends keyof RealtorProfile>(k: K, v: RealtorProfile[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setSaved(false);
  }

  function save() {
    // Never set verification from form input — it stays whatever a real process set.
    setRealtorProfile({ ...draft, verification: realtorProfile?.verification ?? "unverified" });
    setSaved(true);
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <Eyebrow>Realtor profile</Eyebrow>
          <Badge tone={draft.verification === "verified" ? "good" : "neutral"}>
            <BadgeCheck size={12} className="mr-1 inline" />
            {PRO_VERIFICATION_LABEL[draft.verification]}
          </Badge>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={draft.name} onChange={(v) => set("name", v)} />
          <Field label="Brokerage" value={draft.brokerage} onChange={(v) => set("brokerage", v)} />
          <Field label="State" value={draft.state} onChange={(v) => set("state", v.toUpperCase().slice(0, 2))} />
          <Field label="Real estate license #" value={draft.licenseNumber} onChange={(v) => set("licenseNumber", v)} />
          <label className="text-sm">
            <span className="text-xs text-muted">MLS organization</span>
            <select
              value={draft.mlsOrg}
              onChange={(e) => set("mlsOrg", e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {SUPPORTED_MLS.filter((m) => m.key !== "other").map((m) => (
                <option key={m.key} value={m.key}>{m.name}</option>
              ))}
            </select>
          </label>
          <Field label="MLS member ID" value={draft.memberId} onChange={(v) => set("memberId", v)} />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-md border border-[color:var(--color-info-soft)] bg-info-soft/50 p-3 text-xs text-ink-2">
          <Info size={14} className="mt-0.5 shrink-0 text-info" />
          Your license number and member ID identify you — they don&apos;t verify your license or authorize
          listing access. Verification and MLS data authorization are separate steps, each with its own
          real process.
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" onClick={save}>Save profile</Button>
          {saved ? <span className="text-xs text-good">Saved</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">
      <span className="text-xs text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
      />
    </label>
  );
}
