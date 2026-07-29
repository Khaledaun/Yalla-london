/**
 * HTML-to-PDF Converter
 *
 * Wraps Puppeteer to convert HTML strings into PDF buffers.
 * Uses @sparticuz/chromium on Vercel serverless (no bundled Chromium).
 * Falls back to local Puppeteer in development.
 *
 * Includes retry logic, timeout guards, and proper resource cleanup.
 */

import puppeteer, { type Browser } from "puppeteer";

const PDF_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;
const MAX_RETRIES = 1;

export interface PdfOptions {
  format?: "A4" | "Letter" | "Legal";
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
}

const DEFAULT_MARGIN = {
  top: "20mm",
  right: "15mm",
  bottom: "20mm",
  left: "15mm",
};

/**
 * Detect if running in Vercel serverless (no local Chromium available).
 * Uses @sparticuz/chromium for serverless environments.
 */
async function getChromiumConfig(): Promise<{
  executablePath?: string;
  args: string[];
}> {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    try {
      // Dynamic import to avoid bundling issues in local dev
      const chromium = await import("@sparticuz/chromium");
      const executablePath = await chromium.default.executablePath();
      return {
        executablePath,
        args: chromium.default.args,
      };
    } catch (err) {
      console.warn(
        "[html-to-pdf] @sparticuz/chromium not available, falling back to local Puppeteer:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Local development: use Puppeteer's bundled Chromium
  return {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  };
}

/**
 * Launch a Puppeteer browser with retry logic.
 * If the first launch fails, waits 1s and retries once.
 */
async function launchBrowserWithRetry(): Promise<Browser> {
  const chromiumConfig = await getChromiumConfig();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromiumConfig.executablePath,
        args: chromiumConfig.args,
      });
      return browser;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[html-to-pdf] Browser launch attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`,
          error instanceof Error ? error.message : error,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        throw new Error(
          `[html-to-pdf] Browser launch failed after ${MAX_RETRIES + 1} attempts: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new Error("[html-to-pdf] Browser launch failed unexpectedly");
}

/**
 * Convert an HTML string into a PDF buffer using Puppeteer.
 *
 * @param html - The full HTML document string to render
 * @param options - PDF generation options (format, orientation, margins, background)
 * @returns A Buffer containing the generated PDF
 *
 * @throws Error if browser launch fails after retries
 * @throws Error if PDF generation exceeds 30s timeout
 */
export async function generatePdfFromHtml(
  html: string,
  options?: PdfOptions,
): Promise<Buffer> {
  if (!html || typeof html !== "string") {
    throw new Error("[html-to-pdf] HTML content is required and must be a non-empty string");
  }

  let browser: Browser | null = null;

  // Timeout controller: abort the entire operation after PDF_TIMEOUT_MS
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, PDF_TIMEOUT_MS);

  try {
    // Check if already timed out before starting
    if (timeoutController.signal.aborted) {
      throw new Error(`[html-to-pdf] Operation timed out (${PDF_TIMEOUT_MS}ms)`);
    }

    browser = await launchBrowserWithRetry();

    // Check timeout after browser launch (launch can be slow)
    if (timeoutController.signal.aborted) {
      throw new Error(`[html-to-pdf] Operation timed out during browser launch (${PDF_TIMEOUT_MS}ms)`);
    }

    const page = await browser.newPage();

    // Set content and wait for all network requests to settle
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Emulate print media for accurate print-style rendering
    await page.emulateMediaType("print");

    // Check timeout before the PDF generation step
    if (timeoutController.signal.aborted) {
      throw new Error(`[html-to-pdf] Operation timed out before PDF generation (${PDF_TIMEOUT_MS}ms)`);
    }

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: options?.format || "A4",
      landscape: options?.landscape || false,
      margin: {
        top: options?.margin?.top ?? DEFAULT_MARGIN.top,
        right: options?.margin?.right ?? DEFAULT_MARGIN.right,
        bottom: options?.margin?.bottom ?? DEFAULT_MARGIN.bottom,
        left: options?.margin?.left ?? DEFAULT_MARGIN.left,
      },
      printBackground: options?.printBackground ?? true,
    });

    // page.pdf() returns Uint8Array in Puppeteer v24 — ensure we return a Node Buffer
    return Buffer.from(pdfBuffer);
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new Error(`[html-to-pdf] Operation timed out after ${PDF_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn(
          "[html-to-pdf] Failed to close browser cleanly:",
          closeError instanceof Error ? closeError.message : closeError,
        );
      }
    }
  }
}

/**
 * Generate a PDF from HTML and return the buffer with size metadata.
 * S3 upload is handled by the caller.
 *
 * @param html - The full HTML document string to render
 * @param filename - The intended filename (used for logging; not written to disk)
 * @param options - PDF generation options passed through to generatePdfFromHtml
 * @returns Object containing the PDF buffer and its byte size
 */
export async function generatePdfAndUpload(
  html: string,
  filename: string,
  options?: Parameters<typeof generatePdfFromHtml>[1],
): Promise<{ buffer: Buffer; size: number }> {
  if (!filename || typeof filename !== "string") {
    throw new Error("[html-to-pdf] Filename is required and must be a non-empty string");
  }

  const buffer = await generatePdfFromHtml(html, options);

  console.debug(
    `[html-to-pdf] Generated PDF "${filename}" — ${buffer.length} bytes`,
  );

  return {
    buffer,
    size: buffer.length,
  };
}
