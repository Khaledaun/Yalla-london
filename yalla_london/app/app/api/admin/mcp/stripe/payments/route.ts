export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
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

    const charges = await stripe.charges.list({ limit: 25 });

    return NextResponse.json({
      payments: charges.data.map((c) => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        status: c.status,
        customer_email: c.billing_details?.email || c.receipt_email || null,
        description: c.description,
        created: new Date(c.created * 1000).toISOString(),
      })),
    });
  } catch (error) {
    console.error("[MCP Stripe Payments] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe payments" },
      { status: 500 },
    );
  }
}
