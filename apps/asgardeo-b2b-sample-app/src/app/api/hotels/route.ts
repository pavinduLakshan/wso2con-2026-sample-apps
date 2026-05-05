import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const country = searchParams.get("country");

  let query = "SELECT * FROM hotels WHERE 1=1";
  const params: string[] = [];

  if (city) {
    query += " AND city LIKE ?";
    params.push(`%${city}%`);
  }
  if (country) {
    query += " AND country LIKE ?";
    params.push(`%${country}%`);
  }

  query += " ORDER BY star_rating DESC, price_per_night ASC";

  const hotels = db.prepare(query).all(...params);
  return NextResponse.json(hotels);
}
