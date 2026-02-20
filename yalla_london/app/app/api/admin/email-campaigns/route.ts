/**
 * Email Campaigns CRUD API
 *
 * GET    — List email campaigns with filters and pagination
 * POST   — Create a new email campaign
 * PATCH  — Update an existing email campaign by id (from body)
 * DELETE — Delete an email campaign by id (from query param)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const site =
      request.headers.get("x-site-id") || searchParams.get("site");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (site) where.site = site;
    if (status) where.status = status;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[email-campaigns-api] Failed to list campaigns:", error);
    return NextResponse.json(
      { error: "Failed to list email campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, site, templateId, subject, htmlContent, scheduledAt } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    if (!site || typeof site !== "string" || !site.trim()) {
      return NextResponse.json(
        { error: "site is required" },
        { status: 400 }
      );
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }
    if (!htmlContent || typeof htmlContent !== "string") {
      return NextResponse.json(
        { error: "htmlContent is required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        name: name.trim(),
        site: site.trim(),
        templateId: templateId || null,
        subject: subject.trim(),
        htmlContent,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? "scheduled" : "draft",
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[email-campaigns-api] Failed to create campaign:", error);
    return NextResponse.json(
      { error: "Failed to create email campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    // Prevent editing campaigns that are already sending or sent
    const existing = await prisma.emailCampaign.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (existing.status === "sending" || existing.status === "sent") {
      return NextResponse.json(
        { error: `Cannot edit a campaign with status "${existing.status}"` },
        { status: 409 }
      );
    }

    const allowedFields = [
      "name",
      "site",
      "templateId",
      "subject",
      "htmlContent",
      "scheduledAt",
      "status",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Convert scheduledAt string to Date if present
    if (typeof updateData.scheduledAt === "string") {
      updateData.scheduledAt = new Date(updateData.scheduledAt as string);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ campaign });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }
    console.error("[email-campaigns-api] Failed to update campaign:", error);
    return NextResponse.json(
      { error: "Failed to update email campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    // Prevent deleting campaigns that are currently sending
    const existing = await prisma.emailCampaign.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (existing.status === "sending") {
      return NextResponse.json(
        { error: "Cannot delete a campaign that is currently sending" },
        { status: 409 }
      );
    }

    await prisma.emailCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }
    console.error("[email-campaigns-api] Failed to delete campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete email campaign" },
      { status: 500 }
    );
  }
}
