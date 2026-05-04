export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// ── GET: Retrieve a specific diagnostic run by runId ──────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  // Extract runId from URL pathname: /api/admin/diagnostics/[runId]
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const runId = segments[segments.length - 1];

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/db");

    const diagnostic = await prisma.systemDiagnostic.findUnique({
      where: { runId },
    });

    if (!diagnostic) {
      return NextResponse.json({ error: "Diagnostic run not found" }, { status: 404 });
    }

    return NextResponse.json(diagnostic);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      return NextResponse.json({
        _migrationNeeded: true,
        message: "SystemDiagnostic table not found — run npx prisma db push",
      });
    }
    console.error("[diagnostics/runId] GET error:", msg);
    return NextResponse.json({ error: "Failed to load diagnostic run" }, { status: 500 });
  }
});
