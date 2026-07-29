export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Admin Profile API — Password change
 *
 * POST /api/admin/profile
 * Body: { action: "change_password", currentPassword, newPassword }
 */
export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, currentPassword, newPassword } = body;

    if (action !== "change_password") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Get current user from session
    const { getToken } = await import("next-auth/jwt");
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({ where: { id: token.sub } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[profile] Password change failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
