"use client";

import * as React from "react";
import { RefreshCw, Unplug, AlertTriangle, Database } from "lucide-react";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  CONNECTION_STATE_LABEL,
  CONNECTION_STATE_TONE,
  type MlsConnection,
} from "@/domain/realtor";

/** Dashboard of MLS connections with clear states and reconnect/disconnect. */
export function ConnectionDashboard({
  connections,
  onReconnect,
  onDisconnect,
}: {
  connections: MlsConnection[];
  onReconnect: (c: MlsConnection) => void;
  onDisconnect: (c: MlsConnection) => void;
}) {
  if (connections.length === 0) {
    return (
      <Card>
        <CardBody>
          <Eyebrow>Connections</Eyebrow>
          <p className="mt-2 text-sm text-ink-2">No MLS connections yet. Connect your MLS to sync listings into your hot sheet.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {connections.map((c) => (
        <ConnectionRow key={c.id} c={c} onReconnect={onReconnect} onDisconnect={onDisconnect} />
      ))}
    </div>
  );
}

function fmtTime(ms: number | null): string {
  if (!ms) return "Never";
  return new Date(ms).toLocaleString();
}

function ConnectionRow({
  c,
  onReconnect,
  onDisconnect,
}: {
  c: MlsConnection;
  onReconnect: (c: MlsConnection) => void;
  onDisconnect: (c: MlsConnection) => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              {c.mlsName}
              <Badge tone={CONNECTION_STATE_TONE[c.state]}>{CONNECTION_STATE_LABEL[c.state]}</Badge>
              {c.demo ? <Badge tone="caution">Demo</Badge> : null}
            </p>
            <p className="text-xs text-muted">{c.providerLabel}</p>
          </div>
          <div className="flex gap-2">
            {c.state !== "connected" ? (
              <Button variant="secondary" size="sm" onClick={() => onReconnect(c)}>
                <RefreshCw size={13} /> Reconnect
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => setConfirming((v) => !v)}>
              <Unplug size={13} /> Disconnect
            </Button>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          <Row label="Connected to" value={c.connectedSubject ?? (c.state === "connected" ? "This agent" : "—")} />
          <Row label="Approval" value={c.approvalStatus} />
          <Row label="Credentials" value={c.hasServerCredentials ? "Stored server-side" : "None"} />
          <Row label="Last sync" value={fmtTime(c.sync.lastSuccessfulSyncAt)} />
          <Row label="Cadence" value={c.sync.cadenceLabel} />
          <Row label="Scope" value={c.scope ? `${c.scope.listingStatuses.join(", ")}${c.scope.idxOnly ? " · IDX" : ""}` : "—"} />
        </dl>

        {c.sync.lastError ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-concern">
            <AlertTriangle size={13} /> {c.sync.lastError}
          </p>
        ) : null}
        {c.sync.stale ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-caution">
            <AlertTriangle size={13} /> Data may be stale — last successful sync {fmtTime(c.sync.lastSuccessfulSyncAt)}.
          </p>
        ) : null}
        {c.scope ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <Database size={13} className="mt-0.5 shrink-0" /> {c.scope.retentionNote}
          </p>
        ) : null}

        {confirming ? (
          <div className="mt-3 rounded-md border border-[color:var(--color-caution-soft)] bg-caution-soft/40 p-3">
            <p className="text-sm font-semibold text-caution">Disconnect {c.mlsName}?</p>
            <p className="mt-1 text-xs text-ink-2">
              Synchronization stops immediately. Any listings synced from this feed are handled per the
              provider&apos;s retention terms — cached listings must be purged when access ends. Reports and
              shared workspaces will no longer receive updates from this MLS.
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>Keep connected</Button>
              <Button variant="primary" size="sm" onClick={() => { setConfirming(false); onDisconnect(c); }}>
                Disconnect
              </Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}
