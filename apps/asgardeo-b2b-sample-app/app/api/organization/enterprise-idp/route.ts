import { NextRequest, NextResponse } from "next/server";
import { requireScope } from "../../../lib/auth/guard";
import { Scope } from "../../../lib/auth/utils";
import { getEnterpriseIdp, upsertEnterpriseIdp, deleteEnterpriseIdp } from "../../../lib/db/queries/enterprise-idp";
import { idpCreate, idpGet, idpUpdate, idpDelete, type IdpConfig } from "../../../lib/asgardeo/client";

export async function GET(request: NextRequest) {
  const auth = await requireScope(request, [Scope.IDP_VIEW]);
  if (auth instanceof NextResponse) return auth;

  const { orgId } = auth.claims;
  const record = getEnterpriseIdp(orgId);

  if (!record) {
    return NextResponse.json({ idp: null });
  }

  const accessToken = request.headers.get("authorization")!.slice(7);

  try {
    const idp = await idpGet(accessToken, record.idp_id);
    return NextResponse.json({ idp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch identity provider.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

type CreateBody = {
  name?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
};

async function parseBody(request: NextRequest): Promise<CreateBody | NextResponse> {
  try {
    return (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}

function validateConfig(body: CreateBody): IdpConfig | NextResponse {
  const { name, clientId, clientSecret, authorizationEndpoint, tokenEndpoint, jwksUri } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 422 });
  if (!clientId?.trim()) return NextResponse.json({ error: "clientId is required." }, { status: 422 });
  if (!clientSecret?.trim()) return NextResponse.json({ error: "clientSecret is required." }, { status: 422 });
  if (!authorizationEndpoint?.trim()) return NextResponse.json({ error: "authorizationEndpoint is required." }, { status: 422 });
  if (!tokenEndpoint?.trim()) return NextResponse.json({ error: "tokenEndpoint is required." }, { status: 422 });

  return { name: name.trim(), clientId: clientId.trim(), clientSecret: clientSecret.trim(), authorizationEndpoint: authorizationEndpoint.trim(), tokenEndpoint: tokenEndpoint.trim(), jwksUri: jwksUri?.trim() || undefined };
}

export async function POST(request: NextRequest) {
  const auth = await requireScope(request, [Scope.IDP_CREATE]);
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;

  const config = validateConfig(body);
  if (config instanceof NextResponse) return config;

  const { orgId } = auth.claims;
  const accessToken = request.headers.get("authorization")!.slice(7);

  try {
    const idp = await idpCreate(accessToken, config);
    upsertEnterpriseIdp(orgId, idp.id, idp.name);
    return NextResponse.json({ idp }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create identity provider.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireScope(request, [Scope.IDP_UPDATE]);
  if (auth instanceof NextResponse) return auth;

  const { orgId } = auth.claims;
  const record = getEnterpriseIdp(orgId);

  if (!record) {
    return NextResponse.json({ error: "No identity provider configured for this organization." }, { status: 404 });
  }

  const body = await parseBody(request);
  if (body instanceof NextResponse) return body;

  const config = validateConfig(body);
  if (config instanceof NextResponse) return config;

  const accessToken = request.headers.get("authorization")!.slice(7);

  try {
    const idp = await idpUpdate(accessToken, record.idp_id, config);
    upsertEnterpriseIdp(orgId, idp.id, idp.name);
    return NextResponse.json({ idp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update identity provider.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireScope(request, [Scope.IDP_DELETE]);
  if (auth instanceof NextResponse) return auth;

  const { orgId } = auth.claims;
  const record = getEnterpriseIdp(orgId);

  if (!record) {
    return NextResponse.json({ error: "No identity provider configured for this organization." }, { status: 404 });
  }

  const accessToken = request.headers.get("authorization")!.slice(7);

  try {
    await idpDelete(accessToken, record.idp_id);
    deleteEnterpriseIdp(orgId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete identity provider.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
