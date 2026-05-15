import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../../../../lib/auth/guard";
import { UserRole } from "../../../../lib/auth/utils";
import { scimUpdateAccountLocked } from "../../../../lib/asgardeo/client";

type PatchRequest = { locked?: boolean };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, [UserRole.ADMIN]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "User ID is required." }, { status: 400 });
  }

  try {
    const payload = (await request.json()) as PatchRequest;
    if (typeof payload.locked !== "boolean") {
      return NextResponse.json({ message: "'locked' boolean field is required." }, { status: 400 });
    }

    const accessToken = request.headers.get("authorization")!.slice(7);
    await scimUpdateAccountLocked(accessToken, id, payload.locked);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[organization/users/${id}] Failed to update account lock status.`, error);
    return NextResponse.json({ message: "Failed to update account status." }, { status: 500 });
  }
}
