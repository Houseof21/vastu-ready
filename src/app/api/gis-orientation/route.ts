import { NextResponse } from "next/server";
import { deriveOrientationFromAddress } from "@/providers/gis/orientation-from-gis";

/**
 * GIS orientation proof of concept (Wake County). GET ?address=<street address>.
 * Derives a home's exterior orientation from county footprint + parcel + streets.
 * Runs only on the server (reaches public GIS services).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ ok: false, stage: "geocode", message: "Provide ?address=" }, { status: 400 });
  }
  try {
    const result = await deriveOrientationFromAddress(address);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, stage: "error", message: `GIS lookup failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
