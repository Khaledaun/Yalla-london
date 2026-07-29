export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  try {
    const apiKey = process.env.MERCURY_API_KEY || process.env.MERCURY_API_TOKEN;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MERCURY_API_KEY not configured" },
        { status: 400 },
      );
    }

    const res = await fetch("https://api.mercury.com/api/v1/accounts", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Mercury API returned ${res.status}`);
    }

    const data = await res.json();
    const accounts = (data.accounts || data || []).map(
      (a: Record<string, unknown>) => ({
        id: a.id,
        name: a.name || a.accountName || "Account",
        type: a.type || a.accountType || "checking",
        current_balance: a.currentBalance || a.current_balance || 0,
        available_balance: a.availableBalance || a.available_balance || 0,
        currency: a.currency || "USD",
        status: a.status || "active",
      }),
    );

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("[MCP Mercury Accounts] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Mercury accounts" },
      { status: 500 },
    );
  }
}
