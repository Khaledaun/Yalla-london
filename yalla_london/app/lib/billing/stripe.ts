/**
 * Stripe Billing Integration
 *
 * One operating entity (BillingEntity) can own multiple sites.
 * All sites share the same Stripe customer / payment method / subscription.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY       — Stripe API secret key
 *   STRIPE_WEBHOOK_SECRET   — Webhook endpoint signing secret
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — For client-side Stripe.js
 */

import Stripe from "stripe";

// ─── Stripe Client ──────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// ─── Plan Definitions ───────────────────────────────────────

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // in currency units (e.g. GBP)
  priceYearly: number;
  currency: string;
  features: string[];
  maxSites: number;
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Basic site with limited features",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "GBP",
    features: [
      "1 site",
      "Basic content management",
      "Community support",
    ],
    maxSites: 1,
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For growing content businesses",
    priceMonthly: 29,
    priceYearly: 290,
    currency: "GBP",
    features: [
      "Up to 3 sites",
      "AI content generation",
      "SEO automation",
      "Basic analytics",
      "Email support",
    ],
    maxSites: 3,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Full platform for multi-site operations",
    priceMonthly: 79,
    priceYearly: 790,
    currency: "GBP",
    features: [
      "Up to 10 sites",
      "Unlimited AI generation",
      "Full SEO suite",
      "Design & Video Studio",
      "WordPress integration",
      "Priority support",
      "Custom domains",
    ],
    maxSites: 10,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited sites, dedicated support",
    priceMonthly: 199,
    priceYearly: 1990,
    currency: "GBP",
    features: [
      "Unlimited sites",
      "White-label options",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantees",
    ],
    maxSites: 999,
  },
};

// ─── Customer Management ────────────────────────────────────

/**
 * Create or retrieve a Stripe customer for a billing entity.
 */
export async function getOrCreateStripeCustomer(
  entityId: string,
  email: string,
  name: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const stripe = getStripe();

  // Check if entity already has a Stripe customer
  const entity = await prisma.billingEntity.findUnique({
    where: { id: entityId },
    select: { stripe_customer_id: true },
  });

  if (entity?.stripe_customer_id) {
    return entity.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { billing_entity_id: entityId },
  });

  // Persist the customer ID
  await prisma.billingEntity.update({
    where: { id: entityId },
    data: { stripe_customer_id: customer.id },
  });

  return customer.id;
}

// ─── Subscription Management ────────────────────────────────

/**
 * Create a Stripe Checkout Session for subscribing to a plan.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckoutSession(
  billingEntityId: string,
  planId: string,
  siteIds: string[],
  billingPeriod: "monthly" | "yearly" = "monthly",
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const stripe = getStripe();

  const entity = await prisma.billingEntity.findUnique({
    where: { id: billingEntityId },
  });
  if (!entity) throw new Error("Billing entity not found");

  const customerId = await getOrCreateStripeCustomer(
    billingEntityId,
    entity.email,
    entity.name,
  );

  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const amount = billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const interval = billingPeriod === "yearly" ? "year" : "month";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: `${plan.name} Plan`,
            description: plan.description,
          },
          unit_amount: amount * 100, // convert to pence/cents
          recurring: { interval },
        },
        quantity: siteIds.length || 1,
      },
    ],
    metadata: {
      billing_entity_id: billingEntityId,
      plan_id: planId,
      site_ids: JSON.stringify(siteIds),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

/**
 * Create a billing portal session for managing subscriptions/payment methods.
 */
export async function createBillingPortalSession(
  billingEntityId: string,
  returnUrl: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const stripe = getStripe();

  const entity = await prisma.billingEntity.findUnique({
    where: { id: billingEntityId },
    select: { stripe_customer_id: true },
  });

  if (!entity?.stripe_customer_id) {
    throw new Error("No Stripe customer found for this billing entity");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: entity.stripe_customer_id,
    return_url: returnUrl,
  });

  return session.url;
}

// ─── Webhook Handling ───────────────────────────────────────

/**
 * Process Stripe webhook events.
 * Returns a summary of what was processed.
 */
export async function handleStripeWebhook(
  event: Stripe.Event,
): Promise<{ action: string; details: Record<string, unknown> }> {
  const { prisma } = await import("@/lib/db");

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as unknown as {
        metadata?: Record<string, string>;
        subscription?: string;
      };
      const entityId = session.metadata?.billing_entity_id;
      const planId = session.metadata?.plan_id || "pro";
      const siteIds = JSON.parse(session.metadata?.site_ids || "[]");

      if (entityId && session.subscription) {
        // Fetch subscription details
        const stripe = getStripe();
        const subResponse = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        // Extract plain object from Stripe response
        const sub = subResponse as unknown as {
          id: string;
          status: string;
          current_period_start: number;
          current_period_end: number;
          trial_end: number | null;
          items: { data: Array<{ price?: { id: string } }> };
        };

        await prisma.subscription.create({
          data: {
            billing_entity_id: entityId,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0]?.price?.id,
            plan_name: planId,
            status: sub.status,
            site_ids: siteIds,
            quantity: siteIds.length || 1,
            current_period_start: new Date(sub.current_period_start * 1000),
            current_period_end: new Date(sub.current_period_end * 1000),
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000)
              : null,
          },
        });
      }

      return {
        action: "subscription_created",
        details: { entityId, planId, siteIds },
      };
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as unknown as {
        id: string; status: string;
        current_period_start: number; current_period_end: number;
        cancel_at_period_end: boolean;
      };
      const existingUpd = await prisma.subscription.findUnique({
        where: { stripe_subscription_id: sub.id },
      });

      if (existingUpd) {
        await prisma.subscription.update({
          where: { id: existingUpd.id },
          data: {
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000),
            current_period_end: new Date(sub.current_period_end * 1000),
            cancel_at_period_end: sub.cancel_at_period_end,
          },
        });
      }

      return {
        action: "subscription_updated",
        details: { subId: sub.id, status: sub.status },
      };
    }

    case "customer.subscription.deleted": {
      const subDel = event.data.object as unknown as { id: string };
      const existingDel = await prisma.subscription.findUnique({
        where: { stripe_subscription_id: subDel.id },
      });

      if (existingDel) {
        await prisma.subscription.update({
          where: { id: existingDel.id },
          data: { status: "canceled" },
        });
      }

      return {
        action: "subscription_canceled",
        details: { subId: subDel.id },
      };
    }

    case "invoice.paid": {
      const inv = event.data.object as unknown as {
        id: string; number?: string; amount_due: number; amount_paid: number;
        currency: string; period_start?: number; period_end?: number;
        hosted_invoice_url?: string; invoice_pdf?: string;
        customer: string | { id: string };
      };
      const customerId =
        typeof inv.customer === "string" ? inv.customer : inv.customer?.id;

      const entity = customerId
        ? await prisma.billingEntity.findFirst({
            where: { stripe_customer_id: customerId },
          })
        : null;

      if (entity) {
        await prisma.invoice.upsert({
          where: { stripe_invoice_id: inv.id },
          create: {
            billing_entity_id: entity.id,
            stripe_invoice_id: inv.id,
            number: inv.number ?? undefined,
            status: "paid",
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            currency: inv.currency.toUpperCase(),
            period_start: inv.period_start
              ? new Date(inv.period_start * 1000)
              : undefined,
            period_end: inv.period_end
              ? new Date(inv.period_end * 1000)
              : undefined,
            paid_at: new Date(),
            hosted_invoice_url: inv.hosted_invoice_url ?? undefined,
            pdf_url: typeof inv.invoice_pdf === "string" ? inv.invoice_pdf : undefined,
          },
          update: {
            status: "paid",
            amount_paid: inv.amount_paid,
            paid_at: new Date(),
          },
        });
      }

      return {
        action: "invoice_paid",
        details: { invoiceId: inv.id, amount: inv.amount_paid },
      };
    }

    case "invoice.payment_failed": {
      const failedInv = event.data.object as unknown as { id: string };
      return {
        action: "payment_failed",
        details: { invoiceId: failedInv.id },
      };
    }

    default:
      return {
        action: "unhandled",
        details: { type: event.type },
      };
  }
}

// ─── Charter Deposit Payment Handling ─────────────────────

/**
 * Handle a completed checkout for a yacht charter deposit.
 * Called from the webhook route when metadata indicates purchase_type === "charter_deposit".
 *
 * Maps to Execution Plan action [0.4]: Payment integration (Stripe).
 *
 * 1. Updates CharterInquiry status to DEPOSIT_PAID
 * 2. Records payment details on the inquiry
 * 3. Sends confirmation email via Resend
 */
export async function handleCharterDepositPayment(
  session: {
    id: string;
    payment_intent?: string | null;
    metadata?: Record<string, string> | null;
    amount_total?: number | null;
    currency?: string | null;
  },
): Promise<{ action: string; details: Record<string, unknown> }> {
  const { prisma } = await import("@/lib/db");

  const inquiryId = session.metadata?.inquiry_id;
  const referenceNumber = session.metadata?.reference_number;
  const customerName = session.metadata?.customer_name;
  const customerEmail = session.metadata?.customer_email;

  if (!inquiryId) {
    return {
      action: "charter_deposit_skipped",
      details: { reason: "no inquiry_id in metadata" },
    };
  }

  // Update inquiry with deposit payment info
  const amountInCurrency = (session.amount_total || 0) / 100;
  const inquiry = await prisma.charterInquiry.update({
    where: { id: inquiryId },
    data: {
      status: "DEPOSIT_PAID",
      depositPaymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id,
      depositAmount: amountInCurrency,
      depositPaidAt: new Date(),
    },
  });

  // Send confirmation email (best-effort)
  if (customerEmail || inquiry.email) {
    try {
      const { sendEmail } = await import("@/lib/email/sender");
      const { getSiteDomain } = await import("@/config/sites");
      const domain = getSiteDomain("zenitha-yachts-med");

      await sendEmail({
        to: customerEmail || inquiry.email,
        subject: `Charter Deposit Confirmed — ${referenceNumber || inquiry.referenceNumber || "Zenitha Yachts"}`,
        html: `<div style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0A1628; padding: 32px; text-align: center;">
            <h1 style="color: #C8A951; margin: 0; font-size: 28px;">Deposit Confirmed</h1>
          </div>
          <div style="padding: 32px; background: #ffffff;">
            <p>Dear ${customerName || inquiry.firstName},</p>
            <p>Thank you for your charter deposit. Your payment has been confirmed.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
              <tr><td style="padding: 8px 0; color: #666;">Reference</td><td style="padding: 8px 0; font-weight: bold;">${referenceNumber || inquiry.referenceNumber}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Deposit Amount</td><td style="padding: 8px 0; font-weight: bold;">€${amountInCurrency.toLocaleString()}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Destination</td><td style="padding: 8px 0;">${inquiry.destination || "Mediterranean"}</td></tr>
            </table>
            <p>Our charter team will be in touch within 24 hours to finalize your itinerary.</p>
            <p style="margin-top: 24px;">
              <a href="${domain}/inquiry/confirmation?ref=${referenceNumber || inquiry.referenceNumber}" style="background: #C8A951; color: #0A1628; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Confirmation</a>
            </p>
          </div>
          <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #999;">
            Zenitha Yachts — Mediterranean Charter Specialists
          </div>
        </div>`,
      });
    } catch (emailError) {
      console.error("[charter-deposit] Failed to send confirmation email:", emailError);
    }
  }

  // Log as audit event (best-effort)
  try {
    await prisma.auditLog.create({
      data: {
        action: "CHARTER_DEPOSIT_PAID",
        details: {
          inquiryId,
          referenceNumber: referenceNumber || inquiry.referenceNumber,
          amount: amountInCurrency,
          currency: session.currency || "eur",
          stripeSessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
      },
    });
  } catch (auditErr) {
    console.warn("[charter-deposit] Audit log failed:", auditErr instanceof Error ? auditErr.message : String(auditErr));
  }

  return {
    action: "charter_deposit_paid",
    details: {
      inquiryId: inquiry.id,
      referenceNumber: referenceNumber || inquiry.referenceNumber,
      amount: amountInCurrency,
      currency: session.currency || "eur",
    },
  };
}

// ─── Digital Product Purchase Handling ─────────────────────

/**
 * Handle a completed checkout for a digital product.
 * Called from the webhook route when metadata indicates purchase_type === "digital_product".
 *
 * 1. Marks the Purchase as COMPLETED
 * 2. Sends a delivery email with the download link
 */
export async function handleDigitalProductPurchase(
  session: {
    id: string;
    payment_intent?: string | null;
    metadata?: Record<string, string> | null;
  },
): Promise<{ action: string; details: Record<string, unknown> }> {
  const { prisma } = await import("@/lib/db");

  const purchaseId = session.metadata?.purchase_id;
  const downloadToken = session.metadata?.download_token;
  const customerEmail = session.metadata?.customer_email;

  if (!purchaseId) {
    return {
      action: "digital_product_purchase_skipped",
      details: { reason: "no purchase_id in metadata" },
    };
  }

  // Mark purchase as completed
  const purchase = await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      status: "COMPLETED",
      payment_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      completed_at: new Date(),
    },
    include: { product: true },
  });

  // Send delivery email (best-effort)
  if (customerEmail || purchase.customer_email) {
    try {
      const { sendPurchaseDeliveryEmail } = await import(
        "@/lib/email-notifications"
      );
      const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());
      await sendPurchaseDeliveryEmail({
        to: customerEmail || purchase.customer_email,
        customerName: purchase.customer_name || undefined,
        productName: purchase.product.name_en,
        amount: purchase.amount,
        currency: purchase.currency,
        downloadUrl: `${baseUrl}/shop/download?token=${downloadToken || purchase.download_token}`,
      });
    } catch (emailError) {
      console.error(
        "[Stripe] Failed to send delivery email:",
        emailError,
      );
    }
  }

  // Capture as lead (best-effort)
  try {
    await prisma.lead.create({
      data: {
        site_id: purchase.site_id,
        email: purchase.customer_email,
        name: purchase.customer_name,
        lead_type: "GUIDE_DOWNLOAD",
        lead_source: "stripe_checkout",
        status: "CONVERTED",
        score: 80,
        interests_json: [purchase.product.name_en, purchase.product.product_type],
        landing_page: `/shop/${purchase.product.slug}`,
      },
    });
  } catch {
    // Lead may already exist
  }

  return {
    action: "digital_product_purchased",
    details: {
      purchaseId: purchase.id,
      productId: purchase.product_id,
      amount: purchase.amount,
      email: purchase.customer_email,
    },
  };
}
