const getBaseUrl = () => (process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL ?? "").replace(/\/$/, "");
const getUserStoreName = () => process.env.ASGARDEO_USER_STORE_NAME ?? "DEFAULT";

export interface ScimUser {
  id: string;
  userName: string;
  name?: { givenName?: string; familyName?: string };
  emails?: string[] | Array<{ value: string; primary?: boolean }>;
  "urn:scim:wso2:schema"?: { accountLocked?: string };
}

export interface ScimRole {
  id: string;
  displayName: string;
}

export async function scimCreateUser(
  accessToken: string,
  { email, givenName, familyName }: { email: string; givenName?: string; familyName?: string }
): Promise<ScimUser> {
  const body: Record<string, unknown> = {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:scim:wso2:schema"],
    emails: [{ primary: true, value: email }],
    "urn:scim:wso2:schema": { askPassword: "true" },
    userName: `${getUserStoreName()}/${email}`,
  };

  if (givenName || familyName) {
    body.name = { givenName, familyName };
  }

  const response = await fetch(`${getBaseUrl()}/o/scim2/Users`, {
    body: JSON.stringify(body),
    headers: {
      Accept: "application/scim+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/scim+json",
    },
    method: "POST",
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.detail === "string" ? json.detail :
      typeof json?.Errors?.[0]?.description === "string" ? json.Errors[0].description :
      typeof json?.message === "string" ? json.message :
      "Failed to create user.";
    console.error("[asgardeo/client] scimCreateUser failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  return json as ScimUser;
}

export async function scimFetchRoleIdByName(accessToken: string, roleName: string): Promise<string | null> {
  const filter = encodeURIComponent(`displayName eq ${roleName}`);
  const response = await fetch(`${getBaseUrl()}/o/scim2/v2/Roles?filter=${filter}`, {
    headers: {
      Accept: "application/scim+json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Failed to fetch role "${roleName}".`);
  }

  const resources = json?.Resources;
  if (!Array.isArray(resources) || resources.length === 0) return null;
  return typeof resources[0]?.id === "string" ? resources[0].id : null;
}

export async function scimListUsers(
  accessToken: string,
  { count = 100, startIndex = 1 }: { count?: number; startIndex?: number } = {}
): Promise<{ users: ScimUser[]; totalResults: number }> {
  const params = new URLSearchParams({ count: String(count), startIndex: String(startIndex) });
  const response = await fetch(`${getBaseUrl()}/o/scim2/Users?${params}`, {
    headers: {
      Accept: "application/scim+json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.detail === "string" ? json.detail :
      typeof json?.message === "string" ? json.message :
      "Failed to fetch users.";
    console.error("[asgardeo/client] scimListUsers failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  const users: ScimUser[] = Array.isArray(json?.Resources) ? json.Resources : [];
  return { users, totalResults: typeof json?.totalResults === "number" ? json.totalResults : users.length };
}

export async function scimAssignRoleToUser(accessToken: string, roleId: string, userId: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/o/scim2/v2/Roles/${roleId}`, {
    body: JSON.stringify({
      Operations: [{ op: "add", path: "users", value: [{ value: userId }] }],
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    }),
    headers: {
      Accept: "application/scim+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/scim+json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    const message = typeof json?.detail === "string" ? json.detail : "Failed to assign role to user.";
    throw new Error(message);
  }
}
