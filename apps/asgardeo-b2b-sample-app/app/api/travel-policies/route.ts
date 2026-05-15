import { NextRequest, NextResponse } from "next/server";
import { getTravelPolicy, upsertTravelPolicy, deleteTravelPolicy, TravelPolicy } from "../../lib/db/queries/travel-policies";
import { requireScope } from "../../lib/auth/guard";
import { Scope } from "../../lib/auth/utils";

export async function GET(request: NextRequest) {
  const auth = await requireScope(request, [Scope.TRAVEL_POLICY_VIEW]);
  if (auth instanceof NextResponse) return auth;

  const policy = getTravelPolicy(auth.claims.orgId);

  return NextResponse.json({ policy });
}

type UpsertBody = {
  domestic_cabin?: string;
  intl_cabin?: string;
  long_haul_hours?: number;
  price_cap_percent?: number;
  min_days_advance?: number;
};

async function parseUpsertBody(request: NextRequest): Promise<UpsertBody | NextResponse> {
  try {
    return (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireScope(request, [Scope.TRAVEL_POLICY_CREATE]);
  if (auth instanceof NextResponse) return auth;

  const body = await parseUpsertBody(request);
  if (body instanceof NextResponse) return body;

  const { domestic_cabin, intl_cabin, long_haul_hours, price_cap_percent, min_days_advance } = body;
  const { orgId } = auth.claims;

  const created: Omit<TravelPolicy, "id" | "org_id" | "updated_at"> = {
    domestic_cabin: domestic_cabin ?? "Economy",
    intl_cabin: intl_cabin ?? "Business",
    long_haul_hours: long_haul_hours ?? 8,
    price_cap_percent: price_cap_percent ?? 20,
    min_days_advance: min_days_advance ?? 14,
  };

  const policy = upsertTravelPolicy(orgId, created);

  return NextResponse.json({ policy }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await requireScope(request, [Scope.TRAVEL_POLICY_UPDATE]);
  if (auth instanceof NextResponse) return auth;

  const body = await parseUpsertBody(request);
  if (body instanceof NextResponse) return body;

  const { domestic_cabin, intl_cabin, long_haul_hours, price_cap_percent, min_days_advance } = body;
  const { orgId } = auth.claims;

  const defaults = getTravelPolicy(orgId);

  const updated: Omit<TravelPolicy, "id" | "org_id" | "updated_at"> = {
    domestic_cabin: domestic_cabin ?? defaults?.domestic_cabin ?? "Economy",
    intl_cabin: intl_cabin ?? defaults?.intl_cabin ?? "Business",
    long_haul_hours: long_haul_hours ?? defaults?.long_haul_hours ?? 8,
    price_cap_percent: price_cap_percent ?? defaults?.price_cap_percent ?? 20,
    min_days_advance: min_days_advance ?? defaults?.min_days_advance ?? 14,
  };

  const policy = upsertTravelPolicy(orgId, updated);

  return NextResponse.json({ policy });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireScope(request, [Scope.TRAVEL_POLICY_DELETE]);
  if (auth instanceof NextResponse) return auth;

  deleteTravelPolicy(auth.claims.orgId);

  return new NextResponse(null, { status: 204 });
}
