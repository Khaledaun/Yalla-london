/**
 * Email Sender
 *
 * Multi-provider email sending wrapper. Auto-detects which provider is
 * configured by checking environment variables in this priority order:
 *   1. RESEND_API_KEY  -> Resend REST API
 *   2. SENDGRID_API_KEY -> SendGrid REST API
 *   3. SMTP_HOST       -> SMTP via nodemailer
 *   4. (none)          -> Console logging fallback (development only)
 *
 * Builds on the provider pattern established in lib/email-notifications.ts
 * but adds: return values with messageId, replyTo support, multi-recipient
 * support, auto-detection (no EMAIL_PROVIDER env var required), and a
 * sendTestEmail helper.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  plainText?: string;
  from?: string;
  replyTo?: string;
  /** Optional merge-tag context — replaces {{first_name}}, {{email}}, etc. in html/plainText/subject */
  mergeTagContext?: import("./personalization").MergeTagContext;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type ProviderName = "resend" | "sendgrid" | "smtp" | "console";

// ---------------------------------------------------------------------------
// Provider Detection
// ---------------------------------------------------------------------------

/**
 * Detect which email provider is available based on environment variables.
 * Checks in order of preference: Resend, SendGrid, SMTP.
 * Falls back to console logging when nothing is configured.
 */
function detectProvider(): ProviderName {
  // Explicit override takes precedence
  const explicit = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim();
  if (explicit === "resend" || explicit === "sendgrid" || explicit === "smtp") {
    return explicit;
  }

  // Auto-detect by checking which env vars exist
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST) return "smtp";

  return "console";
}

/**
 * Build the default "from" address. Uses EMAIL_FROM env var if set,
 * otherwise constructs from site domain.
 */
function getDefaultFrom(siteId?: string): string {
  const emailFrom = (process.env.EMAIL_FROM || "").trim();
  if (emailFrom) return emailFrom;

  // If using Resend and no custom domain is verified yet, use their sandbox address.
  // This lets test emails work immediately after adding RESEND_API_KEY.
  // IMPORTANT: Resend sandbox only sends to the account owner's email address.
  // To send to any recipient, verify your domain at https://resend.com/domains
  // then set RESEND_DOMAIN_VERIFIED=true and EMAIL_FROM in Vercel env vars.
  if (process.env.RESEND_API_KEY && !process.env.RESEND_DOMAIN_VERIFIED) {
    return "Zenitha <onboarding@resend.dev>";
  }

  try {
    // Use site.domain directly (e.g. "yalla-london.com") — NOT getSiteDomain()
    // which returns a full URL like "https://www.yalla-london.com"
    const { getDefaultSiteId, SITES } = require("@/config/sites");
    const resolvedSiteId = siteId || getDefaultSiteId();
    const site = SITES[resolvedSiteId];
    const domain = site?.domain || "yalla-london.com";
    const brandName = site?.name || "Yalla London";
    return `${brandName} <hello@${domain}>`;
  } catch (err) {
    console.warn("[email:sender] Could not resolve default site domain for FROM address:", err instanceof Error ? err.message : err);
    return "Yalla London <hello@yalla-london.com>";
  }
}

/**
 * Build the default "reply-to" address for all outgoing emails.
 */
function getDefaultReplyTo(): string {
  const replyTo = (process.env.EMAIL_REPLY_TO || "").trim();
  if (replyTo) return replyTo;

  try {
    const { getDefaultSiteId, SITES } = require("@/config/sites");
    const resolvedSiteId = getDefaultSiteId();
    const site = SITES[resolvedSiteId];
    return `info@${site?.domain || "yalla-london.com"}`;
  } catch {
    return "info@yalla-london.com";
  }
}

// ---------------------------------------------------------------------------
// Main Send Function
// ---------------------------------------------------------------------------

/**
 * Send an email using the best available provider. Automatically detects
 * which provider is configured. Returns a result object rather than throwing,
 * making it safe to use in pipelines where a single email failure should not
 * crash the entire batch.
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  let { to, subject, html, plainText } = options;
  const from = options.from || getDefaultFrom();
  const replyTo = options.replyTo || getDefaultReplyTo();
  const recipients = Array.isArray(to) ? to : [to];

  // Apply merge-tag personalization if context provided
  if (options.mergeTagContext) {
    const { applyMergeTags } = await import("./personalization");
    html = applyMergeTags(html, options.mergeTagContext);
    subject = applyMergeTags(subject, options.mergeTagContext);
    if (plainText) {
      plainText = applyMergeTags(plainText, options.mergeTagContext);
    }
  }

  if (recipients.length === 0) {
    return { success: false, error: "No recipients specified" };
  }

  const provider = detectProvider();

  try {
    switch (provider) {
      case "resend":
        return await sendViaResend({ recipients, from, replyTo, subject, html, plainText });
      case "sendgrid":
        return await sendViaSendGrid({ recipients, from, replyTo, subject, html, plainText });
      case "smtp":
        return await sendViaSmtp({ recipients, from, replyTo, subject, html, plainText });
      case "console":
        return sendViaConsole({ recipients, from, subject, html, plainText });
      default:
        return { success: false, error: `Unknown email provider: ${provider}` };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email sending error";
    console.error(`[email-sender] ${provider} failed: ${message}`);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Provider: Resend
// ---------------------------------------------------------------------------

interface ProviderPayload {
  recipients: string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  plainText?: string;
}

async function sendViaResend(payload: ProviderPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  const body: Record<string, any> = {
    from: payload.from,
    to: payload.recipients,
    subject: payload.subject,
    html: payload.html,
  };

  if (payload.plainText) {
    body.text = payload.plainText;
  }
  if (payload.replyTo) {
    body.reply_to = payload.replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    // Detect Resend sandbox restriction (403 = domain not verified, can only send to owner)
    if (response.status === 403 && errorBody.includes("testing emails")) {
      return {
        success: false,
        error: `Resend sandbox mode: can only send to your own email. To send to any recipient, verify your domain at https://resend.com/domains and set RESEND_DOMAIN_VERIFIED=true in Vercel env vars.`,
      };
    }
    if (response.status === 422 && errorBody.includes("from")) {
      return {
        success: false,
        error: `Invalid "from" address. Set EMAIL_FROM env var to a valid format like "Brand Name <info@yourdomain.com>" in Vercel.`,
      };
    }
    return {
      success: false,
      error: `Resend API error ${response.status}: ${errorBody.slice(0, 300)}`,
    };
  }

  const data = await response.json().catch(() => ({}));
  return {
    success: true,
    messageId: data.id || undefined,
  };
}

// ---------------------------------------------------------------------------
// Provider: SendGrid
// ---------------------------------------------------------------------------

async function sendViaSendGrid(payload: ProviderPayload): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SENDGRID_API_KEY is not configured" };
  }

  // SendGrid expects "to" as an array of { email } objects
  const toList = payload.recipients.map((email) => ({ email }));

  const content: Array<{ type: string; value: string }> = [
    { type: "text/html", value: payload.html },
  ];
  if (payload.plainText) {
    // Plain text must come before HTML in the content array for SendGrid
    content.unshift({ type: "text/plain", value: payload.plainText });
  }

  // Extract name from "Name <email>" format if present
  const fromMatch = payload.from.match(/^(.+?)\s*<(.+)>$/);
  const fromObj = fromMatch
    ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() }
    : { email: payload.from };

  const body: Record<string, any> = {
    personalizations: [
      {
        to: toList,
        subject: payload.subject,
      },
    ],
    from: fromObj,
    content,
  };

  if (payload.replyTo) {
    const replyMatch = payload.replyTo.match(/^(.+?)\s*<(.+)>$/);
    body.reply_to = replyMatch
      ? { name: replyMatch[1].trim(), email: replyMatch[2].trim() }
      : { email: payload.replyTo };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // SendGrid returns 202 on success with no body
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    return {
      success: false,
      error: `SendGrid API error ${response.status}: ${errorBody.slice(0, 300)}`,
    };
  }

  // SendGrid returns messageId in the x-message-id header
  const messageId = response.headers.get("x-message-id") || undefined;
  return { success: true, messageId };
}

// ---------------------------------------------------------------------------
// Provider: SMTP (nodemailer)
// ---------------------------------------------------------------------------

async function sendViaSmtp(payload: ProviderPayload): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      success: false,
      error:
        "SMTP configuration incomplete: SMTP_HOST, SMTP_USER, and SMTP_PASS are all required",
    };
  }

  // Dynamic import so nodemailer is only loaded when SMTP is actually used.
  // This avoids bundling it in serverless functions that use Resend/SendGrid.
  let nodemailer: any;
  try {
    nodemailer = await import(/* webpackIgnore: true */ "nodemailer");
  } catch (err) {
    console.warn("[email:sender] Failed to import nodemailer:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error:
        "nodemailer package is not installed. Run: npm install nodemailer @types/nodemailer --legacy-peer-deps",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Connection timeout to prevent hanging in cron jobs
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const mailOptions: Record<string, any> = {
    from: payload.from,
    to: payload.recipients.join(", "),
    subject: payload.subject,
    html: payload.html,
  };

  if (payload.plainText) {
    mailOptions.text = payload.plainText;
  }
  if (payload.replyTo) {
    mailOptions.replyTo = payload.replyTo;
  }

  const info = await transporter.sendMail(mailOptions);

  return {
    success: true,
    messageId: info.messageId || undefined,
  };
}

// ---------------------------------------------------------------------------
// Provider: Console (Development Fallback)
// ---------------------------------------------------------------------------

function sendViaConsole(payload: ProviderPayload): SendEmailResult {
  const isDev =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (isDev) {
    console.log(
      `[email-sender] DEV MODE — email not sent.\n` +
        `  To:      ${payload.recipients.join(", ")}\n` +
        `  From:    ${payload.from}\n` +
        `  Subject: ${payload.subject}\n` +
        `  HTML:    ${payload.html.slice(0, 300)}...\n` +
        (payload.plainText
          ? `  Text:    ${payload.plainText.slice(0, 200)}...\n`
          : "")
    );
  } else {
    console.warn(
      `[email-sender] No email provider configured. Set one of: RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS. ` +
        `Email to ${payload.recipients.join(", ")} was not sent.`
    );
  }

  return {
    success: true,
    messageId: `console-${Date.now()}`,
  };
}

// ---------------------------------------------------------------------------
// Test Email Helper
// ---------------------------------------------------------------------------

/**
 * Send a test email to verify provider configuration. Uses the provided
 * HTML as the email body, or falls back to a simple test template.
 *
 * @param to - Recipient email address
 * @param templateHtml - Optional HTML to send (e.g., from renderEmailBlocks)
 */
export async function sendTestEmail(
  to: string,
  templateHtml?: string
): Promise<SendEmailResult> {
  const provider = detectProvider();
  const from = getDefaultFrom();

  const html =
    templateHtml ||
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Test Email</title></head>
<body style="margin:0;padding:40px;background-color:#f4f4f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr><td style="height:4px;background:#0C4A6E;"></td></tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;">Email Configuration Test</h1>
              <p style="margin:0 0 8px;font-size:16px;color:#4a4a68;line-height:1.6;">
                This is a test email sent via the <strong>${escapeHtml(provider)}</strong> provider.
              </p>
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5;">
                From: ${escapeHtml(from)}<br/>
                To: ${escapeHtml(to)}<br/>
                Sent at: ${new Date().toISOString()}
              </p>
              <p style="margin:16px 0 0;font-size:14px;color:#10b981;font-weight:600;">
                If you can read this, your email system is working correctly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const result = await sendEmail({
    to,
    subject: `[Test] Email Configuration Verification — ${new Date().toISOString()}`,
    html,
    plainText: `Email Configuration Test\n\nProvider: ${provider}\nFrom: ${from}\nTo: ${to}\nSent at: ${new Date().toISOString()}\n\nIf you can read this, your email system is working correctly.`,
  });

  if (result.success) {
    console.log(
      `[email-sender] Test email sent successfully via ${provider}. MessageId: ${result.messageId || "N/A"}`
    );
  } else {
    console.error(
      `[email-sender] Test email failed via ${provider}: ${result.error}`
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns the name of the currently detected email provider.
 * Useful for dashboard display and diagnostics.
 */
export function getActiveProvider(): ProviderName {
  return detectProvider();
}

/**
 * Returns diagnostic info about the email system configuration.
 * Used by the dashboard email-center and cockpit to show status.
 */
export function getEmailDiagnostics(): {
  provider: ProviderName;
  domainVerified: boolean;
  sandboxMode: boolean;
  fromAddress: string;
  configuredEnvVars: string[];
} {
  const provider = detectProvider();
  const domainVerified = Boolean(process.env.RESEND_DOMAIN_VERIFIED);
  const sandboxMode = provider === "resend" && !domainVerified;
  const fromAddress = getDefaultFrom();
  const configuredEnvVars: string[] = [];
  if (process.env.RESEND_API_KEY) configuredEnvVars.push("RESEND_API_KEY");
  if (process.env.SENDGRID_API_KEY) configuredEnvVars.push("SENDGRID_API_KEY");
  if (process.env.SMTP_HOST) configuredEnvVars.push("SMTP_HOST");
  if (process.env.EMAIL_FROM) configuredEnvVars.push("EMAIL_FROM");
  if (process.env.RESEND_DOMAIN_VERIFIED) configuredEnvVars.push("RESEND_DOMAIN_VERIFIED");
  return { provider, domainVerified, sandboxMode, fromAddress, configuredEnvVars };
}
