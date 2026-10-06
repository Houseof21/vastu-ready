"use client";

import * as React from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";

type Result =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ingested"; notice: string };

export function AnalyzeForm() {
  const [url, setUrl] = React.useState("");
  const [result, setResult] = React.useState<Result>({ kind: "idle" });
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setResult({ kind: "error", message: "Enter a full listing URL starting with http(s)://" });
      return;
    }
    setBusy(true);
    // Simulate the licensed-provider ingestion handoff (no scraping).
    await new Promise((r) => setTimeout(r, 450));
    setResult({
      kind: "ingested",
      notice:
        "Automated ingestion requires a licensed MLS or data-provider feed, which isn't connected in this demo. We won't guess this home's details — continue with manual entry to analyze it accurately.",
    });
    setBusy(false);
  }

  const known = ["zillow.com", "redfin.com", "realtor.com", "compass.com"];
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.zillow.com/homedetails/..."
          className="w-full rounded-pill border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline-none"
          aria-label="Listing URL"
        />
        <Button type="submit" disabled={busy} className="shrink-0">
          {busy ? "Checking…" : "Analyze"}
        </Button>
      </form>

      {host && known.includes(host) ? (
        <p className="mt-2 text-xs text-muted">
          Recognized <span className="font-medium text-ink-2">{host}</span> listing.
        </p>
      ) : null}

      {result.kind === "error" ? (
        <p className="mt-3 text-sm text-concern">{result.message}</p>
      ) : null}

      {result.kind === "ingested" ? (
        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
          <div className="flex items-center gap-2">
            <Badge tone="caution">Needs verification</Badge>
            <span className="text-sm font-semibold text-ink">Listing received</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{result.notice}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href={`/analyze/manual${url ? `?url=${encodeURIComponent(url)}` : ""}`} variant="primary" size="sm">
              Continue with manual entry
            </ButtonLink>
            <ButtonLink href="/feed" variant="secondary" size="sm">
              Browse demo homes instead
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
