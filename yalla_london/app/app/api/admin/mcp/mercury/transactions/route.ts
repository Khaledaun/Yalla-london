export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const apiKey = process.env.MERCURY_API_KEY || process.env.MERCURY_API_TOKEN;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MERCURY_API_KEY not configured" },
        { status: 400 },
      );
    }

    // First get accounts to find the primary account ID
    const accountsRes = await fetch(
      "https://api.mercury.com/api/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!accountsRes.ok) {
      throw new Error(`Mercury API returned ${accountsRes.status}`);
    }

    const accountsData = await accountsRes.json();
    const accounts = accountsData.accounts || accountsData || [];

    if (accounts.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    // Fetch transactions from the first account
    const accountId = accounts[0].id;
    const txRes = await fetch(
      `https://api.mercury.com/api/v1/account/${accountId}/transactions?limit=25`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!txRes.ok) {
      throw new Error(`Mercury API returned ${txRes.status}`);
    }

    const txData = await txRes.json();
    const transactions = (txData.transactions || txData || []).map(
      (t: Record<string, unknown>) => ({
        id: t.id,
        amount: t.amount || 0,
        currency: t.currency || "USD",
        direction:
          (t.amount as number) > 0
            ? "credit"
            : ("debit" as "credit" | "debit"),
        status: t.status || "completed",
        counterparty_name:
          t.counterpartyName ||
          (t.counterparty as Record<string, unknown>)?.name ||
          "",
        description: t.description || t.note || "",
        created_at: t.createdAt || t.postedDate || new Date().toISOString(),
      }),
    );

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[MCP Mercury Transactions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Mercury transactions" },
      { status: 500 },
    );
  }
}
