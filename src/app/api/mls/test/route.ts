import { NextResponse } from "next/server";
import { getMlsProvider } from "@/providers/mls";
import { getSupportedMls, getProvider } from "@/domain/mls";

/**
 * Test an MLS connection. Returns ok:true (connected) ONLY when a real token +
 * data probe succeed. A provider error never yields a connected state.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, state: "needs_attention", message: "Invalid JSON body." }, { status: 400 });
  }
  const ownerKey = String(body.ownerKey ?? "").trim();
  const mlsKey = String(body.mlsKey ?? "").trim();
  if (!ownerKey || !mlsKey) {
    return NextResponse.json({ ok: false, state: "not_connected", message: "ownerKey and mlsKey required." }, { status: 400 });
  }
  const mls = getSupportedMls(mlsKey);
  const providerKey = mls?.providerKey ?? "";
  if (!mls || !mls.supported || !getProvider(providerKey)) {
    return NextResponse.json({
      ok: false,
      state: "awaiting_approval",
      message: "This MLS isn't supported yet — your request is pending, not connected.",
    });
  }
  const provider = getMlsProvider(providerKey);
  const result = await provider.testConnection({ ownerKey, mlsKey, scope: null });
  return NextResponse.json({ ...result });
}
