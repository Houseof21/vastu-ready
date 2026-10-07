import { NextResponse } from "next/server";
import { getMlsProvider, demoHotSheetEvents } from "@/providers/mls";
import { getSupportedMls } from "@/domain/mls";
import { applyEvents, emptyHotSheet, listingsList, listingForClient } from "@/domain/hotsheet";

/**
 * Hot-sheet listings for an owner+MLS.
 *  - mode=demo  → clearly-labeled demo inventory (distinct from live), processed
 *                 through the real dedup/checkpoint engine.
 *  - mode=live  → the authorized feed. Returns live:false + no listings until a
 *                 real, approved connection exists (never simulated).
 *  - view=client → agent-only fields are stripped (server-enforced).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ownerKey = url.searchParams.get("ownerKey")?.trim() ?? "";
  const mlsKey = url.searchParams.get("mlsKey")?.trim() ?? "";
  const mode = url.searchParams.get("mode") === "live" ? "live" : "demo";
  const view = url.searchParams.get("view") === "client" ? "client" : "agent";
  if (!ownerKey || !mlsKey) {
    return NextResponse.json({ ok: false, message: "ownerKey and mlsKey required." }, { status: 400 });
  }
  const mls = getSupportedMls(mlsKey);
  if (!mls) return NextResponse.json({ ok: false, message: "Unknown MLS." }, { status: 404 });

  if (mode === "live") {
    const provider = getMlsProvider(mls.providerKey);
    const pull = await provider.pullEvents({ ownerKey, mlsKey, scope: null }, null);
    const state = applyEvents(emptyHotSheet(), pull.events);
    const rows = listingsList(state).map((l) => (view === "client" ? listingForClient(l) : l));
    return NextResponse.json({
      ok: true,
      mode,
      view,
      live: pull.live,
      message: pull.message,
      count: rows.length,
      listings: rows,
    });
  }

  // Demo: deterministic, clearly-labeled inventory through the real engine.
  // Applying twice proves idempotency (no duplicates).
  const events = demoHotSheetEvents(mlsKey);
  let state = applyEvents(emptyHotSheet(), events);
  state = applyEvents(state, events); // replay — must not duplicate
  const rows = listingsList(state).map((l) => (view === "client" ? listingForClient(l) : l));
  return NextResponse.json({
    ok: true,
    mode,
    view,
    live: false,
    demo: true,
    message: "Demo inventory (fictional, not a live MLS feed).",
    count: rows.length,
    newCount: state.newListingKeys.length,
    listings: rows,
  });
}
