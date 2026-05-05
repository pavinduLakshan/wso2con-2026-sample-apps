import { NextRequest, NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { Booking, Flight, Hotel } from "@/lib/types";
import { AsgardeoNext } from "@asgardeo/nextjs";

async function getSessionSub(): Promise<string | null> {
  try {
    const client = AsgardeoNext.getInstance();
    const accessToken = await client.getAccessToken();
    if (!accessToken) return null;
    const decoded = await client.decodeJwtToken<{ sub: string }>(accessToken);
    return decoded.sub || null;
  } catch {
    return null;
  }
}

async function getOrCreateUser(db: ReturnType<typeof getDb>, sub: string) {
  let user = db.prepare("SELECT * FROM users WHERE sub = ?").get(sub) as { id: number } | undefined;
  if (!user) {
    const client = AsgardeoNext.getInstance();
    let name = "Traveler";
    let email = "";
    try {
      const profile = await client.getUserProfile();
      const p = profile.flattenedProfile;
      name = `${p.givenName || ""} ${p.familyName || ""}`.trim() || "Traveler";
      email = p.email || "";
    } catch {
      // use defaults
    }
    const result = db.prepare("INSERT INTO users (sub, name, email) VALUES (?, ?, ?)").run(sub, name, email);
    return { id: result.lastInsertRowid as number };
  }
  return user;
}

export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();
  const sub = await getSessionSub();
  if (!sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser(db, sub);

  const bookings = db.prepare(`
    SELECT b.*, 
      CASE WHEN b.type = 'flight' THEN f.airline || ' ' || f.flight_number || ' (' || f.origin_city || ' → ' || f.destination_city || ')'
           ELSE h.name || ' (' || h.city || ', ' || h.country || ')'
      END as item_name
    FROM bookings b
    LEFT JOIN flights f ON b.type = 'flight' AND b.item_id = f.id
    LEFT JOIN hotels h ON b.type = 'hotel' AND b.item_id = h.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(user.id);

  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  initDb();
  const db = getDb();
  const sub = await getSessionSub();
  if (!sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser(db, sub);

  const body = await request.json();
  const { type, item_id, check_in_date, check_out_date, guests } = body;

  if (!type || !item_id) {
    return NextResponse.json({ error: "type and item_id are required" }, { status: 400 });
  }

  if (!["flight", "hotel"].includes(type)) {
    return NextResponse.json({ error: "type must be 'flight' or 'hotel'" }, { status: 400 });
  }

  let totalPrice = 0;

  if (type === "flight") {
    const flight = db.prepare("SELECT price FROM flights WHERE id = ?").get(item_id) as Flight | undefined;
    if (!flight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }
    totalPrice = flight.price;
  } else {
    const hotel = db.prepare("SELECT price_per_night FROM hotels WHERE id = ?").get(item_id) as Hotel | undefined;
    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }
    const nights = check_in_date && check_out_date
      ? Math.max(1, Math.ceil((new Date(check_out_date).getTime() - new Date(check_in_date).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    totalPrice = hotel.price_per_night * nights;
  }

  const result = db.prepare(`
    INSERT INTO bookings (user_id, type, item_id, check_in_date, check_out_date, guests, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, type, item_id, check_in_date || null, check_out_date || null, guests || 1, totalPrice);

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid) as Booking;

  return NextResponse.json(booking, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  initDb();
  const db = getDb();
  const sub = await getSessionSub();
  if (!sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser(db, sub);
  const body = await request.json();
  const { id, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (status !== "cancelled") {
    return NextResponse.json({ error: "Only cancellation is supported" }, { status: 400 });
  }

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND user_id = ?").get(id, user.id) as Booking | undefined;
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);

  return NextResponse.json(updated);
}
