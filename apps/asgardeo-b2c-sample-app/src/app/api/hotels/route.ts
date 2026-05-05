import { NextRequest, NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { Hotel } from "@/lib/types";

export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const { searchParams } = request.nextUrl;
  const city = searchParams.get("city") || "";
  const country = searchParams.get("country") || "";

  let query = "SELECT * FROM hotels WHERE 1=1";
  const params: string[] = [];

  if (city) {
    query += " AND LOWER(city) LIKE LOWER(?)";
    params.push(`%${city}%`);
  }
  if (country) {
    query += " AND LOWER(country) LIKE LOWER(?)";
    params.push(`%${country}%`);
  }

  query += " ORDER BY star_rating DESC, price_per_night ASC";

  const hotels = db.prepare(query).all(...params) as Hotel[];
  return NextResponse.json(hotels);
}
