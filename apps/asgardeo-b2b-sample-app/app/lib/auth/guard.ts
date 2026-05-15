import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { USER_ROLE_TO_ASGARDEO_ROLE, UserRole } from "./utils";

export interface TokenClaims {
  orgId: string;
  roles: string[];
}

const baseUrl = (process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL ?? "").replace(/\/$/, "");
const jwksUrl = new URL(`${baseUrl}/oauth2/jwks`);

const JWKS = createRemoteJWKSet(jwksUrl);

/**
 * Validates the Bearer token and returns extracted claims, or a 401 response.
 *
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ claims: TokenClaims } | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    const orgId = typeof payload.org_id === "string" ? payload.org_id : "";

    if (!orgId) {
      return NextResponse.json({ error: "Token is missing org_id claim." }, { status: 401 });
    }

    const roles = Array.isArray(payload.roles)
      ? (payload.roles as unknown[]).map(String)
      : [];

    return { claims: { orgId, roles } };
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
}

/**
 * Like requireAuth, but also enforces that the caller has one of the allowed roles.
 * Returns a 403 response when the token is valid but the role requirement is not met.
 *
 *   const auth = await requireRole(request, [UserRole.ADMIN]);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ claims: TokenClaims } | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  const allowed = allowedRoles.map((r) => USER_ROLE_TO_ASGARDEO_ROLE[r]);
  const hasRole = result.claims.roles.some((r) => allowed.includes(r));

  if (!hasRole) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  return result;
}
