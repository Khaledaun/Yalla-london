/**
 * Google Drive Multi-Account Management API
 *
 * GET:  List connected accounts + folder mappings
 * POST: Actions — connect (start OAuth), disconnect, refresh_token, update_mapping,
 *        list_folders, sync_folder, set_site_mapping
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";
import {
  isDriveConfigured,
  getAuthUrl,
  refreshAccessToken,
  getAccountInfo,
  listDriveFolders,
  listDriveFiles,
  ensureFolderStructure,
  downloadDriveFile,
  DESIGN_FOLDER_STRUCTURE,
} from "@/lib/integrations/google-drive";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const siteId = request.nextUrl.searchParams.get("siteId") || undefined;

  const where: Record<string, unknown> = {};
  if (siteId) where.siteId = siteId;

  const accounts = await prisma.googleDriveAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      photoUrl: true,
      rootFolderId: true,
      siteId: true,
      label: true,
      folderMappings: true,
      lastSyncAt: true,
      syncEnabled: true,
      createdAt: true,
      tokenExpiresAt: true,
    },
  });

  // Check token freshness per account
  const accountsWithStatus = accounts.map((acc) => ({
    ...acc,
    tokenExpired: new Date(acc.tokenExpiresAt) < new Date(),
    folderMappings: acc.folderMappings || {},
  }));

  return NextResponse.json({
    configured: isDriveConfigured(),
    accounts: accountsWithStatus,
    folderStructure: DESIGN_FOLDER_STRUCTURE,
    envVars: {
      GOOGLE_DRIVE_CLIENT_ID: !!process.env.GOOGLE_DRIVE_CLIENT_ID,
      GOOGLE_DRIVE_CLIENT_SECRET: !!process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    },
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "connect": {
      if (!isDriveConfigured()) {
        return NextResponse.json({ success: false, error: "Google Drive not configured (missing env vars)" }, { status: 400 });
      }
      const state = JSON.stringify({
        siteId: body.siteId || getDefaultSiteId(),
        label: body.label || "",
        ts: Date.now(),
      });
      const authUrl = getAuthUrl(state);
      return NextResponse.json({ success: true, authUrl });
    }

    case "disconnect": {
      const { accountId } = body;
      if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });
      await prisma.googleDriveAccount.delete({ where: { id: accountId } });
      return NextResponse.json({ success: true });
    }

    case "refresh_token": {
      const { accountId } = body;
      if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

      const account = await prisma.googleDriveAccount.findUnique({ where: { id: accountId } });
      if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

      try {
        const tokens = await refreshAccessToken(account.refreshToken);
        await prisma.googleDriveAccount.update({
          where: { id: accountId },
          data: {
            accessToken: tokens.access_token,
            tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });
        return NextResponse.json({ success: true });
      } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Token refresh failed" }, { status: 500 });
      }
    }

    case "list_folders": {
      const { accountId, parentId } = body;
      if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

      const account = await prisma.googleDriveAccount.findUnique({ where: { id: accountId } });
      if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

      const accessToken = await getValidAccessToken(prisma, account);
      const folders = await listDriveFolders(accessToken, parentId || account.rootFolderId || "root");
      return NextResponse.json({ success: true, folders });
    }

    case "list_files": {
      const { accountId, folderId } = body;
      if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

      const account = await prisma.googleDriveAccount.findUnique({ where: { id: accountId } });
      if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

      const accessToken = await getValidAccessToken(prisma, account);
      const files = await listDriveFiles(accessToken, folderId || "root", 50);
      return NextResponse.json({ success: true, files });
    }

    case "set_site_mapping": {
      // Map a site → Drive account + folder
      const { accountId, siteId, driveFolderId, driveFolderName } = body;
      if (!accountId || !siteId) {
        return NextResponse.json({ success: false, error: "Missing accountId or siteId" }, { status: 400 });
      }

      const account = await prisma.googleDriveAccount.findUnique({ where: { id: accountId } });
      if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

      const mappings = (account.folderMappings || {}) as Record<string, unknown>;
      mappings[siteId] = {
        folderId: driveFolderId || account.rootFolderId || "root",
        folderName: driveFolderName || "Root",
        updatedAt: new Date().toISOString(),
      };

      await prisma.googleDriveAccount.update({
        where: { id: accountId },
        data: {
          siteId,
          folderMappings: mappings,
        },
      });

      return NextResponse.json({ success: true, mappings });
    }

    case "setup_structure": {
      // Create the design folder structure in a Drive account for a site
      const { accountId, siteId } = body;
      if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

      const account = await prisma.googleDriveAccount.findUnique({ where: { id: accountId } });
      if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

      const accessToken = await getValidAccessToken(prisma, account);
      const effectiveSiteId = siteId || account.siteId || getDefaultSiteId();
      const mappings = (account.folderMappings || {}) as Record<string, Record<string, string>>;
      const rootFolderId = mappings[effectiveSiteId]?.folderId || account.rootFolderId || "root";

      // Create site root folder
      const siteFolderId = await ensureFolderStructure(accessToken, rootFolderId, [effectiveSiteId]);

      // Create platform folders
      let created = 0;
      for (const platform of DESIGN_FOLDER_STRUCTURE.platforms) {
        await ensureFolderStructure(accessToken, siteFolderId, [platform]);
        created++;
      }

      return NextResponse.json({ success: true, created, siteFolderId });
    }

    case "sync_folder": {
      // Import files from a Drive folder into MediaAsset
      const { accountId, driveFolderId, targetFolder, siteId } = body;
      if (!accountId || !driveFolderId) {
        return NextResponse.json({ success: false, error: "Missing accountId or driveFolderId" }, { status: 400 });
      }

      const account = await prisma.googleDriveAccount.findUnique({ where: { id: accountId } });
      if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

      const accessToken = await getValidAccessToken(prisma, account);
      const files = await listDriveFiles(accessToken, driveFolderId);
      const effectiveSiteId = siteId || account.siteId || getDefaultSiteId();

      let imported = 0;
      let skipped = 0;
      for (const file of files) {
        if (file.mimeType.startsWith("application/vnd.google-apps.")) {
          skipped++;
          continue;
        }

        // Check if already imported (by Drive file ID in tags)
        const existing = await prisma.mediaAsset.findFirst({
          where: { tags: { has: `drive:${file.id}` } },
        });
        if (existing) { skipped++; continue; }

        // Download and create media asset
        try {
          const { buffer, name, mimeType } = await downloadDriveFile(accessToken, file.id);
          const fileSize = buffer.byteLength;

          await prisma.mediaAsset.create({
            data: {
              filename: name,
              url: file.webViewLink || file.webContentLink || "",
              mime_type: mimeType,
              file_size: fileSize,
              folder: targetFolder || effectiveSiteId,
              category: mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : "document",
              tags: [`drive:${file.id}`, `site:${effectiveSiteId}`, `source:google-drive`, `account:${account.email}`],
              alt_text: name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
              site_id: effectiveSiteId,
            },
          });
          imported++;
        } catch (err) {
          console.warn(`[google-drive] Failed to import ${file.name}:`, err instanceof Error ? err.message : err);
          skipped++;
        }
      }

      // Update last sync time
      await prisma.googleDriveAccount.update({
        where: { id: accountId },
        data: { lastSyncAt: new Date() },
      });

      return NextResponse.json({ success: true, imported, skipped, total: files.length });
    }

    default:
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// Helper: get a valid access token, refreshing if expired
async function getValidAccessToken(
  prisma: any,
  account: { id: string; accessToken: string; refreshToken: string; tokenExpiresAt: Date },
): Promise<string> {
  if (new Date(account.tokenExpiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
    return account.accessToken;
  }
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
