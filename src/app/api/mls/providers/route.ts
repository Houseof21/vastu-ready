import { NextResponse } from "next/server";
import { SUPPORTED_MLS, MLS_PROVIDERS } from "@/domain/mls";

/** Public registry of supported MLS organizations + provider info. No secrets. */
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ supported: SUPPORTED_MLS, providers: MLS_PROVIDERS });
}
