import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../lib/auth/guard";
import { listFlights } from "../../lib/db/queries/flights";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);

  const flights = listFlights({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    cabin: searchParams.get("cabin") ?? undefined,
  });

  return NextResponse.json({ flights });
}
