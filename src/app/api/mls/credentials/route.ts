import { NextResponse } from "next/server";
import { setCredentials, describeConfig, type MlsCreds } from "@/providers/mls";

/**
 * Accept MLS API credentials through a secure, server-side configuration flow.
 * Secrets are stored server-side only and NEVER echoed back, logged, or placed
 * in a URL. The response contains only non-secret metadata.
 *
 * In production this persists to an encrypted-at-rest store keyed by the
 * authenticated owner; here it uses the server-process secure config.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }
  const ownerKey = String(body.ownerKey ?? "").trim();
  const mlsKey = String(body.mlsKey ?? "").trim();
  const authMethod = String(body.authMethod ?? "");
  if (!ownerKey || !mlsKey) {
    return NextResponse.json({ ok: false, message: "ownerKey and mlsKey are required." }, { status: 400 });
  }

  let creds: MlsCreds | null = null;
  if (authMethod === "oauth") {
    const clientId = String(body.clientId ?? "").trim();
    const clientSecret = String(body.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      return NextResponse.json({ ok: false, message: "clientId and clientSecret are required." }, { status: 400 });
    }
    creds = {
      kind: "oauth",
      clientId,
      clientSecret,
      tokenUrl: body.tokenUrl ? String(body.tokenUrl) : undefined,
      apiBase: body.apiBase ? String(body.apiBase) : undefined,
    };
  } else if (authMethod === "api_credentials") {
    const apiToken = String(body.apiToken ?? "").trim();
    if (!apiToken) {
      return NextResponse.json({ ok: false, message: "apiToken is required." }, { status: 400 });
    }
    creds = { kind: "api_key", apiToken, apiBase: body.apiBase ? String(body.apiBase) : undefined };
  } else {
    return NextResponse.json({ ok: false, message: "Unsupported authMethod." }, { status: 400 });
  }

  setCredentials(ownerKey, mlsKey, creds);
  // Return ONLY non-secret metadata.
  return NextResponse.json({ ok: true, ...describeConfig(ownerKey, mlsKey) });
}
