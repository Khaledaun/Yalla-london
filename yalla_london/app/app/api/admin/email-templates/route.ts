/**
 * Email Templates CRUD API
 *
 * GET    — List email templates with filters, search, and pagination
 * POST   — Create a new email template
 * PATCH  — Update an existing email template by id (from body)
 * DELETE — Delete an email template by id (from query param)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";
import { getSiteConfig } from "@/config/sites";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const site =
      request.headers.get("x-site-id") || searchParams.get("site");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20"))
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (site) where.site = site;
    if (type) where.type = type;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.emailTemplate.count({ where }),
    ]);

    const mappedTemplates = templates.map((template) => ({
      ...template,
      siteId: template.site,
      siteName: getSiteConfig(template.site)?.name || template.site,
    }));

    return NextResponse.json({
      templates: mappedTemplates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[email-templates-api] Failed to list templates:", error);
    return NextResponse.json(
      { error: "Failed to list email templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, site, type, subject, htmlContent, jsonContent, description, isDefault } = body;

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
    if (!type || typeof type !== "string" || !type.trim()) {
      return NextResponse.json(
        { error: "type is required (notification, campaign, welcome, transactional, newsletter)" },
        { status: 400 }
      );
    }
    if (!htmlContent || typeof htmlContent !== "string") {
      return NextResponse.json(
        { error: "htmlContent is required" },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        site: site.trim(),
        type: type.trim(),
        subject: subject || null,
        htmlContent,
        jsonContent: jsonContent || null,
        isDefault: isDefault === true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("[email-templates-api] Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create email template" },
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

    const allowedFields = [
      "name",
      "description",
      "site",
      "type",
      "subject",
      "htmlContent",
      "jsonContent",
      "thumbnail",
      "isDefault",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ template });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 404 }
      );
    }
    console.error("[email-templates-api] Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update email template" },
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
        { error: "Email template ID is required" },
        { status: 400 }
      );
    }

    await prisma.emailTemplate.delete({
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
        { error: "Email template not found" },
        { status: 404 }
      );
    }
    console.error("[email-templates-api] Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete email template" },
      { status: 500 }
    );
  }
}
