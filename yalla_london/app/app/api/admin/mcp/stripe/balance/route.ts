export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY not configured" },
        { status: 400 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key);

    const balance = await stripe.balance.retrieve();

    return NextResponse.json({
      available: balance.available.map((b) => ({
        amount: b.amount,
        currency: b.currency,
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount,
        currency: b.currency,
      })),
    });
  } catch (error) {
    console.error("[MCP Stripe Balance] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe balance" },
      { status: 500 },
    );
  }
}
