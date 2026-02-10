export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Billing Management API
 *
 * GET  /api/admin/billing          — Get billing entity, subscriptions, invoices
 * POST /api/admin/billing          — Create billing entity, start checkout, manage portal
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { isStripeConfigured, PLANS } = await import("@/lib/billing/stripe");

    // Get or create billing entity for the current user
    const entity = await prisma.billingEntity.findFirst({
      include: {
        subscriptions: {
          orderBy: { created_at: "desc" },
        },
        payment_methods: true,
        invoices: {
          orderBy: { created_at: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({
      stripeConfigured: isStripeConfigured(),
      plans: PLANS,
      entity: entity || null,
      subscriptions: entity?.subscriptions || [],
      paymentMethods: entity?.payment_methods || [],
      invoices: entity?.invoices || [],
    });
  } catch (error) {
    console.error("[Billing API] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load billing data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;
    const { prisma } = await import("@/lib/db");

    switch (action) {
      case "create_entity": {
        const { name, email } = body;
        if (!name || !email) {
          return NextResponse.json(
            { error: "name and email are required" },
            { status: 400 },
          );
        }

        const entity = await prisma.billingEntity.upsert({
          where: { email },
          create: { name, email },
          update: { name },
        });

        return NextResponse.json({ entity });
      }

      case "create_checkout": {
        const { entityId, planId, siteIds, billingPeriod } = body;
        if (!entityId || !planId) {
          return NextResponse.json(
            { error: "entityId and planId required" },
            { status: 400 },
          );
        }

        const { createCheckoutSession, isStripeConfigured } = await import(
          "@/lib/billing/stripe"
        );

        if (!isStripeConfigured()) {
          return NextResponse.json(
            { error: "Stripe not configured. Set STRIPE_SECRET_KEY." },
            { status: 503 },
          );
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
        const checkoutUrl = await createCheckoutSession(
          entityId,
          planId,
          siteIds || [],
          billingPeriod || "monthly",
          `${baseUrl}/admin/billing?success=true`,
          `${baseUrl}/admin/billing?canceled=true`,
        );

        return NextResponse.json({ checkoutUrl });
      }

      case "billing_portal": {
        const { entityId } = body;
        if (!entityId) {
          return NextResponse.json(
            { error: "entityId required" },
            { status: 400 },
          );
        }

        const { createBillingPortalSession, isStripeConfigured } = await import(
          "@/lib/billing/stripe"
        );

        if (!isStripeConfigured()) {
          return NextResponse.json(
            { error: "Stripe not configured" },
            { status: 503 },
          );
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
        const portalUrl = await createBillingPortalSession(
          entityId,
          `${baseUrl}/admin/billing`,
        );

        return NextResponse.json({ portalUrl });
      }

      case "update_sites": {
        const { subscriptionId, siteIds } = body;
        if (!subscriptionId || !siteIds) {
          return NextResponse.json(
            { error: "subscriptionId and siteIds required" },
            { status: 400 },
          );
        }

        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            site_ids: siteIds,
            quantity: siteIds.length,
          },
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Billing API] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Billing action failed" },
      { status: 500 },
    );
  }
}
