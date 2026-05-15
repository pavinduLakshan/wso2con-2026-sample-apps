import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../../../../../lib/auth/guard";
import { UserRole } from "../../../../../lib/auth/utils";
import { scimGetRoleById, scimUpdateRoleUsers } from "../../../../../lib/asgardeo/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, [UserRole.ADMIN]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Role ID is required." }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const newUserIds: string[] = Array.isArray(payload.userIds) ? payload.userIds : [];

    const accessToken = request.headers.get("authorization")!.slice(7);

    const role = await scimGetRoleById(accessToken, id);
    const currentUserIds = (role.users ?? []).map((u) => u.value);

    const toAdd = newUserIds.filter((uid) => !currentUserIds.includes(uid));
    const toRemove = currentUserIds.filter((uid) => !newUserIds.includes(uid));

    await scimUpdateRoleUsers(accessToken, id, toAdd, toRemove);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[organization/roles/${id}/users] Failed to update role users.`, error);
    return NextResponse.json({ message: "Failed to update role assignments." }, { status: 500 });
  }
}
