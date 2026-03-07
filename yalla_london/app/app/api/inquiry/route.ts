export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * POST /api/inquiry
 *
 * Public endpoint for submitting charter inquiry leads.
 * Validates required fields, generates a reference number (ZY-{year}-{sequence}),
 * and persists to the CharterInquiry table.
 *
 * Rate limited: rejects if the same email submitted an inquiry in the last 5 minutes.
 *
 * Required body fields:
 *   - firstName (string, 1-100 chars)
 *   - lastName (string, 1-100 chars)
 *   - email (string, valid email format)
 *   - guestCount (number, 1-100)
 *
 * Optional body fields:
 *   - phone, whatsappNumber, destination, preferredDates, childrenCount,
 *     budget, budgetCurrency, yachtTypePreference, preferences,
 *     experienceLevel, languagePreference, contactPreference, message,
 *     yachtId, source, utmSource, utmMedium, utmCampaign
 */
export async function POST(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    // Parse and validate body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      whatsappNumber,
      destination,
      preferredDates,
      guestCount,
      childrenCount,
      budget,
      budgetCurrency,
      yachtTypePreference,
      preferences,
      experienceLevel,
      languagePreference,
      contactPreference,
      message,
      yachtId,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      // Fields from frontend inquiry form (alternative naming)
      adults,
      children: childrenAlt,
      dates,
      yachtSlug,
      yachtTypes,
      halalCatering,
      crewRequired,
    } = body as Record<string, unknown>;

    // ── Validation ──────────────────────────────────────────────

    const errors: string[] = [];

    if (
      !firstName ||
      typeof firstName !== "string" ||
      firstName.trim().length === 0 ||
      firstName.trim().length > 100
    ) {
      errors.push("firstName is required (1-100 characters)");
    }

    if (
      !lastName ||
      typeof lastName !== "string" ||
      lastName.trim().length === 0 ||
      lastName.trim().length > 100
    ) {
      errors.push("lastName is required (1-100 characters)");
    }

    if (
      !email ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.push("A valid email address is required");
    }

    // Accept either guestCount or adults from frontend form
    const rawGuestCount = guestCount ?? adults;
    const parsedGuestCount =
      typeof rawGuestCount === "number" ? rawGuestCount : parseInt(String(rawGuestCount), 10);
    if (isNaN(parsedGuestCount) || parsedGuestCount < 1 || parsedGuestCount > 100) {
      errors.push("guestCount is required (1-100)");
    }

    // Accept either childrenCount or children from frontend form
    const rawChildrenCount = childrenCount ?? childrenAlt;

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", fields: errors },
        { status: 400 },
      );
    }

    // ── Rate Limit: same email within 5 minutes ─────────────────

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentInquiry = await prisma.charterInquiry.findFirst({
      where: {
        email: (email as string).toLowerCase().trim(),
        siteId,
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { id: true },
    });

    if (recentInquiry) {
      return NextResponse.json(
        {
          error: "Please wait a few minutes before submitting another inquiry",
        },
        { status: 429 },
      );
    }

    // ── Generate Reference Number: ZY-{year}-{sequence} ─────────

    const year = new Date().getFullYear();
    const prefix = `ZY-${year}-`;

    // Find the highest sequence number for this year (scoped by site)
    const lastInquiry = await prisma.charterInquiry.findFirst({
      where: {
        referenceNumber: { startsWith: prefix },
        siteId,
      },
      orderBy: { createdAt: "desc" },
      select: { referenceNumber: true },
    });

    let sequence = 1;
    if (lastInquiry?.referenceNumber) {
      const lastSeq = parseInt(
        lastInquiry.referenceNumber.replace(prefix, ""),
        10,
      );
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    const referenceNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

    // ── Resolve yachtSlug to yachtId if provided ────────────────

    let resolvedYachtId = typeof yachtId === "string" ? yachtId : undefined;
    if (!resolvedYachtId && typeof yachtSlug === "string" && yachtSlug) {
      try {
        const yacht = await prisma.yacht.findFirst({
          where: { slug: yachtSlug, siteId },
          select: { id: true },
        });
        if (yacht) resolvedYachtId = yacht.id;
      } catch (lookupErr) {
        console.warn("[Inquiry API] Yacht slug lookup failed:", lookupErr);
      }
    }

    // ── Validate optional yacht type ────────────────────────────

    const validYachtTypes = [
      "SAILBOAT",
      "CATAMARAN",
      "MOTOR_YACHT",
      "GULET",
      "SUPERYACHT",
      "POWER_CATAMARAN",
    ];

    // Accept single yachtTypePreference or first from yachtTypes array
    let yachtTypePref: string | undefined;
    if (
      typeof yachtTypePreference === "string" &&
      validYachtTypes.includes(yachtTypePreference)
    ) {
      yachtTypePref = yachtTypePreference;
    } else if (Array.isArray(yachtTypes) && yachtTypes.length > 0) {
      const firstValid = yachtTypes.find((t: unknown) =>
        typeof t === "string" && validYachtTypes.includes(t)
      );
      if (firstValid) yachtTypePref = firstValid as string;
    }

    // ── Validate optional experience level ──────────────────────

    const validExperienceLevels = ["first_time", "some", "experienced"];
    const expLevel =
      typeof experienceLevel === "string" &&
      validExperienceLevels.includes(experienceLevel)
        ? experienceLevel
        : "first_time";

    // ── Validate optional contact preference ────────────────────

    const validContactPrefs = ["email", "whatsapp", "phone"];
    const contactPref =
      typeof contactPreference === "string" &&
      validContactPrefs.includes(contactPreference)
        ? contactPreference
        : "email";

    // ── Resolve preferredDates (accept object or string from frontend) ──

    let resolvedPreferredDates: unknown = undefined;
    if (preferredDates && typeof preferredDates === "object") {
      resolvedPreferredDates = preferredDates;
    } else if (typeof dates === "string" && dates.trim()) {
      resolvedPreferredDates = { flexible: dates.trim() };
    }

    // ── Resolve budget (accept number, numeric string, or range string like "10000-25000") ──

    let resolvedBudget: number | undefined;
    if (typeof budget === "number") {
      resolvedBudget = budget;
    } else if (typeof budget === "string") {
      // Handle range strings: take the lower bound (e.g., "10000-25000" → 10000)
      const rangeParts = budget.split("-").map((s) => parseFloat(s.trim()));
      if (rangeParts.length > 0 && !isNaN(rangeParts[0])) {
        resolvedBudget = rangeParts[0];
      }
    }

    // ── Resolve preferences (merge existing object with frontend toggles) ──

    let resolvedPreferences: Record<string, unknown> | undefined;
    if (preferences && typeof preferences === "object") {
      resolvedPreferences = preferences as Record<string, unknown>;
    }
    // Merge halalCatering / crewRequired from frontend form into preferences
    if (typeof halalCatering === "boolean" || typeof crewRequired === "boolean") {
      resolvedPreferences = {
        ...(resolvedPreferences || {}),
        ...(typeof halalCatering === "boolean" ? { halal: halalCatering } : {}),
        ...(typeof crewRequired === "boolean" ? { crew: crewRequired } : {}),
      };
    }

    // ── Resolve childrenCount from either field ──────────────────

    const parsedChildrenCount =
      typeof rawChildrenCount === "number"
        ? rawChildrenCount
        : typeof rawChildrenCount === "string"
          ? parseInt(rawChildrenCount, 10) || 0
          : 0;

    // ── Create the inquiry ──────────────────────────────────────

    const inquiry = await prisma.charterInquiry.create({
      data: {
        referenceNumber,
        firstName: (firstName as string).trim(),
        lastName: (lastName as string).trim(),
        email: (email as string).toLowerCase().trim(),
        phone: typeof phone === "string" ? phone.trim() : undefined,
        whatsappNumber:
          typeof whatsappNumber === "string"
            ? whatsappNumber.trim()
            : undefined,
        destination:
          typeof destination === "string" ? destination.trim() : undefined,
        preferredDates: resolvedPreferredDates
          ? resolvedPreferredDates
          : undefined,
        guestCount: parsedGuestCount,
        childrenCount: parsedChildrenCount,
        budget: resolvedBudget,
        budgetCurrency:
          typeof budgetCurrency === "string" ? budgetCurrency : "EUR",
        yachtTypePreference: yachtTypePref as
          | "SAILBOAT"
          | "CATAMARAN"
          | "MOTOR_YACHT"
          | "GULET"
          | "SUPERYACHT"
          | "POWER_CATAMARAN"
          | undefined,
        preferences: resolvedPreferences || undefined,
        experienceLevel: expLevel,
        languagePreference:
          typeof languagePreference === "string" ? languagePreference : "en",
        contactPreference: contactPref,
        message:
          typeof message === "string" ? message.trim().slice(0, 5000) : undefined,
        yachtId: resolvedYachtId,
        siteId,
        source: typeof source === "string" ? source : "organic",
        utmSource: typeof utmSource === "string" ? utmSource : undefined,
        utmMedium: typeof utmMedium === "string" ? utmMedium : undefined,
        utmCampaign: typeof utmCampaign === "string" ? utmCampaign : undefined,
      },
      select: {
        id: true,
        referenceNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        referenceNumber: inquiry.referenceNumber,
        message:
          "Your charter inquiry has been received. Our team will contact you within 24 hours.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.warn("[Inquiry API] Failed to create charter inquiry:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 },
    );
  }
}
