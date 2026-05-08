import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import "dotenv/config";
import { resolveUser } from "./auth.js";
import {
  createBookingRecord,
  findFlights,
  findHotels,
  listBookedFlights,
  listLocations,
  listTrips
} from "./db.js";

const port = Number(process.env.PORT || 8787);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
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

async function handleBooking(request) {
  const user = await resolveUser(request);
  const body = await readJsonBody(request);
  const itemType = body.type;
  const itemId = body.itemId;
  const travelers = Number(body.travelers || 1);

  if (!["flight", "hotel", "trip"].includes(itemType)) {
    return {
      statusCode: 400,
      body: { error: "type must be one of: flight, hotel, trip" }
    };
  }

  if (!itemId) {
    return {
      statusCode: 400,
      body: { error: "itemId is required" }
    };
  }

  const booking = createBookingRecord({
    id: `booking-${randomUUID()}`,
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

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    return sendJson(response, 204, {});
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/api/flights") {
      return sendJson(response, 200, {
        data: searchFlights(url.searchParams)
      });
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
      const user = await resolveUser(request);

      return sendJson(response, 200, { data: user });
    }

    if (request.method === "GET" && url.pathname === "/api/bookings/flights") {
      const user = await resolveUser(request);
      const username = user.username || user.email || user.id;

      return sendJson(response, 200, {
        data: listBookedFlights(username)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/bookings") {
      const result = await handleBooking(request);

      return sendJson(response, result.statusCode, result.body);
    }

    return sendJson(response, 404, { error: "Route not found" });
  } catch (error) {
    const statusCode = error.message.toLowerCase().includes("token") ? 401 : 500;

    return sendJson(response, statusCode, {
      error: error.message
    });
  }
}

createServer(route).listen(port, () => {
  console.log(`Wayfinder Travel API listening on http://localhost:${port}`);
});
