import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../../../../../lib/auth/guard";
import { UserRole } from "../../../../../lib/auth/utils";
import { scimSendPasswordResetLink } from "../../../../../lib/asgardeo/client";

export async function POST(
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
    const accessToken = request.headers.get("authorization")!.slice(7);
    await scimSendPasswordResetLink(accessToken, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[organization/users/${id}/reset-password] Failed to send reset link.`, error);
    return NextResponse.json({ message: "Failed to send password reset link." }, { status: 500 });
  }
}
