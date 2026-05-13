import { createOrganization, type CreateOrganizationPayload } from "@asgardeo/node";
import { NextResponse } from "next/server";

type OnboardingRequest = {
  email?: string;
  familyName?: string;
  givenName?: string;
  organizationName?: string;
  password?: string;
};

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

const ONBOARDING_ERROR_MESSAGE = "We couldn't create your organization right now. Please try again in a moment.";

const baseUrl = process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL;
const clientId = process.env.ASGARDEO_CLIENT_ID ?? process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID;
const clientSecret = process.env.ASGARDEO_CLIENT_SECRET ?? process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_SECRET;
const parentOrganizationId =
  process.env.ASGARDEO_ONBOARDING_PARENT_ORGANIZATION_ID ?? process.env.ASGARDEO_PARENT_ORGANIZATION_ID;
const rootTokenScopes =
  process.env.ASGARDEO_ONBOARDING_ROOT_SCOPES ??
  "internal_organization_create internal_organization_view internal_org_user_mgt_create internal_org_user_mgt_list";
const organizationTokenScopes =
  process.env.ASGARDEO_ONBOARDING_ORG_SCOPES ??
  "internal_org_user_mgt_create internal_org_user_mgt_list";
const orgPollInterval = Number(process.env.ASGARDEO_ONBOARDING_USERSTORE_POLL_INTERVAL_MS ?? 1500);
const orgReadyTimeout = Number(process.env.ASGARDEO_ONBOARDING_USERSTORE_TIMEOUT_MS ?? 30000);

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getConfig() {
  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Workspace setup is missing required server configuration.");
  }

  if (!parentOrganizationId) {
    throw new Error("Workspace setup is missing the parent organization ID.");
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    clientId,
    clientSecret,
    parentOrganizationId
  };
}

async function getToken(params: Record<string, string>) {
  const config = getConfig();
  const response = await fetch(`${config.baseUrl}/oauth2/token`, {
    body: new URLSearchParams(params),
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.error ?? "Failed to prepare workspace access.");
  }

  return body.access_token;
}

async function createOrganizationUser({
  accessToken,
  email,
  familyName,
  givenName,
  password
}: {
  accessToken: string;
  email: string;
  familyName: string;
  givenName: string;
  password?: string;
}) {
  const config = getConfig();
  console.log(config);
  console.log({
    body: JSON.stringify({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      emails: [
        {
          primary: true,
          value: email
        }
      ],
      name: {
        familyName,
        givenName
      },
      ...(password ? { password } : { "urn:scim:wso2:schema": { askPassword: "true" } }),
      userName: `DEFAULT/${email}`
    }),
    headers: {
      Accept: "application/scim+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/scim+json"
    },
    method: "POST"
  })
  const response = await fetch(`${config.baseUrl}/o/scim2/Users`, {
    body: JSON.stringify({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      emails: [
        {
          primary: true,
          value: email
        }
      ],
      name: {
        familyName,
        givenName
      },
      ...(password ? { password } : { "urn:scim:wso2:schema": { askPassword: "true" } }),
      userName: `DEFAULT/${email}`
    }),
    headers: {
      Accept: "application/scim+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/scim+json"
    },
    method: "POST"
  });
  const body = await response.json();

  if (!response.ok) {
    const message = typeof body?.detail === "string" ? body.detail : "Failed to create the organization user.";

    throw new Error(message);
  }

  return body;
}

async function fetchOrganization(accessToken: string, organizationId: string): Promise<string | null> {
  const config = getConfig();
  const response = await fetch(`${config.baseUrl}/api/server/v1/organizations/${organizationId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    method: "GET"
  });

  if (response.status === 404 || response.status === 409 || response.status === 503) {
    return null;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Failed to check workspace readiness.";

    throw new Error(message);
  }

  return typeof body?.status === "string" ? body.status : null;
}

async function waitForOrganization(accessToken: string, organizationId: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < orgReadyTimeout) {
    const status = await fetchOrganization(accessToken, organizationId);

    if (status === "ACTIVE") {
      return;
    }

    await sleep(orgPollInterval);
  }

  throw new Error("Timed out waiting for the workspace to become available.");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OnboardingRequest;
    const email = asText(payload.email).toLowerCase();
    const familyName = asText(payload.familyName);
    const givenName = asText(payload.givenName);
    const organizationName = asText(payload.organizationName);
    const password = asText(payload.password) || undefined;

    if (!email || !givenName || !familyName || !organizationName) {
      return NextResponse.json({ message: "All onboarding fields are required." }, { status: 400 });
    }

    const config = getConfig();
    const rootAccessToken = await getToken({
      grant_type: "client_credentials",
      scope: rootTokenScopes
    });
    const organizationPayload: CreateOrganizationPayload = {
      description: `Workspace for ${organizationName}`,
      name: organizationName,
      parentId: config.parentOrganizationId,
      type: "TENANT"
    };
    const organization = await createOrganization({
      baseUrl: config.baseUrl,
      headers: {
        Authorization: `Bearer ${rootAccessToken}`
      },
      payload: organizationPayload
    });

    await waitForOrganization(rootAccessToken, organization.id);

    const organizationAccessToken = await getToken({
      grant_type: "organization_switch",
      scope: organizationTokenScopes,
      switching_organization: organization.id,
      token: rootAccessToken
    });

    const user = await createOrganizationUser({
      accessToken: organizationAccessToken,
      email,
      familyName,
      givenName,
      password
    });

    return NextResponse.json({
      organization,
      user: {
        emails: user.emails,
        id: user.id,
        name: user.name,
        userName: user.userName
      }
    });
  } catch (error) {
    console.error("[onboarding] Failed to complete onboarding.", error);

    return NextResponse.json(
      {
        message: ONBOARDING_ERROR_MESSAGE
      },
      { status: 500 }
    );
  }
}
