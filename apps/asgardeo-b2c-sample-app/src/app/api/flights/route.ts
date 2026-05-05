import { NextRequest, NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { Flight } from "@/lib/types";

export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const { searchParams } = request.nextUrl;
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";

  let query = "SELECT * FROM flights WHERE 1=1";
  const params: string[] = [];

  if (origin) {
    query += " AND (LOWER(origin) LIKE LOWER(?) OR LOWER(origin_city) LIKE LOWER(?))";
    params.push(`%${origin}%`, `%${origin}%`);
  }
  if (destination) {
    query += " AND (LOWER(destination) LIKE LOWER(?) OR LOWER(destination_city) LIKE LOWER(?))";
    params.push(`%${destination}%`, `%${destination}%`);
  }

  query += " ORDER BY departure_time ASC";

  const flights = db.prepare(query).all(...params) as Flight[];
  return NextResponse.json(flights);
}
