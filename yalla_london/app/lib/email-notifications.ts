/**
 * Subscriber Email Notification Handler
 *
 * Processes background jobs of type `subscriber_notification` created by the
 * publish route.  For each pending job it:
 *   1. Looks up subscriber emails from the Subscriber table
 *   2. Builds and sends an HTML notification email via the configured provider
 *   3. Marks the job as completed or failed
 *
 * Supported email providers (via EMAIL_PROVIDER env var):
 *   - resend   (RESEND_API_KEY)
 *   - sendgrid (SENDGRID_API_KEY)
 *   - smtp     (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 *
 * Falls back to console logging when no provider is configured.
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface NotificationEmailData {
  contentTitle: string;
  contentUrl: string;
  siteName: string;
  unsubscribeUrl: string;
}

export interface ProcessingSummary {
  processed: number;
  sent: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// processSubscriberNotifications
// ---------------------------------------------------------------------------

/**
 * Query all pending `subscriber_notification` background jobs, send emails to
 * the referenced subscribers, and update each job's status accordingly.
 */
export async function processSubscriberNotifications(): Promise<ProcessingSummary> {
  const summary: ProcessingSummary = { processed: 0, sent: 0, failed: 0 };

  // Fetch pending notification jobs
  const pendingJobs = await prisma.backgroundJob.findMany({
    where: {
      job_name: "subscriber_notification",
      status: "pending",
    },
    orderBy: { created_at: "asc" },
  });

  for (const job of pendingJobs) {
    summary.processed++;

    // Mark as running
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        started_at: new Date(),
      },
    });

    try {
      const params = job.parameters_json as Record<string, any> | null;

      if (!params) {
        throw new Error("Job has no parameters_json payload");
      }

      const subscriberIds: string[] = params.subscriber_ids ?? [];
      const contentTitle: string = params.content_title ?? "New content published";
      const contentUrl: string = params.content_url ?? "";
      const siteId: string | undefined = params.site_id ?? job.site_id ?? undefined;

      if (subscriberIds.length === 0) {
        throw new Error("No subscriber IDs in job payload");
      }

      // Look up subscriber emails
      const subscribers = await prisma.subscriber.findMany({
        where: {
          id: { in: subscriberIds },
          status: "CONFIRMED",
        },
        select: {
          id: true,
          email: true,
          site_id: true,
        },
      });

      if (subscribers.length === 0) {
        // No confirmed subscribers to email -- mark completed with note
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            completed_at: new Date(),
            duration_ms: Date.now() - (job.started_at?.getTime() ?? Date.now()),
            result_json: {
              subscribers_found: 0,
              emails_sent: 0,
              note: "No confirmed subscribers found for provided IDs",
            },
          },
        });
        continue;
      }

      const baseUrl = process.env.NEXTAUTH_URL || "https://yalla-london.com";
      const siteName = "Yalla London";
      const fromAddress =
        process.env.EMAIL_FROM || "notifications@yalla-london.com";

      let jobSent = 0;
      let jobFailed = 0;
      const errors: string[] = [];

      for (const subscriber of subscribers) {
        const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(subscriber.email)}${siteId ? `&site=${siteId}` : ""}`;

        const html = buildNotificationEmail({
          contentTitle,
          contentUrl,
          siteName,
          unsubscribeUrl,
        });

        try {
          await sendEmail({
            to: subscriber.email,
            subject: `${siteName}: ${contentTitle}`,
            html,
            from: fromAddress,
          });
          jobSent++;
          summary.sent++;
        } catch (emailError) {
          jobFailed++;
          summary.failed++;
          const msg =
            emailError instanceof Error
              ? emailError.message
              : "Unknown email error";
          errors.push(`${subscriber.email}: ${msg}`);
        }
      }

      // Determine final job status
      const allFailed = jobSent === 0 && jobFailed > 0;
      const completedAt = new Date();
      const durationMs =
        completedAt.getTime() - (job.started_at?.getTime() ?? completedAt.getTime());

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: allFailed ? "failed" : "completed",
          completed_at: completedAt,
          duration_ms: durationMs,
          result_json: {
            subscribers_found: subscribers.length,
            emails_sent: jobSent,
            emails_failed: jobFailed,
            ...(errors.length > 0 ? { errors: errors.slice(0, 20) } : {}),
          },
          ...(allFailed
            ? { error_message: `All ${jobFailed} emails failed to send` }
            : {}),
        },
      });
    } catch (error) {
      // Whole-job-level failure
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const completedAt = new Date();
      const durationMs =
        completedAt.getTime() - (job.started_at?.getTime() ?? completedAt.getTime());

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          completed_at: completedAt,
          duration_ms: durationMs,
          error_message: errorMessage,
          retry_count: job.retry_count + 1,
        },
      });

      summary.failed++;
      console.error(
        `[email-notifications] Job ${job.id} failed: ${errorMessage}`
      );
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// sendEmail
// ---------------------------------------------------------------------------

/**
 * Send a single email using the provider specified by `EMAIL_PROVIDER`.
 *
 * Supported values: "resend", "sendgrid", "smtp".
 * If none is configured the email is logged to the console (development mode).
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, html, from } = params;
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim();
  const defaultFrom = from || process.env.EMAIL_FROM || "notifications@yalla-london.com";

  // --- Resend ---
  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: defaultFrom,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Resend API error ${response.status}: ${body.slice(0, 200)}`
      );
    }

    return;
  }

  // --- SendGrid ---
  if (provider === "sendgrid") {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject,
          },
        ],
        from: { email: defaultFrom, name: "Yalla London" },
        content: [
          {
            type: "text/html",
            value: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `SendGrid API error ${response.status}: ${body.slice(0, 200)}`
      );
    }

    return;
  }

  // --- SMTP (nodemailer) ---
  if (provider === "smtp") {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP configuration incomplete: SMTP_HOST, SMTP_USER, and SMTP_PASS are required"
      );
    }

    // Dynamic import so nodemailer is only required when SMTP is selected
    // @ts-ignore — nodemailer may not be installed; runtime check only
    const nodemailer = await import(/* webpackIgnore: true */ "nodemailer");

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: defaultFrom,
      to,
      subject,
      html,
    });

    return;
  }

  // --- Fallback: log to console ---
  console.warn(
    "[email-notifications] No EMAIL_PROVIDER configured. Email will only be logged."
  );
  console.log(
    `[email-notifications] Would send email:\n` +
      `  To:      ${to}\n` +
      `  From:    ${defaultFrom}\n` +
      `  Subject: ${subject}\n` +
      `  HTML:    ${html.slice(0, 200)}...`
  );
}

// ---------------------------------------------------------------------------
// buildNotificationEmail
// ---------------------------------------------------------------------------

/**
 * Produce a clean, responsive HTML email for a new-content notification.
 */
export function buildNotificationEmail(data: NotificationEmailData): string {
  const { contentTitle, contentUrl, siteName, unsubscribeUrl } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(contentTitle)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .content-cell { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    New on ${escapeHtml(siteName)}: ${escapeHtml(contentTitle)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 0;">

        <!-- Header -->
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 700; color: #0C4A6E; letter-spacing: -0.5px;">
                ${escapeHtml(siteName)}
              </span>
            </td>
          </tr>
        </table>

        <!-- Body Card -->
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <!-- Accent bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #0C4A6E, #0EA5E9);"></td>
          </tr>
          <tr>
            <td class="content-cell" style="padding: 40px 48px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1a1a2e; line-height: 1.35;">
                ${escapeHtml(contentTitle)}
              </h1>
              <p style="margin: 0 0 28px; font-size: 16px; color: #4a4a68; line-height: 1.6;">
                We just published something new that we think you will enjoy. Click below to read the full article.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #0C4A6E;">
                    <a href="${escapeHtml(contentUrl)}"
                       target="_blank"
                       style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                      Read Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${escapeHtml(contentUrl)}" style="color: #0EA5E9; word-break: break-all;">${escapeHtml(contentUrl)}</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">
          <tr>
            <td style="padding: 28px 48px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                You are receiving this email because you subscribed to ${escapeHtml(siteName)} notifications.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                ${escapeHtml(siteName)}
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// sendPurchaseDeliveryEmail
// ---------------------------------------------------------------------------

export interface PurchaseDeliveryEmailParams {
  to: string;
  customerName?: string;
  productName: string;
  amount: number; // cents
  currency: string;
  downloadUrl: string;
}

/**
 * Send a purchase confirmation + download delivery email after a
 * successful digital product purchase.
 */
export async function sendPurchaseDeliveryEmail(
  params: PurchaseDeliveryEmailParams,
): Promise<void> {
  const { to, customerName, productName, amount, currency, downloadUrl } =
    params;

  const formattedAmount =
    amount === 0
      ? "Free"
      : `${currency === "USD" ? "$" : currency === "GBP" ? "£" : currency + " "}${(amount / 100).toFixed(2)}`;

  const greeting = customerName ? `Dear ${escapeHtml(customerName)},` : "Hello,";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Purchase – ${escapeHtml(productName)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .content-cell { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your download is ready – ${escapeHtml(productName)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 0;">

        <!-- Header -->
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 700; color: #1C1917; letter-spacing: -0.5px;">
                Yalla London
              </span>
            </td>
          </tr>
        </table>

        <!-- Body Card -->
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #C8322B, #1C1917);"></td>
          </tr>
          <tr>
            <td class="content-cell" style="padding: 40px 48px;">
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #1C1917;">
                Thank you for your purchase!
              </h1>
              <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a68; line-height: 1.6;">
                ${greeting}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: #f8f9fc; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">Product</p>
                    <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1C1917;">${escapeHtml(productName)}</p>
                    <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">Amount Paid</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1C1917;">${formattedAmount}</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a68; line-height: 1.6;">
                Click the button below to download your product. You can download it up to 5 times.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #C8322B;">
                    <a href="${escapeHtml(downloadUrl)}"
                       target="_blank"
                       style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Download Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                If the button does not work, copy this link into your browser:<br />
                <a href="${escapeHtml(downloadUrl)}" style="color: #C8322B; word-break: break-all;">${escapeHtml(downloadUrl)}</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">
          <tr>
            <td style="padding: 28px 48px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} Yalla London. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendEmail({
    to,
    subject: `Your Download is Ready – ${productName}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Basic HTML entity escaping for dynamic values injected into templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
