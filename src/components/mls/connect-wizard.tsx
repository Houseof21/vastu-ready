"use client";

import * as React from "react";
import { Check, ChevronRight, ShieldCheck, KeyRound, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SUPPORTED_MLS, MLS_PROVIDERS, CONNECT_STEPS, getProvider } from "@/domain/mls";
import type { RealtorProfile } from "@/domain/realtor";
import { newConnection, type MlsConnection } from "@/domain/realtor";
import { ownerKeyFor, submitCredentials, testConnection } from "@/lib/mls-client";

/**
 * Guided "Connect Your MLS" flow:
 *   Choose MLS → identify provider → authorize → check approval → test.
 * Credentials are sent to the server (POST) and never kept in client state.
 * A connected state is only ever set by a real successful test.
 */
export function ConnectMlsWizard({
  profile,
  onDone,
  onCancel,
}: {
  profile: RealtorProfile;
  onDone: (c: MlsConnection) => void;
  onCancel: () => void;
}) {
  const owner = ownerKeyFor(profile);
  const [step, setStep] = React.useState(0);
  const [mlsKey, setMlsKey] = React.useState(profile.mlsOrg || "doorify");
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [credsSaved, setCredsSaved] = React.useState(false);

  const mls = SUPPORTED_MLS.find((m) => m.key === mlsKey) ?? SUPPORTED_MLS[0]!;
  const provider = getProvider(mls.providerKey);

  function finishRequest() {
    // Unsupported MLS → a clearly-pending request, never "connected".
    const c = newConnection({
      mlsKey: mls.key,
      mlsName: mls.name,
      providerKey: mls.providerKey || "unknown",
      providerLabel: provider?.label ?? "Provider to be determined",
      ownerKey: owner,
      state: "awaiting_approval",
      approvalStatus: "Request submitted — pending support for this MLS",
      requested: true,
      demo: true,
    });
    onDone(c);
  }

  async function saveCreds() {
    setBusy(true);
    setNote(null);
    try {
      const r = await submitCredentials({
        ownerKey: owner,
        mlsKey: mls.key,
        authMethod: "oauth",
        clientId,
        clientSecret,
      });
      if (r.ok) {
        setCredsSaved(true);
        // Clear secrets from the component immediately after sending.
        setClientId("");
        setClientSecret("");
        setNote("Credentials stored securely on the server. They are never shown again here.");
        setStep(3);
      } else {
        setNote(r.message ?? "Could not save credentials.");
      }
    } finally {
      setBusy(false);
    }
  }

  function startDemo() {
    const c = newConnection({
      mlsKey: mls.key,
      mlsName: mls.name,
      providerKey: mls.providerKey,
      providerLabel: provider?.label ?? "—",
      ownerKey: owner,
      authMethod: provider?.authMethod ?? "oauth",
      state: "awaiting_approval",
      approvalStatus: "Demo connection — not a live feed",
      scope: provider?.defaultScope ?? null,
      demo: true,
      sync: { lastSuccessfulSyncAt: null, cadenceLabel: "Demo (no live sync)", lastError: null, stale: false, checkpoint: null },
    });
    onDone(c);
  }

  async function runTest() {
    setBusy(true);
    setNote(null);
    try {
      const r = await testConnection({ ownerKey: owner, mlsKey: mls.key });
      const c = newConnection({
        mlsKey: mls.key,
        mlsName: mls.name,
        providerKey: mls.providerKey,
        providerLabel: provider?.label ?? "—",
        ownerKey: owner,
        authMethod: provider?.authMethod ?? "oauth",
        state: r.state,
        approvalStatus: r.ok ? "Approved & connected" : r.message,
        scope: r.ok ? provider?.defaultScope ?? null : null,
        hasServerCredentials: credsSaved,
        demo: !r.ok, // a non-connected result stays a demo/pending entry, never "live"
        sync: {
          lastSuccessfulSyncAt: r.ok ? Date.now() : null,
          cadenceLabel: r.ok ? "Incremental (provider cadence)" : "—",
          lastError: r.ok ? null : r.message,
          stale: false,
          checkpoint: null,
        },
      });
      setNote(r.message);
      if (r.ok) onDone(c);
      else {
        // Surface the honest failure; let the agent keep it as a pending connection.
        onDone(c);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <Eyebrow>Connect your MLS</Eyebrow>
          <button onClick={onCancel} className="text-xs text-muted hover:text-ink">Cancel</button>
        </div>

        {/* Stepper */}
        <ol className="mt-3 flex flex-wrap gap-2 text-xs">
          {CONNECT_STEPS.map((s, i) => (
            <li
              key={s.key}
              className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 ${
                i === step ? "border-forest bg-sage-soft text-forest" : i < step ? "border-line text-ink-2" : "border-line text-muted"
              }`}
            >
              {i < step ? <Check size={12} /> : <span className="tabular-nums">{i + 1}</span>} {s.label}
            </li>
          ))}
        </ol>

        <div className="mt-5">
          {step === 0 ? (
            <div>
              <p className="text-sm text-ink-2">Choose the MLS you&apos;re a member of.</p>
              <div className="mt-3 space-y-2">
                {SUPPORTED_MLS.map((m) => (
                  <label
                    key={m.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                      mlsKey === m.key ? "border-forest bg-sage-soft/40" : "border-line hover:bg-surface-2"
                    }`}
                  >
                    <input type="radio" name="mls" checked={mlsKey === m.key} onChange={() => setMlsKey(m.key)} className="mt-1" />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        {m.name}
                        {m.supported ? <Badge tone="good">Supported</Badge> : <Badge tone="neutral">Request</Badge>}
                      </span>
                      <span className="block text-xs text-muted">{m.region} · {m.note}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {mls.supported ? (
                  <Button variant="primary" onClick={() => setStep(1)}>Next <ChevronRight size={15} /></Button>
                ) : (
                  <Button variant="primary" onClick={finishRequest}>Request this MLS</Button>
                )}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-forest" />
                <p className="text-sm font-medium text-ink">{provider?.label ?? "Provider to confirm"}</p>
              </div>
              <p className="mt-2 text-sm text-ink-2">{provider ? MLS_PROVIDERS[provider.key]?.agreementNote : ""}</p>
              {!mls.providerConfirmed ? (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-[color:var(--color-caution-soft)] bg-caution-soft/40 p-3 text-xs text-ink-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-caution" />
                  The provider for {mls.name} is assumed, not confirmed. Verify the current provider and
                  agreements with the MLS before activating a live feed.
                </div>
              ) : null}
              <div className="mt-4 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
                <Button variant="primary" onClick={() => setStep(2)}>Authorize <ChevronRight size={15} /></Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-forest" />
                <p className="text-sm font-medium text-ink">Authorize access</p>
              </div>
              <p className="mt-2 text-sm text-ink-2">
                {provider?.oauth
                  ? "This provider uses server-to-server OAuth. Enter the client ID and secret issued to your approved application — never your MLS password. They&apos;re stored encrypted on the server and never shown again."
                  : "Enter the server access token issued for your approved application. It&apos;s stored server-side and never exposed."}
              </p>
              <div className="mt-3 space-y-2">
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client ID (from approved application)"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                  autoComplete="off"
                />
                <input
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Client secret"
                  type="password"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                  autoComplete="off"
                />
              </div>
              {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={startDemo}>Use demo connection</Button>
                  <Button variant="primary" onClick={saveCreds} disabled={busy || !clientId || !clientSecret}>
                    {busy ? <Loader2 size={15} className="animate-spin" /> : "Save credentials"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="text-sm font-medium text-ink">Check approval status</p>
              <p className="mt-2 text-sm text-ink-2">
                {credsSaved
                  ? "Credentials are stored. Access still depends on the MLS having approved this application and the data license being e-signed. Until the grant is real, the connection stays pending — it won't show listings."
                  : "No credentials saved yet."}
              </p>
              <div className="mt-4 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                <Button variant="primary" onClick={() => setStep(4)}>Test connection <ChevronRight size={15} /></Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <p className="text-sm font-medium text-ink">Test connection</p>
              <p className="mt-2 text-sm text-ink-2">
                Runs a real token + data probe. It reports connected only if both succeed — a provider error
                never shows as connected.
              </p>
              {note ? <p className="mt-2 text-sm text-ink-2">{note}</p> : null}
              <div className="mt-4 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
                <Button variant="primary" onClick={runTest} disabled={busy}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : "Run test"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
