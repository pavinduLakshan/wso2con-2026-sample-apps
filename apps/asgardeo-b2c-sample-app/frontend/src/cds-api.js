const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
export const ASGARDEO_BASE_URL = import.meta.env.VITE_ASGARDEO_BASE_URL || "";
export const ASGARDEO_CLIENT_ID = import.meta.env.VITE_ASGARDEO_CLIENT_ID || "";

const CDS_PROFILE_ID_COOKIE = "cds_profile_id";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

let cdsProfileCreatePromise = null;
let cdsProfileId = null;

function setCookie(name, value, maxAge = COOKIE_MAX_AGE) {
  let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (maxAge) {
    cookieStr += `; Max-Age=${maxAge}`;
  }

  cookieStr += "; Path=/";

  if (window.location.protocol === "https:") {
    cookieStr += "; Secure";
  }

  cookieStr += "; SameSite=Strict";
  document.cookie = cookieStr;
}

function getCookie(name) {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (!key) {
      continue;
    }

    if (decodeURIComponent(key.trim()) === name) {
      return decodeURIComponent(valueParts.join("=").trim());
    }
  }

  return null;
}

function deleteCookie(name) {
  setCookie(name, "", 0);
}

function setAsgardeoDomainCDSProfileCookie(cdsProfileValue) {
  if (!cdsProfileValue) {
    return;
  }

  try {
    const currentHost = window.location.hostname;
    const asgardeoHost = "asgardeo.io";
    const encodedValue = encodeURIComponent(cdsProfileValue);

    if (asgardeoHost && (currentHost === asgardeoHost || currentHost.endsWith(`.${asgardeoHost}`))) {
      document.cookie = [
        `cds_profile=${encodedValue}`,
        `Domain=${asgardeoHost}`,
        "Path=/",
        "Secure",
        "SameSite=None"
      ].join("; ");
      return;
    }

    document.cookie = [
      `cds_profile=${encodedValue}`,
      "Path=/",
      `Domain=${asgardeoHost}`,
      window.location.protocol === "https:" ? "Secure" : "",
      "SameSite=None"
    ]
      .filter(Boolean)
      .join("; ");
  } catch (error) {
    console.warn("Failed to set cds_profile cookie for Asgardeo domain:", error.message);
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "API request failed");
  }

  return body;
}

export async function createCDSProfile(profilePayload = {}) {
  return requestJson("/api/cds/profiles", {
    method: "POST",
    body: JSON.stringify(profilePayload)
  });
}

export async function ensureCDSProfile(profilePayload = {}) {
  if (cdsProfileId) {
    return { profile_id: cdsProfileId };
  }

  const cookieProfileId = getCookie(CDS_PROFILE_ID_COOKIE);

  if (cookieProfileId) {
    cdsProfileId = cookieProfileId;
    return { profile_id: cookieProfileId };
  }

  if (!cdsProfileCreatePromise) {
    cdsProfileCreatePromise = createCDSProfile(profilePayload)
      .then((response) => {
        if (response?.cds_profile) {
          setAsgardeoDomainCDSProfileCookie(response.cds_profile);
        }

        cdsProfileId = response.profile_id || response.id || null;

        if (cdsProfileId) {
          setCookie(CDS_PROFILE_ID_COOKIE, cdsProfileId, COOKIE_MAX_AGE);
        }

        return response;
      })
      .finally(() => {
        cdsProfileCreatePromise = null;
      });
  }

  return cdsProfileCreatePromise;
}

export async function updateCDSProfile(profileId, profilePayload = {}) {
  if (!profileId) {
    throw new Error("Profile ID is required");
  }

  return requestJson(`/api/cds/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(profilePayload)
  });
}

export async function getCDSProfile(profileId) {
  if (!profileId) {
    throw new Error("Profile ID is required");
  }

  return requestJson(
    `/api/cds/profiles/${profileId}?application_identifier=*&includeApplicationData=true`,
    { method: "GET" }
  );
}

export function initializeCDSFromCookie() {
  const profileId = getCookie(CDS_PROFILE_ID_COOKIE);

  if (profileId) {
    cdsProfileId = profileId;
  }

  return profileId;
}

export function clearCDSCookies() {
  deleteCookie(CDS_PROFILE_ID_COOKIE);
  cdsProfileId = null;
  cdsProfileCreatePromise = null;
}
