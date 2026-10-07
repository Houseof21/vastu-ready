import { NextResponse } from "next/server";
import { describeConfig } from "@/providers/mls";
import { getSupportedMls, getProvider } from "@/domain/mls";

/** Non-secret connection status for an owner+MLS. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ownerKey = url.searchParams.get("ownerKey")?.trim();
  const mlsKey = url.searchParams.get("mlsKey")?.trim();
  if (!ownerKey || !mlsKey) {
    return NextResponse.json({ ok: false, message: "ownerKey and mlsKey required." }, { status: 400 });
  }
  const mls = getSupportedMls(mlsKey);
  const provider = mls ? getProvider(mls.providerKey) : undefined;
  return NextResponse.json({
    ok: true,
    mls: mls ?? null,
    provider: provider ?? null,
    config: describeConfig(ownerKey, mlsKey),
  });
}
