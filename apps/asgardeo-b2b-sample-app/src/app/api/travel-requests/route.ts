import { NextRequest, NextResponse } from "next/server";
import { AsgardeoNext } from "@asgardeo/nextjs";
import { getDb, initDb } from "@/lib/db";

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

export async function GET(request: NextRequest) {
  initDb();
  const db = getDb();

  const sub = await getSessionSub();
  if (!sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = db.prepare("SELECT * FROM users WHERE sub = ?").get(sub) as {
    id: number;
    role: string;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let requests;

  if (user.role === "admin") {
    requests = db.prepare(`
      SELECT tr.*, u.name as user_name, u.email as user_email
      FROM travel_requests tr
      JOIN users u ON tr.user_id = u.id
      ORDER BY tr.created_at DESC
    `).all();
  } else {
    requests = db.prepare(`
      SELECT tr.*, u.name as user_name, u.email as user_email
      FROM travel_requests tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.user_id = ?
      ORDER BY tr.created_at DESC
    `).all(user.id);
  }

  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  initDb();
  const db = getDb();

  const sub = await getSessionSub();
  if (!sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user = db.prepare("SELECT * FROM users WHERE sub = ?").get(sub) as {
    id: number;
    role: string;
  } | undefined;

  if (!user) {
    const client = AsgardeoNext.getInstance();
    let name = "User";
    let email = "";

    try {
      const profile = await client.getUserProfile();
      const p = profile.flattenedProfile;
      name = `${p.givenName || ""} ${p.familyName || ""}`.trim() || "User";
      email = p.email || "";
    } catch {
      // use defaults
    }

    const result = db.prepare(
      "INSERT INTO users (sub, name, email, role) VALUES (?, ?, ?, ?)"
    ).run(sub, name, email, "employee");
    user = { id: Number(result.lastInsertRowid), role: "employee" };
  }

  const body = await request.json();
  const { type, item_id, check_in_date, check_out_date } = body;

  if (!type || !item_id) {
    return NextResponse.json({ error: "type and item_id are required" }, { status: 400 });
  }

  if (!["flight", "hotel"].includes(type)) {
    return NextResponse.json({ error: "type must be 'flight' or 'hotel'" }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO travel_requests (user_id, type, item_id, check_in_date, check_out_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, type, item_id, check_in_date || null, check_out_date || null);

  const created = db.prepare("SELECT * FROM travel_requests WHERE id = ?").get(result.lastInsertRowid);

  return NextResponse.json(created, { status: 201 });
}
