import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");

  let query = "SELECT * FROM flights WHERE 1=1";
  const params: string[] = [];

  if (origin) {
    query += " AND (origin LIKE ? OR origin_city LIKE ?)";
    params.push(`%${origin}%`, `%${origin}%`);
  }
  if (destination) {
    query += " AND (destination LIKE ? OR destination_city LIKE ?)";
    params.push(`%${destination}%`, `%${destination}%`);
  }

  query += " ORDER BY departure_time ASC";

  const flights = db.prepare(query).all(...params);
  return NextResponse.json(flights);
}
