/**
 * Server-Side Video Render Engine
 *
 * Renders Remotion compositions to MP4 files. Updates VideoProject
 * records in the database through the rendering lifecycle:
 *   draft → rendering → rendered | failed
 *
 * Includes:
 *   - In-memory semaphore (MAX_CONCURRENT_RENDERS = 2)
 *   - 5-minute timeout per render
 *   - Graceful fallback when @remotion/renderer is not installed
 */

import { prisma } from "@/lib/db";

// ─── Constants ──────────────────────────────────────────────────

const MAX_CONCURRENT_RENDERS = 2;
const RENDER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ─── In-Memory Semaphore ────────────────────────────────────────

let activeRenders = 0;
const renderQueue: Array<{
  resolve: () => void;
  reject: (err: Error) => void;
}> = [];

function acquireSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    renderQueue.push({ resolve, reject });
  });
}

function releaseSlot(): void {
  activeRenders = Math.max(0, activeRenders - 1);
  const next = renderQueue.shift();
  if (next) {
    activeRenders++;
    next.resolve();
  }
}

// ─── Remotion Availability Check ────────────────────────────────

interface RemotionModules {
  bundle: (options: {
    entryPoint: string;
    webpackOverride?: (config: unknown) => unknown;
  }) => Promise<string>;
  renderMedia: (options: {
    composition: unknown;
    serveUrl: string;
    codec: string;
    outputLocation: string;
    inputProps?: Record<string, unknown>;
  }) => Promise<void>;
  selectComposition: (options: {
    serveUrl: string;
    id: string;
    inputProps?: Record<string, unknown>;
  }) => Promise<unknown>;
}

async function loadRemotionModules(): Promise<RemotionModules | null> {
  try {
    const bundler = await import("@remotion/bundler");
    const renderer = await import("@remotion/renderer");
    return {
      bundle: bundler.bundle,
      renderMedia: renderer.renderMedia as unknown as RemotionModules["renderMedia"],
      selectComposition: renderer.selectComposition as unknown as RemotionModules["selectComposition"],
    };
  } catch (err) {
    console.warn("[render-engine] Remotion modules not available:", err);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────

export interface RenderResult {
  url: string;
  size: number;
}

export interface RenderStatus {
  status: "draft" | "queued" | "rendering" | "rendered" | "failed";
  progress?: number;
  url?: string;
  error?: string;
}

/**
 * Render a VideoProject's composition to MP4.
 *
 * Flow:
 * 1. Load VideoProject from DB
 * 2. Validate it has compositionCode
 * 3. Acquire a render slot (semaphore)
 * 4. Set status to "rendering"
 * 5. Write composition to temp file, bundle with Remotion, render to MP4
 * 6. Update DB with result (rendered + URL, or failed + error)
 * 7. Release render slot
 */
export async function renderVideoToMp4(
  videoProjectId: string,
): Promise<RenderResult> {
  // 1. Load project
  const project = await prisma.videoProject.findUnique({
    where: { id: videoProjectId },
  });

  if (!project) {
    throw new Error(`VideoProject "${videoProjectId}" not found`);
  }

  if (!project.compositionCode) {
    throw new Error(`VideoProject "${videoProjectId}" has no compositionCode — generate a composition first`);
  }

  // 2. Check Remotion availability
  const remotion = await loadRemotionModules();
  if (!remotion) {
    // Mark as failed with a helpful message
    await prisma.videoProject.update({
      where: { id: videoProjectId },
      data: {
        status: "failed",
        updatedAt: new Date(),
      },
    });
    throw new Error(
      "Server-side rendering is not available: @remotion/bundler and @remotion/renderer packages are not installed. " +
      "To enable rendering, run: npm install @remotion/bundler @remotion/renderer @remotion/cli remotion --legacy-peer-deps"
    );
  }

  // 3. Acquire render slot
  await prisma.videoProject.update({
    where: { id: videoProjectId },
    data: { status: "queued", updatedAt: new Date() },
  });

  await acquireSlot();

  // 4. Set rendering status
  await prisma.videoProject.update({
    where: { id: videoProjectId },
    data: { status: "rendering", updatedAt: new Date() },
  });

  try {
    const result = await renderWithTimeout(
      remotion,
      project.compositionCode,
      videoProjectId,
      project.width,
      project.height,
      project.fps,
      project.duration,
    );

    // 5. Success — update DB
    await prisma.videoProject.update({
      where: { id: videoProjectId },
      data: {
        status: "rendered",
        exportedUrl: result.url,
        updatedAt: new Date(),
      },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[render-engine] Render failed for ${videoProjectId}:`, message);

    // 6. Failure — update DB
    await prisma.videoProject.update({
      where: { id: videoProjectId },
      data: {
        status: "failed",
        updatedAt: new Date(),
      },
    });

    throw new Error(`Render failed: ${message}`);
  } finally {
    releaseSlot();
  }
}

/**
 * Check the current render status of a VideoProject.
 */
export async function getRenderStatus(
  videoProjectId: string,
): Promise<RenderStatus> {
  const project = await prisma.videoProject.findUnique({
    where: { id: videoProjectId },
    select: {
      status: true,
      exportedUrl: true,
    },
  });

  if (!project) {
    throw new Error(`VideoProject "${videoProjectId}" not found`);
  }

  const status = project.status as RenderStatus["status"];

  return {
    status,
    progress: status === "rendering" ? undefined : status === "rendered" ? 100 : undefined,
    url: project.exportedUrl ?? undefined,
  };
}

// ─── Internal: Render With Timeout ──────────────────────────────

async function renderWithTimeout(
  remotion: RemotionModules,
  compositionCode: string,
  projectId: string,
  width: number,
  height: number,
  fps: number,
  durationSeconds: number,
): Promise<RenderResult> {
  return new Promise<RenderResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Render timed out after ${RENDER_TIMEOUT_MS / 1000}s`));
    }, RENDER_TIMEOUT_MS);

    performRender(remotion, compositionCode, projectId, width, height, fps, durationSeconds)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Internal: Actual Render Logic ──────────────────────────────

async function performRender(
  remotion: RemotionModules,
  compositionCode: string,
  projectId: string,
  _width: number,
  _height: number,
  _fps: number,
  _durationSeconds: number,
): Promise<RenderResult> {
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");

  // Create temp directory for this render
  const tmpDir = path.join(os.tmpdir(), `yalla-render-${projectId}`);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const entryFile = path.join(tmpDir, "index.tsx");
  const outputFile = path.join(tmpDir, "output.mp4");

  try {
    // Write the composition code to a temp entry file
    // Wrap it in a Remotion-compatible entry point
    const entryCode = `
import { registerRoot } from 'remotion';
${compositionCode}

const RemotionRoot: React.FC = () => {
  return null;
};

registerRoot(RemotionRoot);
`;
    fs.writeFileSync(entryFile, entryCode, "utf-8");

    // Bundle the composition
    const serveUrl = await remotion.bundle({
      entryPoint: entryFile,
    });

    // Select the composition
    const composition = await remotion.selectComposition({
      serveUrl,
      id: "Composition",
    });

    // Render to MP4
    await remotion.renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputFile,
    });

    // Read file size
    const stats = fs.statSync(outputFile);

    // In production, the rendered file would be uploaded to S3/Cloudflare R2.
    // For now, return the local temp path as the URL.
    const url = outputFile;

    return {
      url,
      size: stats.size,
    };
  } finally {
    // Clean up temp entry file (keep output for retrieval)
    try {
      if (fs.existsSync(entryFile)) {
        fs.unlinkSync(entryFile);
      }
    } catch {
      console.warn(`[render-engine] Failed to clean up temp file: ${entryFile}`);
    }
  }
}
