"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";

type Result =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ingested"; notice: string };

const isUrl = (s: string) => /^https?:\/\/.+/i.test(s);
// An address: has a number and letters (and isn't a URL).
const looksLikeAddress = (s: string) => !isUrl(s) && /\d/.test(s) && /[a-z]/i.test(s) && s.trim().length >= 5;

export function AnalyzeForm() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [result, setResult] = React.useState<Result>({ kind: "idle" });
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();

    // Typed an address? Route to the address lookup instead of the listing/MLS path.
    if (looksLikeAddress(trimmed)) {
      router.push(`/analyze/address?q=${encodeURIComponent(trimmed)}`);
      return;
    }
    if (!isUrl(trimmed)) {
      setResult({ kind: "error", message: "Enter a listing URL (starting with http) — or a street address to look it up." });
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    setResult({
      kind: "ingested",
      notice:
        "Automated ingestion from a listing link requires a licensed MLS or data-provider feed, which isn't connected in this demo. We won't guess this home's details — look it up by address above, or continue with manual entry.",
    });
    setBusy(false);
  }

  const host = (() => {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();
  const known = ["zillow.com", "redfin.com", "realtor.com", "compass.com"];

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a listing link — or type a street address"
          className="w-full rounded-pill border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline-none"
          aria-label="Listing URL or address"
        />
        <Button type="submit" disabled={busy} className="shrink-0">
          {busy ? "Checking…" : "Analyze"}
        </Button>
      </form>

      {looksLikeAddress(value) ? (
        <p className="mt-2 text-xs text-forest">That looks like an address — we&apos;ll look it up from county/footprint data.</p>
      ) : host && known.includes(host) ? (
        <p className="mt-2 text-xs text-muted">
          Recognized <span className="font-medium text-ink-2">{host}</span> listing.
        </p>
      ) : null}

      {result.kind === "error" ? <p className="mt-3 text-sm text-concern">{result.message}</p> : null}

      {result.kind === "ingested" ? (
        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
          <div className="flex items-center gap-2">
            <Badge tone="caution">Needs verification</Badge>
            <span className="text-sm font-semibold text-ink">Listing received</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{result.notice}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/analyze/address" variant="primary" size="sm">Look up by address</ButtonLink>
            <ButtonLink href={`/analyze/manual${value ? `?url=${encodeURIComponent(value)}` : ""}`} variant="secondary" size="sm">
              Enter details manually
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
