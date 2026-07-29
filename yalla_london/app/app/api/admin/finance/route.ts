export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Finance Hub API
 * GET  — Aggregated financial data from Stripe + Mercury + CJ
 * POST — Actions: create_checkout, billing_portal, sync_invoices, refund
 */

// ─── Helpers ─────────────────────────────────────────────

function safeAmount(cents: number, currency = "GBP"): string {
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
  return `${sym}${(cents / 100).toFixed(2)}`;
}

// ─── GET: Financial Dashboard Data ──────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const result: Record<string, unknown> = {
    stripe: { configured: false },
    mercury: { configured: false },
    affiliate: { configured: false },
    summary: {},
  };

  // ── 1. Stripe Data ──────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const { getStripe } = await import("@/lib/billing/stripe");
      const stripe = getStripe();

      // Balance
      const balance = await stripe.balance.retrieve();
      const available = balance.available.reduce((s, b) => s + b.amount, 0);
      const pending = balance.pending.reduce((s, b) => s + b.amount, 0);

      // Recent charges (last 30 days)
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 86400_000) / 1000);
      const charges = await stripe.charges.list({
        created: { gte: thirtyDaysAgo },
        limit: 100,
      });

      const totalRevenue30d = charges.data
        .filter((c) => c.status === "succeeded")
        .reduce((s, c) => s + c.amount, 0);

      const refunded30d = charges.data
        .filter((c) => c.refunded)
        .reduce((s, c) => s + (c.amount_refunded || 0), 0);

      // Recent payments list
      const recentPayments = charges.data.slice(0, 20).map((c) => ({
        id: c.id,
        amount: c.amount,
        amountFormatted: safeAmount(c.amount, c.currency.toUpperCase()),
        currency: c.currency.toUpperCase(),
        status: c.status,
        description: c.description || c.metadata?.plan_id || "Payment",
        customerEmail: c.billing_details?.email || c.receipt_email || null,
        created: new Date(c.created * 1000).toISOString(),
        refunded: c.refunded,
      }));

      // Customers count
      const customers = await stripe.customers.list({ limit: 1 });

      // Subscriptions
      const subs = await stripe.subscriptions.list({ limit: 100, status: "all" });
      const activeSubs = subs.data.filter((s) => s.status === "active" || s.status === "trialing");
      const mrr = activeSubs.reduce((sum, s) => {
        const item = s.items.data[0];
        if (!item?.price?.unit_amount) return sum;
        const amount = item.price.unit_amount * (item.quantity || 1);
        if (item.price.recurring?.interval === "year") return sum + Math.round(amount / 12);
        return sum + amount;
      }, 0);

      result.stripe = {
        configured: true,
        balance: {
          available,
          availableFormatted: safeAmount(available),
          pending,
          pendingFormatted: safeAmount(pending),
        },
        revenue30d: totalRevenue30d,
        revenue30dFormatted: safeAmount(totalRevenue30d),
        refunded30d,
        refunded30dFormatted: safeAmount(refunded30d),
        mrr,
        mrrFormatted: safeAmount(mrr),
        subscriptions: {
          total: subs.data.length,
          active: activeSubs.length,
          canceled: subs.data.filter((s) => s.status === "canceled").length,
          pastDue: subs.data.filter((s) => s.status === "past_due").length,
        },
        customersTotal: customers.has_more ? "100+" : String(customers.data.length),
        recentPayments,
      };
    } catch (err) {
      console.warn("[finance] Stripe error:", err instanceof Error ? err.message : err);
      result.stripe = { configured: true, error: err instanceof Error ? err.message : "Stripe API error" };
    }
  }

  // ── 2. Mercury Data ─────────────────────────────────
  const mercuryKey = process.env.MERCURY_API_KEY || process.env.MERCURY_API_TOKEN;
  if (mercuryKey) {
    try {
      const accountsRes = await fetch("https://api.mercury.com/api/v1/accounts", {
        headers: { Authorization: `Bearer ${mercuryKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        const accounts = (accountsData.accounts || accountsData || []).map(
          (a: Record<string, unknown>) => ({
            id: a.id,
            name: a.name || a.accountName || "Account",
            type: a.type || a.accountType || "checking",
            currentBalance: a.currentBalance ?? a.current_balance ?? 0,
            availableBalance: a.availableBalance ?? a.available_balance ?? 0,
            currency: a.currency || "USD",
            status: a.status || "active",
            routingNumber: a.routingNumber || a.routing_number || null,
            accountNumber: a.accountNumber ? "****" + String(a.accountNumber).slice(-4) : null,
          }),
        );

        const totalBalance = accounts.reduce((s: number, a: { currentBalance: number }) => s + Number(a.currentBalance || 0), 0);

        // Try to get recent transactions
        let recentTransactions: unknown[] = [];
        if (accounts.length > 0 && accounts[0].id) {
          try {
            const txRes = await fetch(
              `https://api.mercury.com/api/v1/account/${accounts[0].id}/transactions?limit=20`,
              {
                headers: { Authorization: `Bearer ${mercuryKey}`, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(5000),
              },
            );
            if (txRes.ok) {
              const txData = await txRes.json();
              recentTransactions = (txData.transactions || txData || []).slice(0, 20).map(
                (t: Record<string, unknown>) => ({
                  id: t.id,
                  amount: t.amount,
                  direction: Number(t.amount) >= 0 ? "credit" : "debit",
                  description: t.bankDescription || t.externalMemo || t.note || "Transaction",
                  counterparty: t.counterpartyName || t.counterpartyNickname || null,
                  date: t.postedDate || t.createdAt,
                  status: t.status || "posted",
                }),
              );
            }
          } catch {
            // Transactions are optional
          }
        }

        result.mercury = {
          configured: true,
          accounts,
          totalBalance,
          totalBalanceFormatted: `$${Number(totalBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          recentTransactions,
        };
      } else {
        result.mercury = { configured: true, error: `Mercury API returned ${accountsRes.status}` };
      }
    } catch (err) {
      console.warn("[finance] Mercury error:", err instanceof Error ? err.message : err);
      result.mercury = { configured: true, error: err instanceof Error ? err.message : "Mercury API error" };
    }
  }

  // ── 3. Affiliate Revenue (from DB) ──────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

    const [clickCount, commissionAgg] = await Promise.all([
      prisma.cjClickEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.cjCommission.aggregate({
        where: { eventDate: { gte: thirtyDaysAgo } },
        _sum: { commissionAmount: true },
        _count: true,
      }),
    ]);

    result.affiliate = {
      configured: !!(process.env.CJ_API_TOKEN && process.env.CJ_WEBSITE_ID),
      clicks30d: clickCount,
      commissions30d: commissionAgg._count,
      revenue30d: commissionAgg._sum.commissionAmount || 0,
      revenue30dFormatted: `$${(Number(commissionAgg._sum.commissionAmount || 0)).toFixed(2)}`,
    };
  } catch {
    // CJ tables may not exist yet
  }

  // ── 4. Summary ─────────────────────────────────────
  const stripeData = result.stripe as Record<string, unknown>;
  const mercuryData = result.mercury as Record<string, unknown>;
  const affiliateData = result.affiliate as Record<string, unknown>;

  result.summary = {
    stripeConfigured: !!stripeKey,
    mercuryConfigured: !!mercuryKey,
    affiliateConfigured: !!(process.env.CJ_API_TOKEN && process.env.CJ_WEBSITE_ID),
    stripeBalance: stripeData.configured && !stripeData.error ? (stripeData.balance as Record<string, unknown>)?.available || 0 : 0,
    mercuryBalance: mercuryData.configured && !mercuryData.error ? mercuryData.totalBalance || 0 : 0,
    affiliateRevenue30d: affiliateData.revenue30d || 0,
  };

  return NextResponse.json(result);
}

// ─── POST: Actions ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create_checkout": {
        const { planId, billingPeriod, siteIds } = body;
        const { createCheckoutSession } = await import("@/lib/billing/stripe");
        const { prisma } = await import("@/lib/db");

        // Find or create billing entity
        let entity = await prisma.billingEntity.findFirst();
        if (!entity) {
          const { getDefaultSiteId } = await import("@/config/sites");
          entity = await prisma.billingEntity.create({
            data: {
              name: "Zenitha.Luxury LLC",
              email: process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "admin@zenitha.luxury",
            },
          });
        }

        const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());
        const url = await createCheckoutSession(
          entity.id,
          planId || "pro",
          siteIds || [],
          billingPeriod || "monthly",
          `${baseUrl}/admin/cockpit/finance?checkout=success`,
          `${baseUrl}/admin/cockpit/finance?checkout=canceled`,
        );

        return NextResponse.json({ success: true, url });
      }

      case "billing_portal": {
        const { createBillingPortalSession } = await import("@/lib/billing/stripe");
        const { prisma } = await import("@/lib/db");

        const entity = await prisma.billingEntity.findFirst();
        if (!entity) {
          return NextResponse.json({ error: "No billing entity found" }, { status: 404 });
        }

        const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());
        const url = await createBillingPortalSession(entity.id, `${baseUrl}/admin/cockpit/finance`);
        return NextResponse.json({ success: true, url });
      }

      case "sync_invoices": {
        const { getStripe } = await import("@/lib/billing/stripe");
        const { prisma } = await import("@/lib/db");
        const stripe = getStripe();

        const entity = await prisma.billingEntity.findFirst();
        if (!entity?.stripe_customer_id) {
          return NextResponse.json({ success: true, synced: 0, message: "No Stripe customer found" });
        }

        const invoices = await stripe.invoices.list({ customer: entity.stripe_customer_id, limit: 50 });
        let synced = 0;

        for (const inv of invoices.data) {
          await prisma.invoice.upsert({
            where: { stripe_invoice_id: inv.id },
            create: {
              billing_entity_id: entity.id,
              stripe_invoice_id: inv.id,
              number: inv.number ?? undefined,
              status: inv.status || "draft",
              amount_due: inv.amount_due,
              amount_paid: inv.amount_paid,
              currency: inv.currency.toUpperCase(),
              period_start: inv.period_start ? new Date(inv.period_start * 1000) : undefined,
              period_end: inv.period_end ? new Date(inv.period_end * 1000) : undefined,
              paid_at: inv.status === "paid" ? new Date() : undefined,
              hosted_invoice_url: inv.hosted_invoice_url ?? undefined,
              pdf_url: inv.invoice_pdf ?? undefined,
            },
            update: {
              status: inv.status || "draft",
              amount_paid: inv.amount_paid,
              paid_at: inv.status === "paid" ? new Date() : undefined,
            },
          });
          synced++;
        }

        return NextResponse.json({ success: true, synced });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[finance] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process action" },
      { status: 500 },
    );
  }
}
