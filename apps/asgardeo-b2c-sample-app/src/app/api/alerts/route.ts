import { NextRequest, NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { Alert } from "@/lib/types";
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
  const alerts = db.prepare("SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
  return NextResponse.json(alerts);
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
  const { name, type, origin, destination, city, max_price, min_stars } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  if (!["flight", "hotel"].includes(type)) {
    return NextResponse.json({ error: "type must be 'flight' or 'hotel'" }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO alerts (user_id, name, type, origin, destination, city, max_price, min_stars)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    name,
    type,
    origin || null,
    destination || null,
    city || null,
    max_price || null,
    min_stars || null,
  );

  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(result.lastInsertRowid) as Alert;
  return NextResponse.json(alert, { status: 201 });
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
  const { id, enabled, ciba_status } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const alert = db.prepare("SELECT * FROM alerts WHERE id = ? AND user_id = ?").get(id, user.id) as Alert | undefined;
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const params: (number | string)[] = [];

  if (enabled !== undefined) {
    updates.push("enabled = ?");
    params.push(enabled ? 1 : 0);
  }
  if (ciba_status !== undefined) {
    updates.push("ciba_status = ?");
    params.push(ciba_status);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE alerts SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  const updated = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  initDb();
  const db = getDb();
  const sub = await getSessionSub();
  if (!sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser(db, sub);

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const alert = db.prepare("SELECT * FROM alerts WHERE id = ? AND user_id = ?").get(id, user.id) as Alert | undefined;
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
