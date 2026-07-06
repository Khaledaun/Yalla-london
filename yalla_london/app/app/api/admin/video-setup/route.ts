/**
 * Video Setup API — handles Remotion project setup tasks from the dashboard.
 *
 * POST /api/admin/video-setup
 *   { action: "copy-brand-assets" }   — copies stamp + watermark PNGs into yalla-video/public/
 *   { action: "install-deps" }        — runs npm install in yalla-video/
 *   { action: "setup-all" }           — does both in sequence
 *   { action: "status" }              — checks current setup state
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { existsSync, copyFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // npm install can take time

// Paths relative to repo root
const REPO_ROOT = process.cwd().replace(/\/yalla_london\/app$/, "");
const VIDEO_DIR = path.join(REPO_ROOT, "yalla-video");
const VIDEO_PUBLIC = path.join(VIDEO_DIR, "public");

const BRAND_ASSETS = [
  {
    name: "yalla-stamp-500.png",
    src: path.join(
      REPO_ROOT,
      "yalla_london/app/public/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-500px.png"
    ),
    dest: path.join(VIDEO_PUBLIC, "yalla-stamp-500.png"),
  },
  {
    name: "yalla-watermark-500.png",
    src: path.join(
      REPO_ROOT,
      "yalla_london/app/public/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png"
    ),
    dest: path.join(VIDEO_PUBLIC, "yalla-watermark-500.png"),
  },
];

function getStatus() {
  const videoProjectExists = existsSync(path.join(VIDEO_DIR, "package.json"));
  const nodeModulesExists = existsSync(path.join(VIDEO_DIR, "node_modules", "remotion"));
  const assetsStatus = BRAND_ASSETS.map((a) => ({
    name: a.name,
    sourceExists: existsSync(a.src),
    destExists: existsSync(a.dest),
  }));
  const allAssetsReady = assetsStatus.every((a) => a.destExists);

  return {
    videoProjectExists,
    nodeModulesExists,
    assetsStatus,
    allAssetsReady,
    ready: videoProjectExists && nodeModulesExists && allAssetsReady,
  };
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "status") {
      return NextResponse.json({ success: true, ...getStatus() });
    }

    if (action === "copy-brand-assets") {
      mkdirSync(VIDEO_PUBLIC, { recursive: true });
      mkdirSync(path.join(VIDEO_PUBLIC, "footage"), { recursive: true });

      const results: Array<{ name: string; status: string }> = [];
      for (const asset of BRAND_ASSETS) {
        if (!existsSync(asset.src)) {
          results.push({ name: asset.name, status: "source_missing" });
          continue;
        }
        if (existsSync(asset.dest)) {
          results.push({ name: asset.name, status: "already_exists" });
          continue;
        }
        copyFileSync(asset.src, asset.dest);
        results.push({ name: asset.name, status: "copied" });
      }

      return NextResponse.json({
        success: true,
        action: "copy-brand-assets",
        results,
        copied: results.filter((r) => r.status === "copied").length,
        skipped: results.filter((r) => r.status === "already_exists").length,
      });
    }

    if (action === "install-deps") {
      if (!existsSync(path.join(VIDEO_DIR, "package.json"))) {
        return NextResponse.json(
          { error: "yalla-video/package.json not found. Project not scaffolded." },
          { status: 400 }
        );
      }

      const output = execSync("npm install", {
        cwd: VIDEO_DIR,
        timeout: 90_000,
        encoding: "utf-8",
      });

      const remotionInstalled = existsSync(
        path.join(VIDEO_DIR, "node_modules", "remotion")
      );

      return NextResponse.json({
        success: remotionInstalled,
        action: "install-deps",
        remotionInstalled,
        output: output.split("\n").slice(-5).join("\n"),
      });
    }

    if (action === "setup-all") {
      const results: Array<{ step: string; success: boolean; detail: string }> = [];

      // Step 1: Copy assets
      mkdirSync(VIDEO_PUBLIC, { recursive: true });
      mkdirSync(path.join(VIDEO_PUBLIC, "footage"), { recursive: true });
      let assetsCopied = 0;
      for (const asset of BRAND_ASSETS) {
        if (existsSync(asset.src) && !existsSync(asset.dest)) {
          copyFileSync(asset.src, asset.dest);
          assetsCopied++;
        }
      }
      const allAssetsReady = BRAND_ASSETS.every((a) => existsSync(a.dest));
      results.push({
        step: "copy-brand-assets",
        success: allAssetsReady,
        detail: `${assetsCopied} copied, ${BRAND_ASSETS.length - assetsCopied} already existed`,
      });

      // Step 2: npm install
      if (existsSync(path.join(VIDEO_DIR, "package.json"))) {
        try {
          execSync("npm install", { cwd: VIDEO_DIR, timeout: 90_000 });
          const remotionOk = existsSync(path.join(VIDEO_DIR, "node_modules", "remotion"));
          results.push({
            step: "install-deps",
            success: remotionOk,
            detail: remotionOk ? "Remotion 4.x installed" : "Install completed but remotion not found",
          });
        } catch (err) {
          results.push({
            step: "install-deps",
            success: false,
            detail: err instanceof Error ? err.message : "npm install failed",
          });
        }
      } else {
        results.push({
          step: "install-deps",
          success: false,
          detail: "package.json not found",
        });
      }

      const allSuccess = results.every((r) => r.success);
      return NextResponse.json({ success: allSuccess, action: "setup-all", results });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: status, copy-brand-assets, install-deps, setup-all` },
      { status: 400 }
    );
  } catch (err) {
    console.error("[video-setup] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Video setup failed" },
      { status: 500 }
    );
  }
}
