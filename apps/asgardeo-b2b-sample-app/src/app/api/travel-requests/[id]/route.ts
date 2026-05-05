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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, admin_notes } = body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const existing = db.prepare("SELECT * FROM travel_requests WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Travel request not found" }, { status: 404 });
  }

  db.prepare(`
    UPDATE travel_requests
    SET status = ?, admin_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, admin_notes || "", id);

  const updated = db.prepare("SELECT * FROM travel_requests WHERE id = ?").get(id);

  return NextResponse.json(updated);
}
