"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { Container, Card, CardBody, Eyebrow } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import type { GisOrientationResult } from "@/providers/gis/orientation-from-gis";
import type { Property } from "@/domain/property";
import type { MlsCrossRef } from "@/domain/listing";

type LookupResponse = {
  ok: boolean;
  gis: GisOrientationResult;
  property: Property | null;
  crossRef: MlsCrossRef | null;
  listing: { connected: boolean; found: boolean; message: string; candidatesConsidered: number };
};

const EXAMPLES = ["2515 Sanderson Dr, Raleigh, NC 27608", "1203 N Mangum St, Durham, NC 27701"];

export default function AnalyzeByAddressPage() {
  // useSearchParams requires a Suspense boundary for static prerendering.
  return (
    <React.Suspense fallback={null}>
      <AddressLookup />
    </React.Suspense>
  );
}

function AddressLookup() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const { upsertProperty } = useUserState();
  const [address, setAddress] = React.useState(q);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [failedAddr, setFailedAddr] = React.useState<string | null>(null);
  const ranRef = React.useRef(false);

  const run = React.useCallback(
    async (addr: string) => {
      if (!addr.trim()) return;
      setLoading(true);
      setError(null);
      setFailedAddr(null);
      try {
        const res = await fetch(`/api/property-lookup?address=${encodeURIComponent(addr)}`);
        const data = (await res.json()) as LookupResponse;
        if (!data.ok || !data.property) {
          const stage = data.gis?.stage;
          setError(
            stage === "geocode"
              ? "We couldn't find that address in the free public datasets — the spelling may differ, or it may be too new. You can still analyze it by entering the details yourself."
              : data.gis?.message || "Couldn't derive orientation for that address.",
          );
          setFailedAddr(addr);
          return;
        }
        upsertProperty(data.property);
        router.push(`/property/${data.property.id}`);
      } catch {
        setError("Request failed. Try again.");
        setFailedAddr(addr);
      } finally {
        setLoading(false);
      }
    },
    [router, upsertProperty],
  );

  // Auto-run when arriving with ?q= (e.g. from the Analyze box).
  React.useEffect(() => {
    if (q && !ranRef.current) {
      ranRef.current = true;
      void run(q);
    }
  }, [q, run]);

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
              <div className="mt-3 rounded-lg border border-[color:var(--color-caution-soft)] bg-caution-soft/40 p-3">
                <p className="flex items-start gap-2 text-sm text-ink-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-caution" /> {error}
                </p>
                <div className="mt-2">
                  <ButtonLink
                    href={`/analyze/manual${failedAddr ? `?address=${encodeURIComponent(failedAddr)}` : ""}`}
                    variant="primary"
                    size="sm"
                  >
                    Enter details manually instead
                  </ButtonLink>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <p className="mt-4 text-xs text-muted">
          Full county facts (lot/size/year/assessed value) are available in Wake County today; other areas return
          footprint-derived facing only. Beds, baths, and the floor plan come from a connected licensed MLS feed when
          the home has a matching listing — cross-referenced against the county record, with the listing&apos;s own
          location used to pin the exact house. Without a feed (or for a never-listed home) those stay unknown until you
          add them by hand. Nothing is scraped or guessed.
        </p>
      </div>
    </Container>
  );
}
