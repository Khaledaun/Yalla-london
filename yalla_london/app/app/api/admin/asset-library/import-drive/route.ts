import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 300;

async function getValidAccessToken(
  prisma: any,
  account: { id: string; accessToken: string; refreshToken: string; tokenExpiresAt: Date },
): Promise<string> {
  if (new Date(account.tokenExpiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
    return account.accessToken;
  }
  const { refreshAccessToken } = await import("@/lib/integrations/google-drive");
  const tokens = await refreshAccessToken(account.refreshToken);
  await prisma.googleDriveAccount.update({
    where: { id: account.id },
    data: {
      accessToken: tokens.access_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { listDriveFiles, downloadDriveFile } = await import("@/lib/integrations/google-drive");
  const body = await request.json();
  const { accountId, folderId, siteId, targetFolder } = body;

  if (!accountId || !folderId) {
    return NextResponse.json(
      { success: false, error: "accountId and folderId are required" },
      { status: 400 },
    );
  }

  const account = await prisma.googleDriveAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) {
    return NextResponse.json(
      { success: false, error: "Drive account not found" },
      { status: 404 },
    );
  }

  const effectiveSiteId = siteId || account.siteId || getDefaultSiteId();

  try {
    const accessToken = await getValidAccessToken(prisma, account);
    const files = await listDriveFiles(accessToken, folderId);

    let imported = 0;
    let skipped = 0;
    const errors: { file: string; error: string }[] = [];

    for (const file of files) {
      // Skip Google Docs/Sheets/Slides native formats
      if (file.mimeType.startsWith("application/vnd.google-apps.")) {
        skipped++;
        continue;
      }

      // Dedup by drive:{fileId} tag
      const existing = await prisma.mediaAsset.findFirst({
        where: { tags: { has: `drive:${file.id}` } },
      });
      if (existing) {
        skipped++;
        continue;
      }

      try {
        const { buffer, name, mimeType } = await downloadDriveFile(accessToken, file.id);
        const fileSize = buffer.byteLength;

        let category = "document";
        if (mimeType.startsWith("image/")) category = "image";
        else if (mimeType.startsWith("video/")) category = "video";
        else if (mimeType.startsWith("audio/")) category = "audio";

        await prisma.mediaAsset.create({
          data: {
            filename: name,
            url: file.webViewLink || file.webContentLink || "",
            mime_type: mimeType,
            file_size: fileSize,
            folder: targetFolder || effectiveSiteId,
            category,
            tags: [
              `drive:${file.id}`,
              `site:${effectiveSiteId}`,
              `source:google-drive`,
              `account:${account.email}`,
            ],
            alt_text: name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
            site_id: effectiveSiteId,
          },
        });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[import-drive] Failed to import ${file.name}:`, msg);
        errors.push({ file: file.name, error: msg });
      }
    }

    // Update last sync time
    await prisma.googleDriveAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors,
      total: files.length,
    });
  } catch (err) {
    console.warn("[import-drive] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Failed to import from Drive" },
      { status: 500 },
    );
  }
}
