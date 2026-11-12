"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { Container, Card, CardBody, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { gisResultToProperty } from "@/providers/gis/to-property";
import type { GisOrientationResult } from "@/providers/gis/orientation-from-gis";

const EXAMPLES = ["2515 Sanderson Dr, Raleigh, NC 27608", "1203 N Mangum St, Durham, NC 27701"];

export default function AnalyzeByAddressPage() {
  const router = useRouter();
  const { upsertProperty } = useUserState();
  const [address, setAddress] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run(addr: string) {
    if (!addr.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gis-orientation?address=${encodeURIComponent(addr)}`);
      const data = (await res.json()) as GisOrientationResult;
      if (!data.ok) {
        setError(data.message || "Couldn't derive orientation for that address.");
        return;
      }
      const property = gisResultToProperty(data);
      if (!property) {
        setError("Couldn't build a property from the county data.");
        return;
      }
      upsertProperty(property);
      router.push(`/property/${property.id}`);
    } catch {
      setError("Request failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-8">
      <Link href="/analyze" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-forest">
        <ArrowLeft size={15} /> Analyze
      </Link>
      <div className="mx-auto mt-4 max-w-2xl">
        <Eyebrow>Analyze by address</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Look up a home&apos;s orientation</h1>
        <p className="mt-2 text-ink-2">
          Enter any US address. In Wake County we pull the full parcel, footprint, and streets (facing, lot,
          road, open-space); elsewhere we derive the facing from the national building footprint alone (lower
          fidelity). Either way you confirm the entrance — no listing feed carries this, and nothing is fabricated.
        </p>

        <Card className="mt-6">
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run(address)}
                  placeholder="123 Main St, Raleigh, NC 27601"
                  className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                />
              </div>
              <Button variant="primary" onClick={() => run(address)} disabled={loading}>
                {loading ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Looking up…</span> : "Analyze"}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => { setAddress(ex); run(ex); }} className="rounded-pill border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2">
                  {ex.split(",")[0]}
                </button>
              ))}
            </div>
            {error ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-caution">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
              </p>
            ) : null}
          </CardBody>
        </Card>

        <p className="mt-4 text-xs text-muted">
          Full county facts (lot/size/year/assessed value) are available in Wake County today; other areas return
          footprint-derived facing only. Either way, beds, baths, and interior rooms stay unknown until you add them.
        </p>
      </div>
    </Container>
  );
}
