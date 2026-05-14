const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

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

function getUserHeaders(user) {
  const headers = {};
  const username = user?.username || user?.userName || user?.email || user?.sub || user?.id || "";
  const userId = user?.sub || user?.id || username;
  const email = user?.email || user?.mail || "";

  if (username) {
    headers["X-Wayfinder-Username"] = username;
  }

  if (userId) {
    headers["X-Wayfinder-User-Id"] = userId;
  }

  if (email) {
    headers["X-Wayfinder-Email"] = email;
  }

  return headers;
}

export async function getFlights(searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const response = await requestJson(`/api/flights${query ? `?${query}` : ""}`);

  return response.data;
}

export async function getFlight(flightId) {
  const response = await requestJson(`/api/flights/${encodeURIComponent(flightId)}`);

  return response.data;
}

export async function getHotels(searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const response = await requestJson(`/api/hotels${query ? `?${query}` : ""}`);

  return response.data;
}

export async function getTrips(searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const response = await requestJson(`/api/trips${query ? `?${query}` : ""}`);

  return response.data;
}

export async function getLocations(searchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const response = await requestJson(`/api/locations${query ? `?${query}` : ""}`);

  return response.data;
}

export async function createBooking(booking, accessToken, user) {
  const response = await requestJson("/api/bookings", {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...getUserHeaders(user)
    },
    body: JSON.stringify(booking)
  });

  return response;
}

export async function getBookedFlights(accessToken, user) {
  const response = await requestJson("/api/bookings/flights", {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...getUserHeaders(user)
    }
  });

  return response.data;
}

export async function cancelBooking(bookingId, accessToken, user) {
  const response = await requestJson(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "PATCH",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...getUserHeaders(user)
    }
  });

  return response.data;
}
