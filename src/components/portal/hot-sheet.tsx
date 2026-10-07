"use client";

import * as React from "react";
import { RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { ownerKeyFor, fetchHotSheet, type HotSheetRow } from "@/lib/mls-client";
import { formatUsd } from "@/lib/format";

/**
 * MLS hot sheet. Demo inventory is clearly labeled and kept distinct from a live
 * feed; live mode shows real listings only when a real connection exists (it
 * never simulates one). Client view strips agent-only fields (enforced server-side).
 */
export function HotSheet() {
  const { realtorProfile, mlsConnections } = useUserState();
  const owner = ownerKeyFor(realtorProfile);
  const conn = mlsConnections.find((c) => !c.requested);
  const mlsKey = conn?.mlsKey || realtorProfile?.mlsOrg || "doorify";

  const [mode, setMode] = React.useState<"demo" | "live">("demo");
  const [view, setView] = React.useState<"agent" | "client">("agent");
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<Awaited<ReturnType<typeof fetchHotSheet>> | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchHotSheet({ ownerKey: owner, mlsKey, mode, view }));
    } finally {
      setLoading(false);
    }
  }, [owner, mlsKey, mode, view]);

  React.useEffect(() => {
    let active = true;
    // Defer past a tick so the setState in load() is asynchronous, not a
    // synchronous cascade within the effect body.
    void (async () => {
      await Promise.resolve();
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>MLS hot sheet</Eyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">Hot Sheet</h1>
          <p className="mt-1 text-sm text-ink-2">{mlsKey} · {conn ? conn.providerLabel : "no connection configured"}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Toggle label="Demo inventory" active={mode === "demo"} onClick={() => setMode("demo")} />
        <Toggle label="Live feed" active={mode === "live"} onClick={() => setMode("live")} />
        <span className="mx-1 w-px bg-line" />
        <Toggle label="Agent view" active={view === "agent"} onClick={() => setView("agent")} />
        <Toggle label="Client view" active={view === "client"} onClick={() => setView("client")} />
      </div>

      {data ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            {data.demo ? <Badge tone="caution">Demo data</Badge> : data.live ? <Badge tone="good">Live</Badge> : <Badge tone="neutral">Not live</Badge>}
            <span>{data.message}</span>
          </div>

          {mode === "live" && !data.live ? (
            <Card className="mt-3">
              <CardBody>
                <p className="flex items-center gap-2 text-sm font-medium text-ink"><AlertTriangle size={15} className="text-caution" /> No live feed yet</p>
                <p className="mt-1 text-sm text-ink-2">
                  A live feed appears only after your MLS approves this application and credentials are
                  configured. Complete the steps in Settings → Connect your MLS. Nothing is simulated.
                </p>
              </CardBody>
            </Card>
          ) : null}

          {data.listings.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">Address</th>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 pr-3 font-medium text-right">Price</th>
                    <th className="py-2 pr-3 font-medium text-right">Bd/Ba</th>
                    <th className="py-2 pr-3 font-medium text-right">Sq ft</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    {view === "agent" ? <th className="py-2 font-medium">Agent-only</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((l: HotSheetRow) => (
                    <tr key={l.key} className="border-b border-line-2 text-ink-2">
                      <td className="py-2 pr-3 text-ink">{l.address}</td>
                      <td className="py-2 pr-3"><span className="rounded-pill border border-line px-2 py-0.5 text-[0.65rem]">{l.sourceMls}</span></td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(l.price)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{l.beds}/{l.baths}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{l.sqft.toLocaleString()}</td>
                      <td className="py-2 pr-3">{l.status}</td>
                      {view === "agent" ? (
                        <td className="py-2 text-xs text-muted">{l.privateRemarks ?? "—"}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {view === "client" ? (
                <p className="mt-2 text-xs text-muted">Agent-only fields (private remarks, showing instructions) are hidden in client view — enforced on the server.</p>
              ) : null}
            </div>
          ) : mode === "demo" ? (
            <p className="mt-3 text-sm text-ink-2">No demo listings.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-pill border px-3 py-1.5 text-xs font-medium ${active ? "border-forest bg-sage-soft text-forest" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}
    >
      {label}
    </button>
  );
}
