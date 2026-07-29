/**
 * Google Drive Integration — Multi-Account Support
 *
 * Connect multiple Google Drive accounts, sync folders bidirectionally,
 * and organize design assets per site/platform/occasion.
 *
 * Env vars:
 *   GOOGLE_DRIVE_CLIENT_ID     — OAuth2 client ID (required)
 *   GOOGLE_DRIVE_CLIENT_SECRET — OAuth2 client secret (required)
 *   GOOGLE_DRIVE_REDIRECT_URI  — OAuth2 redirect (default: /api/admin/google-drive/callback)
 */

import { getSiteDomain } from "@/config/sites";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
  children?: DriveFolder[];
}

export interface DriveSyncResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface DriveAccountInfo {
  email: string;
  displayName: string;
  photoUrl?: string;
  storageUsed?: number;
  storageTotal?: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );
}

function getRedirectUri(): string {
  if (process.env.GOOGLE_DRIVE_REDIRECT_URI) {
    return process.env.GOOGLE_DRIVE_REDIRECT_URI;
  }
  const domain = getSiteDomain("yalla-london");
  return `${domain}/api/admin/google-drive/callback`;
}

// ---------------------------------------------------------------------------
// OAuth2 Helpers
// ---------------------------------------------------------------------------

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

/**
 * Generate the OAuth2 authorization URL for connecting a Google account.
 */
export function getAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    ...(state ? { state } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || "",
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json();
}

/**
 * Get info about the authenticated Google account.
 */
export async function getAccountInfo(accessToken: string): Promise<DriveAccountInfo> {
  const [userRes, storageRes] = await Promise.all([
    fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota,user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  const userInfo = userRes.ok ? await userRes.json() : {};
  const about = storageRes.ok ? await storageRes.json() : {};

  return {
    email: userInfo.email || about?.user?.emailAddress || "",
    displayName: userInfo.name || about?.user?.displayName || "",
    photoUrl: userInfo.picture || about?.user?.photoLink,
    storageUsed: about?.storageQuota?.usage ? parseInt(about.storageQuota.usage) : undefined,
    storageTotal: about?.storageQuota?.limit ? parseInt(about.storageQuota.limit) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Drive API Operations
// ---------------------------------------------------------------------------

/**
 * List files in a Drive folder.
 */
export async function listDriveFiles(
  accessToken: string,
  folderId: string = "root",
  pageSize: number = 50,
): Promise<DriveFile[]> {
  const query = folderId === "root"
    ? "'root' in parents and trashed = false"
    : `'${folderId}' in parents and trashed = false`;

  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,modifiedTime,parents)",
    pageSize: String(pageSize),
    orderBy: "modifiedTime desc",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new Error(`Drive list failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFile[];
}

/**
 * List only folders in a Drive folder.
 */
export async function listDriveFolders(
  accessToken: string,
  parentId: string = "root",
): Promise<DriveFolder[]> {
  const query = parentId === "root"
    ? "mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false"
    : `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;

  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name)",
    pageSize: "100",
    orderBy: "name",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new Error(`Drive folder list failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: { id: string; name: string }) => ({
    id: f.id,
    name: f.name,
    path: f.name,
  }));
}

/**
 * Create a folder in Google Drive.
 */
export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId: string = "root",
): Promise<DriveFolder> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!res.ok) {
    throw new Error(`Create folder failed: ${res.status}`);
  }

  const data = await res.json();
  return { id: data.id, name: data.name, path: name };
}

/**
 * Download a file from Drive and return the buffer + metadata.
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<{ buffer: ArrayBuffer; name: string; mimeType: string }> {
  // Get metadata first
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) throw new Error(`File metadata failed: ${metaRes.status}`);
  const meta = await metaRes.json();

  // Download content
  const dlRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!dlRes.ok) throw new Error(`File download failed: ${dlRes.status}`);

  const buffer = await dlRes.arrayBuffer();
  return { buffer, name: meta.name, mimeType: meta.mimeType };
}

/**
 * Upload a file to Google Drive.
 */
export async function uploadToDrive(
  accessToken: string,
  name: string,
  mimeType: string,
  content: ArrayBuffer | Buffer,
  folderId: string = "root",
): Promise<DriveFile> {
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
  });

  const boundary = "-----DriveUploadBoundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const bodyParts = [
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    metadata,
    delimiter,
    `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`,
    Buffer.from(content).toString("base64"),
    closeDelimiter,
  ];

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyParts.join(""),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed: ${res.status} — ${err}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Folder Structure Helpers
// ---------------------------------------------------------------------------

/**
 * Predefined folder structure for design assets.
 * Creates: /{siteName}/{platform}/{designType}/{occasion}
 */
export const DESIGN_FOLDER_STRUCTURE = {
  platforms: ["instagram", "facebook", "twitter", "tiktok", "pinterest", "whatsapp", "blog", "email"] as const,
  designTypes: ["post", "story", "reel", "cover", "banner", "ad", "thumbnail", "template"] as const,
  occasions: [
    "ramadan", "eid-al-fitr", "eid-al-adha", "christmas", "new-year",
    "valentines", "summer", "winter", "spring", "autumn",
    "black-friday", "mothers-day", "national-day", "evergreen",
  ] as const,
};

/**
 * Build the full folder path for a design asset.
 */
export function buildDesignFolderPath(
  siteId: string,
  platform: string,
  designType: string,
  occasion?: string,
): string {
  const parts = [siteId, platform, designType];
  if (occasion) parts.push(occasion);
  return parts.join("/");
}

/**
 * Ensure the folder structure exists in Google Drive.
 * Returns the leaf folder ID.
 */
export async function ensureFolderStructure(
  accessToken: string,
  rootFolderId: string,
  pathParts: string[],
): Promise<string> {
  let currentParent = rootFolderId;

  for (const part of pathParts) {
    // Check if folder exists
    const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${part}' and '${currentParent}' in parents and trashed = false`;
    const params = new URLSearchParams({
      q: query,
      fields: "files(id,name)",
      pageSize: "1",
    });

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) throw new Error(`Folder check failed: ${res.status}`);
    const data = await res.json();

    if (data.files && data.files.length > 0) {
      currentParent = data.files[0].id;
    } else {
      const created = await createDriveFolder(accessToken, part, currentParent);
      currentParent = created.id;
    }
  }

  return currentParent;
}
