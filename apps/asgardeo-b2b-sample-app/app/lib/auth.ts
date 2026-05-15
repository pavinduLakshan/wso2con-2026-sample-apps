export enum UserRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}

const ROLE_NAME_ADMIN = process.env.NEXT_PUBLIC_ASGARDEO_ADMIN_ROLE_NAME ?? "admin";
const ROLE_NAME_MEMBER = process.env.NEXT_PUBLIC_ASGARDEO_MEMBER_ROLE_NAME ?? "member";

export interface AppUser {
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  orgName: string;
  permissions: string[];
}

export function getRoleFromPermissions(permissions: string[]): UserRole {
  if (permissions.includes(ROLE_NAME_ADMIN)) return UserRole.ADMIN;
  if (permissions.includes(ROLE_NAME_MEMBER)) return UserRole.MEMBER;
  return UserRole.MEMBER;
}

export function buildUserFromTokens(
  accessPayload: Record<string, unknown>,
  idPayload: Record<string, unknown>
): AppUser {
  const roles = Array.isArray(accessPayload.roles) ? (accessPayload.roles as unknown[]).map(String) : [];

  return {
    email: typeof idPayload.email === "string" ? idPayload.email : "",
    firstName: typeof idPayload.given_name === "string" ? idPayload.given_name : "",
    lastName: typeof idPayload.family_name === "string" ? idPayload.family_name : "",
    orgId: typeof idPayload.org_id === "string" ? idPayload.org_id : (typeof accessPayload.org_id === "string" ? accessPayload.org_id : ""),
    orgName: typeof idPayload.org_name === "string" ? idPayload.org_name : (typeof accessPayload.org_name === "string" ? accessPayload.org_name : ""),
    permissions: roles
  };
}
