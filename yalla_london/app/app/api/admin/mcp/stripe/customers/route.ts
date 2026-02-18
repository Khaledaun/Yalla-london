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

    const customers = await stripe.customers.list({ limit: 25 });

    return NextResponse.json({
      customers: customers.data.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name,
        created: new Date(c.created * 1000).toISOString(),
      })),
    });
  } catch (error) {
    console.error("[MCP Stripe Customers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe customers" },
      { status: 500 },
    );
  }
}
