import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { URL } from "node:url";
import "dotenv/config";
import { AuthError, authorizeRequest, resolveUser } from "./auth.js";
import { logger } from "./logger.js";
import {
  cancelBookedFlight,
  createBookingRecord,
  createFlightRecord,
  deleteFlightById,
  findDuplicateBooking,
  findFlightById,
  findFlights,
  findHotels,
  getBookedFlightById,
  listBookedFlights,
  listEnabledDealAlertConsents,
  listMatchingDealAlertConsentsForFlight,
  listLocations,
  listTrips,
  transferDealAlertConsentBooking,
  updateBookedFlightPrice,
  upsertDealAlertConsent
} from "./db.js";

const port = Number(process.env.PORT || 8787);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const permissionPrefix = process.env.API_PERMISSION_PREFIX || "wayfinder:";

function permission(area, action) {
  const permissionName = `${area}:${action}`;

  return permissionPrefix
    ? [`${permissionPrefix}${permissionName}`, permissionName]
    : [permissionName];
}

function getRoutePermissions(method, path) {
  if (path === "/health" || method === "OPTIONS") {
    return [];
  }

  if (path === "/api/flights") {
    return method === "GET" ? permission("flights", "read") : permission("flights", "write");
  }

  if (path.startsWith("/api/flights/")) {
    return method === "GET" ? permission("flights", "read") : permission("flights", "write");
  }

  if (path === "/api/hotels") {
    return permission("hotels", "read");
  }

  if (path === "/api/locations") {
    return permission("locations", "read");
  }

  if (path === "/api/trips") {
    return permission("trips", "read");
  }

  if (path === "/api/me" || path === "/api/me/profile") {
    return method === "PATCH" ? permission("profile", "write") : permission("profile", "read");
  }

  if (path === "/api/bookings" || path.startsWith("/api/bookings/")) {
    return method === "GET" ? permission("bookings", "read") : permission("bookings", "write");
  }

  if (path === "/api/deal-alert-consents" || path.startsWith("/api/deal-alert-consents/")) {
    return method === "GET" ? permission("deal-alerts", "read") : permission("deal-alerts", "write");
  }

  if (path === "/api/cds/profiles") {
    return permission("cds-profiles", "write");
  }

  if (path.startsWith("/api/cds/profiles/")) {
    return method === "GET" ? permission("cds-profiles", "read") : permission("cds-profiles", "write");
  }

  return [];
}

async function getCDSToken() {
  const baseUrl = process.env.ASGARDEO_BASE_URL;
  const clientId = process.env.CDS_ASGARDEO_CLIENT_ID;
  const clientSecret = process.env.CDS_ASGARDEO_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error("Missing CDS credentials in environment");
  }

  const tokenEndpoint = `${baseUrl.replace(/\/$/, "")}/oauth2/token`;
  const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const scopes = (process.env.CC_SCOPES || "").replace(/^\s*"|"\s*$/g, "").trim();

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${encodedCredentials}`
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      ...(scopes && { scope: scopes })
    }).toString()
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Failed to get CDS token");
  }

  return data.access_token;
}

function extractCookieValue(setCookieHeaders, cookieName) {
  for (const headerValue of setCookieHeaders) {
    const firstPart = String(headerValue || "").split(";")[0] || "";
    const eqIndex = firstPart.indexOf("=");

    if (eqIndex <= 0) {
      continue;
    }

    const name = firstPart.slice(0, eqIndex).trim();
    const value = firstPart.slice(eqIndex + 1).trim();

    if (name === cookieName) {
      return value;
    }
  }

  return null;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Wayfinder-User-Id,X-Wayfinder-Username,X-Wayfinder-Email"
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function searchFlights(params) {
  return findFlights({
    from: params.get("from"),
    to: params.get("to"),
    cabin: params.get("cabin")
  });
}

function searchHotels(params) {
  return findHotels({
    location: params.get("location"),
    maxNightlyRate: Number(params.get("maxNightlyRate") || 0)
  });
}

function generateBookingReference() {
  return randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeOptionalTags(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function isAllowedPreference(value) {
  return ["any", "earlier", "later"].includes(value);
}

function getBearerAccessToken(request: any) {
  const authHeader = request.headers.authorization || "";

  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function getAsgardeoBaseUrl() {
  const baseUrl = process.env.ASGARDEO_BASE_URL;

  if (!baseUrl) {
    throw new Error("ASGARDEO_BASE_URL is required to update Asgardeo profiles");
  }

  return baseUrl.replace(/\/$/, "");
}

function getPrimaryScimEmail(scimUser: any) {
  const emailValue = scimUser?.email || scimUser?.mail;

  if (typeof emailValue === "string" && emailValue) {
    return emailValue;
  }

  if (!Array.isArray(scimUser?.emails)) {
    if (typeof scimUser?.emails === "string") {
      return scimUser.emails;
    }

    if (scimUser?.emails && typeof scimUser.emails === "object") {
      return scimUser.emails.value || scimUser.emails.display || "";
    }

    return "";
  }

  const primaryEmail = scimUser.emails.find((email: any) => email?.primary === true || email?.primary === "true");
  const firstEmail = primaryEmail || scimUser.emails[0];

  if (typeof firstEmail === "string") {
    return firstEmail;
  }

  return firstEmail?.value || firstEmail?.display || "";
}

function getScimNameValue(scimUser: any, fieldName: string, fallbackFieldNames: string[]) {
  const nameValue = scimUser?.name?.[fieldName];

  if (nameValue) {
    return nameValue;
  }

  for (const fallbackFieldName of fallbackFieldNames) {
    if (scimUser?.[fallbackFieldName]) {
      return scimUser[fallbackFieldName];
    }
  }

  return "";
}

function mapScimProfile(scimUser: any) {
  return {
    firstName: getScimNameValue(scimUser, "givenName", ["given_name", "givenName"]),
    lastName: getScimNameValue(scimUser, "familyName", ["family_name", "familyName"]),
    username: scimUser?.userName || getPrimaryScimEmail(scimUser) || "",
    email: getPrimaryScimEmail(scimUser),
    memberSince: scimUser?.meta?.created || "",
    raw: scimUser
  };
}

async function fetchAsgardeoMeProfile(accessToken: string) {
  const response = await fetch(`${getAsgardeoBaseUrl()}/scim2/Me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/scim+json, application/json"
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.description || data.error_description || data.error || "Failed to fetch Asgardeo profile");
  }

  return data;
}

async function handleProfileUpdate(request: any) {
  const accessToken = getBearerAccessToken(request);

  if (!accessToken) {
    return {
      statusCode: 401,
      body: { error: "Missing bearer token" }
    };
  }

  const body = await readJsonBody(request);
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const operations: any[] = [
    {
      op: "replace",
      path: "name",
      value: {
        givenName: firstName,
        familyName: lastName
      }
    }
  ];

  if (email) {
    operations.push({
      op: "replace",
      path: "emails",
      value: [
        {
          value: email,
          type: "work",
          primary: true
        }
      ]
    });
  }

  const patchResponse = await fetch(`${getAsgardeoBaseUrl()}/scim2/Me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/scim+json",
      Accept: "application/scim+json, application/json"
    },
    body: JSON.stringify({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: operations
    })
  });
  const patchData = await patchResponse.json().catch(() => ({}));

  if (!patchResponse.ok) {
    return {
      statusCode: patchResponse.status,
      body: {
        error:
          patchData.detail ||
          patchData.description ||
          patchData.error_description ||
          patchData.error ||
          "Failed to update Asgardeo profile"
      }
    };
  }

  const updatedProfile = patchResponse.status === 204 || !Object.keys(patchData).length
    ? await fetchAsgardeoMeProfile(accessToken)
    : patchData;

  return {
    statusCode: 200,
    body: { data: mapScimProfile(updatedProfile) }
  };
}

async function handleProfileFetch(request: any) {
  const accessToken = getBearerAccessToken(request);

  if (!accessToken) {
    return {
      statusCode: 401,
      body: { error: "Missing bearer token" }
    };
  }

  const profile = await fetchAsgardeoMeProfile(accessToken);

  return {
    statusCode: 200,
    body: { data: mapScimProfile(profile) }
  };
}

async function notifyAgentOfDealMatches(flight, matches) {
  if (!matches.length) {
    return;
  }

  const webhookUrl = process.env.AGENT_DEAL_ALERT_WEBHOOK_URL || "http://localhost:8790/deal-alerts";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flight, matches })
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      logger.warn({ statusCode: response.status, message }, "Deal alert webhook failed");
    }
  } catch (error) {
    logger.warn({ err: error }, "Deal alert webhook could not be reached");
  }
}

async function handleFlightCreate(request) {
  const body = await readJsonBody(request);
  let from;
  let to;
  let airline;
  let departureTime;
  let arrivalTime;
  let duration;
  let currency;
  let cabin;
  let dates;

  try {
    from = assertNonEmptyString(body.from, "from");
    to = assertNonEmptyString(body.to, "to");
    airline = assertNonEmptyString(body.airline, "airline");
    departureTime = assertNonEmptyString(body.departureTime, "departureTime");
    arrivalTime = assertNonEmptyString(body.arrivalTime, "arrivalTime");
    duration = assertNonEmptyString(body.duration, "duration");
    currency = assertNonEmptyString(body.currency || "USD", "currency");
    cabin = assertNonEmptyString(body.cabin || "Economy", "cabin");
    dates = assertNonEmptyString(body.dates, "dates");
  } catch (error) {
    return {
      statusCode: 400,
      body: { error: error.message }
    };
  }

  const stops = Number(body.stops ?? 0);
  const price = Number(body.price);

  if (!Number.isInteger(stops) || stops < 0) {
    return {
      statusCode: 400,
      body: { error: "stops must be a non-negative integer" }
    };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return {
      statusCode: 400,
      body: { error: "price must be a positive number" }
    };
  }

  const sourceId = body.id || `flight-${from}-${to}-${randomUUID().slice(0, 8)}`;
  const id = String(sourceId).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

  if (!id) {
    return {
      statusCode: 400,
      body: { error: "id could not be derived from the provided flight details" }
    };
  }

  if (findFlightById(id)) {
    return {
      statusCode: 409,
      body: { error: "Flight already exists" }
    };
  }

  const flight = createFlightRecord({
    id,
    from,
    to,
    airline,
    departureTime,
    arrivalTime,
    duration,
    stops,
    price,
    currency,
    cabin,
    dates,
    tags: normalizeOptionalTags(body.tags)
  });
  const matches = listMatchingDealAlertConsentsForFlight(id);

  await notifyAgentOfDealMatches(flight, matches);

  return {
    statusCode: 201,
    body: { data: flight, matchedDealAlerts: matches.length }
  };
}

async function handleBooking(request) {
  const body = await readJsonBody(request);
  const resolvedUser = request.authenticatedUser || await resolveUser(request);
  const bodyUser = body.user && typeof body.user === "object" ? body.user : {};
  const canUseBodyUser = process.env.API_REQUIRE_AUTH !== "true";
  const user = canUseBodyUser && (bodyUser.username || bodyUser.email || bodyUser.id)
    ? {
        id: bodyUser.id || bodyUser.username || bodyUser.email,
        username: bodyUser.username || bodyUser.email || bodyUser.id,
        email: bodyUser.email,
        givenName: resolvedUser.givenName,
        familyName: resolvedUser.familyName
      }
    : resolvedUser;
  const itemType = body.type;
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : body.itemId;
  const travelers = Number(body.travelers || 1);
  const username = user.username || user.email || user.id;

  if (!["flight", "hotel", "trip"].includes(itemType)) {
    return {
      statusCode: 400,
      body: { error: "type must be one of: flight, hotel, trip" }
    };
  }

  if (typeof itemId !== "string" || !itemId.trim()) {
    return {
      statusCode: 400,
      body: { error: "itemId is required" }
    };
  }

  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 9) {
    return {
      statusCode: 400,
      body: { error: "travelers must be an integer between 1 and 9" }
    };
  }

  const duplicateBooking = findDuplicateBooking({
    username,
    type: itemType,
    itemId
  });

  if (duplicateBooking) {
    return {
      statusCode: 409,
      body: { error: "This booking already exists." }
    };
  }

  const booking = createBookingRecord({
    id: `booking-${randomUUID()}`,
    bookingReference: generateBookingReference(),
    user,
    type: itemType,
    itemId,
    travelers,
    status: "confirmed",
    createdAt: new Date().toISOString()
  });

  return {
    statusCode: 201,
    body: booking
  };
}

async function handleDealAlertConsent(request) {
  const body = await readJsonBody(request);
  let bookingId;
  let routeFrom;
  let routeTo;

  try {
    bookingId = assertNonEmptyString(body.bookingId, "bookingId");
    routeFrom = assertNonEmptyString(body.routeFrom, "routeFrom");
    routeTo = assertNonEmptyString(body.routeTo, "routeTo");
  } catch (error) {
    return {
      statusCode: 400,
      body: { error: error.message }
    };
  }

  const booking = getBookedFlightById(bookingId);

  if (!booking) {
    return {
      statusCode: 404,
      body: { error: "Flight booking not found" }
    };
  }

  const criteria = body.criteria && typeof body.criteria === "object" && !Array.isArray(body.criteria)
    ? body.criteria
    : {};

  if (criteria.minimumSavingsPercent === undefined && body.minimumSavingsPercent !== undefined) {
    criteria.minimumSavingsPercent = Number(body.minimumSavingsPercent);
  }

  if (criteria.maxStops === undefined && body.maxStops !== undefined) {
    criteria.maxStops = body.maxStops === null || body.maxStops === "" ? null : Number(body.maxStops);
  }

  if (criteria.timePreference === undefined && typeof body.timePreference === "string") {
    criteria.timePreference = body.timePreference;
  }

  if (criteria.timePreference === undefined && typeof body.datePreference === "string") {
    criteria.timePreference = body.datePreference;
  }

  if (criteria.sameCabinOnly === undefined && body.sameCabinOnly !== undefined) {
    criteria.sameCabinOnly = Boolean(body.sameCabinOnly);
  }

  if (
    criteria.timePreference !== undefined &&
    !isAllowedPreference(String(criteria.timePreference))
  ) {
    return {
      statusCode: 400,
      body: { error: "timePreference must be one of: any, earlier, later" }
    };
  }

  if (
    criteria.minimumSavingsPercent !== undefined &&
    (!Number.isFinite(Number(criteria.minimumSavingsPercent)) ||
      Number(criteria.minimumSavingsPercent) < 0 ||
      Number(criteria.minimumSavingsPercent) > 95)
  ) {
    return {
      statusCode: 400,
      body: { error: "minimumSavingsPercent must be a number between 0 and 95" }
    };
  }

  if (
    criteria.maxStops !== null &&
    criteria.maxStops !== undefined &&
    (!Number.isInteger(Number(criteria.maxStops)) || Number(criteria.maxStops) < 0)
  ) {
    return {
      statusCode: 400,
      body: { error: "maxStops must be a non-negative integer or null" }
    };
  }

  const consent = upsertDealAlertConsent({
    id: `deal-alert-consent-${randomUUID()}`,
    bookingId,
    username: booking.username,
    routeFrom,
    routeTo,
    criteria,
    enabled: Boolean(body.enabled),
    now: new Date().toISOString()
  });

  return {
    statusCode: 200,
    body: { data: consent }
  };
}

async function handleBookingPriceUpdate(request, bookingId) {
  const user = request.authenticatedUser || await resolveUser(request);
  const body = await readJsonBody(request);
  const price = Number(body.price);
  const tokenUsername = user.username || user.email || user.id;
  const username = process.env.API_REQUIRE_AUTH === "true" ? tokenUsername : body.username || tokenUsername;

  if (!Number.isFinite(price) || price <= 0) {
    return {
      statusCode: 400,
      body: { error: "price must be a positive number" }
    };
  }

  const booking = updateBookedFlightPrice({
    bookingId,
    username,
    price
  });

  if (!booking) {
    return {
      statusCode: 404,
      body: { error: "Flight booking not found for username" }
    };
  }

  return {
    statusCode: 200,
    body: { data: booking }
  };
}

async function handleBookingCancel(request, bookingId) {
  const user = request.authenticatedUser || await resolveUser(request);
  const body = await readJsonBody(request);
  const tokenUsername = user.username || user.email || user.id;
  const username = process.env.API_REQUIRE_AUTH === "true" ? tokenUsername : body.username || tokenUsername;
  const booking = cancelBookedFlight({
    bookingId,
    username,
    disableDealAlerts: body.preserveDealAlerts !== true
  });

  if (!booking) {
    return {
      statusCode: 404,
      body: { error: "Flight booking not found for username" }
    };
  }

  return {
    statusCode: 200,
    body: { data: booking }
  };
}

async function handleDealAlertConsentTransfer(request) {
  const body = await readJsonBody(request);
  let fromBookingId;
  let toBookingId;

  try {
    fromBookingId = assertNonEmptyString(body.fromBookingId, "fromBookingId");
    toBookingId = assertNonEmptyString(body.toBookingId, "toBookingId");
  } catch (error) {
    return {
      statusCode: 400,
      body: { error: error.message }
    };
  }

  const user = request.authenticatedUser || await resolveUser(request);
  const tokenUsername = user.username || user.email || user.id;
  const username = process.env.API_REQUIRE_AUTH === "true" ? tokenUsername : body.username || tokenUsername;
  const consent = transferDealAlertConsentBooking({
    fromBookingId,
    toBookingId,
    username,
    now: new Date().toISOString()
  });

  if (!consent) {
    return {
      statusCode: 404,
      body: { error: "Deal alert consent could not be transferred for username" }
    };
  }

  return {
    statusCode: 200,
    body: { data: consent }
  };
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestId = randomUUID();
  const startedAt = performance.now();
  const requestLogger = logger.child({
    requestId,
    method: request.method,
    path: url.pathname
  });

  request.log = requestLogger;
  response.setHeader("X-Request-Id", requestId);
  response.on("finish", () => {
    requestLogger.info({
      statusCode: response.statusCode,
      durationMs: Number((performance.now() - startedAt).toFixed(1))
    }, "HTTP request completed");
  });
  requestLogger.info({ query: Object.fromEntries(url.searchParams.entries()) }, "HTTP request started");

  if (request.method === "OPTIONS") {
    return sendJson(response, 204, {});
  }

  try {
    const requiredPermissions = getRoutePermissions(request.method, url.pathname);

    if (requiredPermissions.length > 0) {
      request.authenticatedUser = await authorizeRequest(request, requiredPermissions);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/api/flights") {
      return sendJson(response, 200, {
        data: searchFlights(url.searchParams)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/flights") {
      const result = await handleFlightCreate(request);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/flights/")) {
      const flightId = decodeURIComponent(url.pathname.replace("/api/flights/", ""));
      const flight = findFlightById(flightId);

      if (!flight) {
        return sendJson(response, 404, { error: "Flight not found" });
      }

      return sendJson(response, 200, {
        data: flight
      });
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/flights/")) {
      const flightId = decodeURIComponent(url.pathname.replace("/api/flights/", ""));
      const result = deleteFlightById(flightId);

      if (result.reason === "not-found") {
        return sendJson(response, 404, { error: "Flight not found" });
      }

      if (result.reason === "in-use") {
        return sendJson(response, 409, {
          error: "Flight is used by existing bookings or trips",
          bookingCount: result.bookingCount,
          tripCount: result.tripCount
        });
      }

      return sendJson(response, 200, { data: result.flight });
    }

    if (request.method === "GET" && url.pathname === "/api/hotels") {
      return sendJson(response, 200, {
        data: searchHotels(url.searchParams)
      });
    }

    if (request.method === "GET" && url.pathname === "/api/locations") {
      return sendJson(response, 200, {
        data: listLocations({
          category: url.searchParams.get("category")
        })
      });
    }

    if (request.method === "GET" && url.pathname === "/api/trips") {
      return sendJson(response, 200, {
        data: listTrips({
          destination: url.searchParams.get("destination")
        })
      });
    }

    if (request.method === "GET" && url.pathname === "/api/me") {
      const user = request.authenticatedUser || await resolveUser(request);

      return sendJson(response, 200, { data: user });
    }

    if (request.method === "GET" && url.pathname === "/api/me/profile") {
      const result = await handleProfileFetch(request);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "PATCH" && url.pathname === "/api/me/profile") {
      const result = await handleProfileUpdate(request);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "GET" && url.pathname === "/api/bookings/flights") {
      const user = request.authenticatedUser || await resolveUser(request);
      const username = user.username || user.email || user.id;

      return sendJson(response, 200, {
        data: listBookedFlights(username)
      });
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/bookings/flights/")) {
      const bookingId = decodeURIComponent(url.pathname.replace("/api/bookings/flights/", ""));
      const booking = getBookedFlightById(bookingId);

      if (!booking) {
        return sendJson(response, 404, { error: "Flight booking not found" });
      }

      return sendJson(response, 200, { data: booking });
    }

    if (request.method === "POST" && url.pathname === "/api/bookings") {
      const result = await handleBooking(request);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/bookings/") && url.pathname.endsWith("/price")) {
      const bookingId = decodeURIComponent(url.pathname.replace("/api/bookings/", "").replace("/price", ""));
      const result = await handleBookingPriceUpdate(request, bookingId);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/bookings/") && url.pathname.endsWith("/cancel")) {
      const bookingId = decodeURIComponent(url.pathname.replace("/api/bookings/", "").replace("/cancel", ""));
      const result = await handleBookingCancel(request, bookingId);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "POST" && url.pathname === "/api/deal-alert-consents") {
      const result = await handleDealAlertConsent(request);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "POST" && url.pathname === "/api/deal-alert-consents/transfer") {
      const result = await handleDealAlertConsentTransfer(request);

      return sendJson(response, result.statusCode, result.body);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/deal-alert-consents/")) {
      const username = decodeURIComponent(url.pathname.replace("/api/deal-alert-consents/", ""));

      return sendJson(response, 200, {
        data: listEnabledDealAlertConsents(username)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/cds/profiles") {
      const body = await readJsonBody(request);
      const token = await getCDSToken();
      const cdsEndpoint = `${getAsgardeoBaseUrl()}/cds/api/v1/profiles`;

      const cdsResponse = await fetch(cdsEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const cdsData = await cdsResponse.json().catch(() => ({}));
      console.log("CDS Profile Creation Response:", {
        status: cdsResponse.status,
        statusText: cdsResponse.statusText,
        body: cdsData
      });

      if (!cdsResponse.ok) {
        return sendJson(response, cdsResponse.status, {
          error: cdsData.message || cdsData.description || "Failed to create CDS profile"
        });
      }

      const rawSetCookies =
        typeof cdsResponse.headers.getSetCookie === "function"
          ? cdsResponse.headers.getSetCookie()
          : [];
      const singleSetCookie = cdsResponse.headers.get("set-cookie");
      const setCookieHeaders =
        rawSetCookies.length > 0
          ? rawSetCookies
          : singleSetCookie
            ? [singleSetCookie]
            : [];
      const cdsProfileCookie = extractCookieValue(setCookieHeaders, "cds_profile");

      return sendJson(response, 201, {
        ...cdsData,
        cds_profile: cdsProfileCookie
      });
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/cds/profiles/")) {
      const profileId = url.pathname.split("/").pop();
      const token = await getCDSToken();
      const cdsEndpoint = new URL(
        `${getAsgardeoBaseUrl()}/cds/api/v1/profiles/${profileId}`
      );

      const applicationIdentifier = url.searchParams.get("application_identifier");
      const includeApplicationData = url.searchParams.get("includeApplicationData");

      if (applicationIdentifier) {
        cdsEndpoint.searchParams.set("application_identifier", applicationIdentifier);
      }

      if (includeApplicationData) {
        cdsEndpoint.searchParams.set("includeApplicationData", includeApplicationData);
      }

      const cdsResponse = await fetch(cdsEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });

      const cdsData = await cdsResponse.json().catch(() => ({}));

      if (!cdsResponse.ok) {
        return sendJson(response, cdsResponse.status, {
          error: cdsData.error_description || cdsData.error || "Failed to fetch CDS profile"
        });
      }

      return sendJson(response, 200, cdsData);
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/cds/profiles/")) {
      const profileId = url.pathname.split("/").pop();
      const body = await readJsonBody(request);
      const token = await getCDSToken();
      const cdsEndpoint = `${getAsgardeoBaseUrl()}/cds/api/v1/profiles/${profileId}`;

      const cdsResponse = await fetch(cdsEndpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const cdsData = await cdsResponse.json().catch(() => ({}));

      if (!cdsResponse.ok) {
        return sendJson(response, cdsResponse.status, {
          error: cdsData.error_description || cdsData.error || "Failed to update CDS profile"
        });
      }

      return sendJson(response, 200, cdsData);
    }

    return sendJson(response, 404, { error: "Route not found" });
  } catch (error) {
    const statusCode = error instanceof AuthError
      ? error.statusCode
      : error.message?.toLowerCase().includes("token")
        ? 401
        : 500;

    requestLogger.error({ err: error, statusCode }, "HTTP request failed");

    return sendJson(response, statusCode, {
      error: error.message
    });
  }
}

createServer(route).listen(port, () => {
  logger.info({ port, frontendOrigin }, `Wayfinder Travel API listening on http://localhost:${port}`);
});
