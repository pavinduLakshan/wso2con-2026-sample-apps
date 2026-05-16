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

export async function scimSendPasswordResetLink(accessToken: string, userId: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/o/scim2/Users/${userId}`, {
    body: JSON.stringify({
      Operations: [{ op: "add", value: { "urn:scim:wso2:schema": { forcePasswordReset: "true" } } }],
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
    const message = typeof json?.detail === "string" ? json.detail : "Failed to send password reset link.";
    console.error("[asgardeo/client] scimSendPasswordResetLink failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }
}

export async function scimUpdateAccountLocked(accessToken: string, userId: string, locked: boolean): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/o/scim2/Users/${userId}`, {
    body: JSON.stringify({
      Operations: [{ op: "replace", value: { "urn:scim:wso2:schema": { accountLocked: String(locked) } } }],
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
    const message = typeof json?.detail === "string" ? json.detail : `Failed to ${locked ? "lock" : "unlock"} account.`;
    console.error("[asgardeo/client] scimUpdateAccountLocked failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }
}

export interface ScimRoleWithUsers {
  id: string;
  displayName: string;
  users?: Array<{ value: string }>;
}

export async function scimListRolesWithUsers(accessToken: string): Promise<ScimRoleWithUsers[]> {
  const response = await fetch(`${getBaseUrl()}/o/scim2/v2/Roles?attributes=id,displayName,users`, {
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
      "Failed to fetch roles.";
    console.error("[asgardeo/client] scimListRolesWithUsers failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  return Array.isArray(json?.Resources) ? json.Resources : [];
}

export async function scimGetRoleById(accessToken: string, roleId: string): Promise<ScimRoleWithUsers> {
  const response = await fetch(`${getBaseUrl()}/o/scim2/v2/Roles/${roleId}`, {
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
      `Failed to fetch role ${roleId}.`;
    console.error("[asgardeo/client] scimGetRoleById failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  return json as ScimRoleWithUsers;
}

export async function scimUpdateRoleUsers(
  accessToken: string,
  roleId: string,
  toAdd: string[],
  toRemove: string[]
): Promise<void> {
  if (toAdd.length === 0 && toRemove.length === 0) return;

  const operations = [
    ...toAdd.map((userId) => ({ op: "add", path: "users", value: [{ value: userId }] })),
    ...toRemove.map((userId) => ({ op: "remove", path: `users[value eq "${userId}"]` })),
  ];

  const response = await fetch(`${getBaseUrl()}/o/scim2/v2/Roles/${roleId}`, {
    body: JSON.stringify({
      Operations: operations,
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
    const message = typeof json?.detail === "string" ? json.detail : "Failed to update role users.";
    console.error("[asgardeo/client] scimUpdateRoleUsers failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }
}

export interface IdpConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri?: string;
}

export interface IdpDetail {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
}

function buildIdpPayload(config: IdpConfig): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  const callbackUrl = `${baseUrl}/commonauth`;

  return {
    image: "assets/images/logos/enterprise.svg",
    isPrimary: false,
    roles: { mappings: [], outboundProvisioningRoles: [] },
    certificate: {
      jwksUri: config.jwksUri ?? "",
      certificates: [""],
    },
    claims: {
      userIdClaim: { uri: "" },
      provisioningClaims: [],
      roleClaim: { uri: "" },
    },
    name: config.name,
    description: "",
    federatedAuthenticators: {
      defaultAuthenticatorId: "T3BlbklEQ29ubmVjdEF1dGhlbnRpY2F0b3I",
      authenticators: [
        {
          isEnabled: true,
          authenticatorId: "T3BlbklEQ29ubmVjdEF1dGhlbnRpY2F0b3I",
          properties: [
            { key: "ClientId", value: config.clientId },
            { key: "ClientSecret", value: config.clientSecret },
            { key: "OAuth2AuthzEPUrl", value: config.authorizationEndpoint },
            { key: "OAuth2TokenEPUrl", value: config.tokenEndpoint },
            { key: "callbackUrl", value: callbackUrl },
          ],
        },
      ],
    },
    homeRealmIdentifier: "",
    provisioning: {
      jit: { userstore: "DEFAULT", scheme: "PROVISION_SILENTLY", isEnabled: true },
    },
    isFederationHub: false,
    templateId: "enterprise-oidc-idp",
  };
}

function extractIdpDetail(json: Record<string, unknown>): IdpDetail {
  const authenticators = (
    (json?.federatedAuthenticators as Record<string, unknown>)?.authenticators as Array<Record<string, unknown>>
  ) ?? [];
  const properties: Array<{ key: string; value: string }> =
    (authenticators[0]?.properties as Array<{ key: string; value: string }>) ?? [];

  const prop = (key: string) => properties.find((p) => p.key === key)?.value ?? "";

  return {
    id: typeof json.id === "string" ? json.id : "",
    name: typeof json.name === "string" ? json.name : "",
    clientId: prop("ClientId"),
    clientSecret: prop("ClientSecret"),
    authorizationEndpoint: prop("OAuth2AuthzEPUrl"),
    tokenEndpoint: prop("OAuth2TokenEPUrl"),
    jwksUri: typeof (json?.certificate as Record<string, unknown>)?.jwksUri === "string"
      ? ((json.certificate as Record<string, unknown>).jwksUri as string)
      : "",
  };
}

export async function idpCreate(accessToken: string, config: IdpConfig): Promise<IdpDetail> {
  const response = await fetch(`${getBaseUrl()}/o/api/v1/identity-providers`, {
    method: "POST",
    body: JSON.stringify(buildIdpPayload(config)),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.description === "string" ? json.description :
      typeof json?.message === "string" ? json.message :
      "Failed to create identity provider.";
    console.error("[asgardeo/client] idpCreate failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  return extractIdpDetail(json as Record<string, unknown>);
}

export async function idpGet(accessToken: string, idpId: string): Promise<IdpDetail> {
  const response = await fetch(`${getBaseUrl()}/o/api/v1/identity-providers/${idpId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.description === "string" ? json.description :
      typeof json?.message === "string" ? json.message :
      "Failed to fetch identity provider.";
    console.error("[asgardeo/client] idpGet failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  return extractIdpDetail(json as Record<string, unknown>);
}

export async function idpUpdate(accessToken: string, idpId: string, config: IdpConfig): Promise<IdpDetail> {
  const response = await fetch(`${getBaseUrl()}/o/api/v1/identity-providers/${idpId}`, {
    method: "PUT",
    body: JSON.stringify(buildIdpPayload(config)),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.description === "string" ? json.description :
      typeof json?.message === "string" ? json.message :
      "Failed to update identity provider.";
    console.error("[asgardeo/client] idpUpdate failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }

  return extractIdpDetail(json as Record<string, unknown>);
}

export async function idpDelete(accessToken: string, idpId: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/o/api/v1/identity-providers/${idpId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    const message =
      typeof json?.description === "string" ? json.description :
      typeof json?.message === "string" ? json.message :
      "Failed to delete identity provider.";
    console.error("[asgardeo/client] idpDelete failed:", response.status, JSON.stringify(json));
    throw new Error(message);
  }
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
