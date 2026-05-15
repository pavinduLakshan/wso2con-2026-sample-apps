import { createPublicKey, createVerify } from "node:crypto";

const textDecoder = new TextDecoder();
let jwksCache = null;

function base64UrlToBuffer(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return Buffer.from(padded, "base64");
}

function parseJwt(token) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const header = JSON.parse(textDecoder.decode(base64UrlToBuffer(parts[0])));
  const payload = JSON.parse(textDecoder.decode(base64UrlToBuffer(parts[1])));

  return {
    header,
    payload,
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: base64UrlToBuffer(parts[2])
  };
}

function getIssuer() {
  if (process.env.ASGARDEO_ISSUER) {
    return process.env.ASGARDEO_ISSUER;
  }

  return `${process.env.ASGARDEO_BASE_URL}/oauth2/token`;
}

async function getJwks() {
  if (jwksCache) {
    return jwksCache;
  }

  if (!process.env.ASGARDEO_BASE_URL) {
    throw new Error("ASGARDEO_BASE_URL is required when API_REQUIRE_AUTH=true");
  }

  const response = await fetch(`${process.env.ASGARDEO_BASE_URL}/oauth2/jwks`);

  if (!response.ok) {
    throw new Error("Unable to load Asgardeo JWKS");
  }

  jwksCache = await response.json();

  return jwksCache;
}

function verifySignature(token, jwk) {
  const key = createPublicKey({
    key: jwk,
    format: "jwk"
  });
  const verifier = createVerify("RSA-SHA256");

  verifier.update(token.signingInput);
  verifier.end();

  return verifier.verify(key, token.signature);
}

function validateClaims(payload) {
  const now = Math.floor(Date.now() / 1000);
  const issuer = getIssuer();
  const audience = process.env.ASGARDEO_AUDIENCE;

  if (payload.iss !== issuer) {
    throw new Error("Invalid token issuer");
  }

  if (payload.exp && payload.exp < now) {
    throw new Error("Token has expired");
  }

  if (payload.nbf && payload.nbf > now) {
    throw new Error("Token is not active yet");
  }

  if (audience) {
    const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (!tokenAudience.includes(audience)) {
      throw new Error("Invalid token audience");
    }
  }
}

function mapClaimsToUser(payload) {
  return {
    id: payload.sub,
    username:
      payload.username ||
      payload.preferred_username ||
      payload.userName ||
      payload.email,
    email: payload.email,
    givenName: payload.given_name,
    familyName: payload.family_name,
    rawClaims: payload
  };
}

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";

  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function getLocalDemoUser() {
  return {
    id: "local-demo-user",
    username: "local.traveler",
    email: "local.traveler@example.com",
    givenName: "Local",
    familyName: "Traveler"
  };
}

function getHeaderValue(request, name) {
  const value = request.headers[name.toLowerCase()];

  return Array.isArray(value) ? value[0] : value;
}

function getDemoHeaderUser(request) {
  const username = getHeaderValue(request, "x-wayfinder-username");
  const userId = getHeaderValue(request, "x-wayfinder-user-id");
  const email = getHeaderValue(request, "x-wayfinder-email");

  if (!username && !userId && !email) {
    return null;
  }

  return {
    id: userId || username || email,
    username: username || email || userId,
    email,
    givenName: undefined,
    familyName: undefined
  };
}

export async function getAuthenticatedUser(request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Missing bearer token");
  }

  const parsedToken = parseJwt(token);

  if (parsedToken.header.alg !== "RS256") {
    throw new Error("Unsupported token algorithm");
  }

  const jwks = await getJwks();
  const jwk = jwks.keys?.find((key) => key.kid === parsedToken.header.kid);

  if (!jwk) {
    throw new Error("Signing key not found");
  }

  if (!verifySignature(parsedToken, jwk)) {
    throw new Error("Invalid token signature");
  }

  validateClaims(parsedToken.payload);

  return mapClaimsToUser(parsedToken.payload);
}

export async function resolveUser(request) {
  if (process.env.API_REQUIRE_AUTH !== "true") {
    const headerUser = getDemoHeaderUser(request);

    if (headerUser) {
      return headerUser;
    }

    const token = getBearerToken(request);

    if (token) {
      try {
        const parsedToken = parseJwt(token);

        if (parsedToken.payload?.sub) {
          return mapClaimsToUser(parsedToken.payload);
        }
      } catch {
        // Keep local demos usable when requests do not include an Asgardeo JWT.
      }
    }

    return getLocalDemoUser();
  }

  return getAuthenticatedUser(request);
}
