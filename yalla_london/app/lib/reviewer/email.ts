/**
 * Reviewer Email Service
 * Sends OTP codes and notifications to reviewers via Resend
 */

import { sendEmail } from '@/lib/email/sender';
import { getSiteConfig } from '@/config/sites';
import { getDefaultSiteId } from '@/config/sites';

interface SendOTPEmailParams {
  to: string;
  otpCode: string;
  siteId?: string;
  isNewUser: boolean;
}

/**
 * Send OTP email to reviewer
 */
export async function sendOTPEmail({
  to,
  otpCode,
  siteId,
  isNewUser,
}: SendOTPEmailParams): Promise<{ success: boolean; error?: string }> {
  const effectiveSiteId = siteId || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const siteName = siteConfig?.name || 'Yalla London';
  
  const subject = isNewUser 
    ? `Welcome to ${siteName} - Your verification code`
    : `Your ${siteName} login code`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 480px;
      margin: 40px auto;
      padding: 0;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo h1 {
      color: #1a365d;
      font-size: 24px;
      margin: 0;
    }
    .otp-box {
      background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #ffffff;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .expires {
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      margin-top: 8px;
    }
    h2 {
      color: #1a365d;
      font-size: 20px;
      margin: 0 0 16px 0;
    }
    p {
      color: #4a5568;
      margin: 0 0 16px 0;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      margin-top: 32px;
    }
    .footer p {
      color: #718096;
      font-size: 13px;
      margin: 0;
    }
    .warning {
      background: #fffaf0;
      border: 1px solid #fbd38d;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      color: #744210;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>${siteName}</h1>
      </div>
      
      <h2>${isNewUser ? 'Welcome to the team!' : 'Your login code'}</h2>
      
      <p>${isNewUser 
        ? "You've been invited to join as a content reviewer. Use the code below to verify your email and complete your profile."
        : "Enter this code to sign in to your reviewer account."
      }</p>
      
      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
        <div class="expires">Valid for 15 minutes</div>
      </div>
      
      <div class="warning">
        <strong>Security note:</strong> Never share this code with anyone. We'll never ask for it via phone or chat.
      </div>
      
      <div class="footer">
        <p>This email was sent to ${to}</p>
        <p>If you didn't request this code, you can safely ignore this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  try {
    await sendEmail({
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[reviewer-email] Failed to send OTP email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

interface SendReviewAssignmentParams {
  to: string;
  reviewerName: string | null;
  articleTitle: string;
  articleSlug: string;
  dueDate?: Date;
  instructions?: string;
  siteId?: string;
}

/**
 * Send notification when a review is assigned
 */
export async function sendReviewAssignmentEmail({
  to,
  reviewerName,
  articleTitle,
  articleSlug,
  dueDate,
  instructions,
  siteId,
}: SendReviewAssignmentParams): Promise<{ success: boolean; error?: string }> {
  const effectiveSiteId = siteId || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const siteName = siteConfig?.name || 'Yalla London';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.yalla-london.com';
  
  const subject = `New content review assigned: ${articleTitle}`;
  const displayName = reviewerName || 'Reviewer';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      padding: 0;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo h1 {
      color: #1a365d;
      font-size: 24px;
      margin: 0;
    }
    h2 {
      color: #1a365d;
      font-size: 20px;
      margin: 0 0 16px 0;
    }
    p {
      color: #4a5568;
      margin: 0 0 16px 0;
    }
    .article-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      color: #1a365d;
      margin: 0 0 8px 0;
    }
    .due-date {
      color: #e53e3e;
      font-weight: 500;
    }
    .instructions {
      background: #fffaf0;
      border-left: 3px solid #ed8936;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 14px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      margin-top: 32px;
    }
    .footer p {
      color: #718096;
      font-size: 13px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>${siteName}</h1>
      </div>
      
      <h2>Hi ${displayName}!</h2>
      
      <p>You have a new article to review. Your expertise helps us create authentic, high-quality content that our readers love.</p>
      
      <div class="article-card">
        <div class="article-title">${articleTitle}</div>
        ${dueDate ? `<p class="due-date">Due: ${dueDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>` : ''}
      </div>
      
      ${instructions ? `
      <div class="instructions">
        <strong>Special instructions:</strong><br>
        ${instructions}
      </div>
      ` : ''}
      
      <center>
        <a href="${baseUrl}/reviewer/dashboard" class="btn">View Assignment</a>
      </center>
      
      <p style="font-size: 14px; color: #718096;">
        As a reviewer, please add your genuine first-hand experience, verify facts, and upload any relevant photos you've taken. Your personal touches make our content stand out!
      </p>
      
      <div class="footer">
        <p>${siteName} Content Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  try {
    await sendEmail({
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[reviewer-email] Failed to send assignment email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

interface SendReviewApprovedParams {
  to: string;
  reviewerName: string | null;
  articleTitle: string;
  articleUrl: string;
  siteId?: string;
}

/**
 * Send notification when a review is approved
 */
export async function sendReviewApprovedEmail({
  to,
  reviewerName,
  articleTitle,
  articleUrl,
  siteId,
}: SendReviewApprovedParams): Promise<{ success: boolean; error?: string }> {
  const effectiveSiteId = siteId || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const siteName = siteConfig?.name || 'Yalla London';
  const displayName = reviewerName || 'Reviewer';
  
  const subject = `Your review is live: ${articleTitle}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      padding: 0;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo h1 {
      color: #1a365d;
      font-size: 24px;
      margin: 0;
    }
    .success-icon {
      text-align: center;
      font-size: 48px;
      margin: 20px 0;
    }
    h2 {
      color: #1a365d;
      font-size: 20px;
      margin: 0 0 16px 0;
      text-align: center;
    }
    p {
      color: #4a5568;
      margin: 0 0 16px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      margin-top: 32px;
    }
    .footer p {
      color: #718096;
      font-size: 13px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>${siteName}</h1>
      </div>
      
      <div class="success-icon">🎉</div>
      
      <h2>Your review has been published!</h2>
      
      <p>Great work, ${displayName}! Your review of <strong>"${articleTitle}"</strong> has been approved and is now live on the site.</p>
      
      <p>Your name appears as the reviewer, giving you credit for your authentic contributions.</p>
      
      <center>
        <a href="${articleUrl}" class="btn">View Your Article</a>
      </center>
      
      <p style="font-size: 14px; color: #718096;">
        Thank you for helping us create genuine, high-quality content. Your real-world experience makes a difference!
      </p>
      
      <div class="footer">
        <p>${siteName} Content Team</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  try {
    await sendEmail({
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[reviewer-email] Failed to send approval email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}
