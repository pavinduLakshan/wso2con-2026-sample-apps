import { asgardeo } from "@asgardeo/nextjs/server";

export type UserRole = "ADMIN" | "MEMBER";

type TokenPayload = Record<string, unknown>;

const roleClaimKeys = [
  "role",
  "roles",
  "groups",
  "application_roles",
  "http://wso2.org/claims/roles"
];

function normalizeRole(value: unknown): UserRole | null {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,\s]+/) : [];
  const normalizedValues = values.map((item) => String(item).toLowerCase());

  if (normalizedValues.includes("admin")) {
    return "ADMIN";
  }

  if (normalizedValues.includes("member")) {
    return "MEMBER";
  }

  return null;
}

function decodeJwtPayload(token: string): TokenPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const client = await asgardeo();
    const sessionId = await client.getSessionId();

    if (sessionId) {
      const token = await client.getAccessToken(sessionId);
      const payload = decodeJwtPayload(token);

      for (const claimKey of roleClaimKeys) {
        const role = normalizeRole(payload?.[claimKey]);

        if (role) {
          return role;
        }
      }
    }
  } catch {
    // Use the configured demo role when token claims are unavailable locally.
  }

  return normalizeRole(process.env.DEMO_USER_ROLE ?? process.env.NEXT_PUBLIC_DEMO_ROLE) ?? "MEMBER";
}
