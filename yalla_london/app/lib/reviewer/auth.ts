/**
 * Reviewer Authentication Library
 * OTP-based authentication for content reviewers
 * 
 * Flow:
 * 1. Reviewer enters email
 * 2. System sends 6-digit OTP (valid 15 mins)
 * 3. Reviewer enters OTP
 * 4. System creates session token (valid 30 days)
 * 5. Session token used for all subsequent requests
 */

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Constants
const OTP_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_DAYS = 30;
const OTP_LENGTH = 6;
const SESSION_COOKIE_NAME = 'reviewer_session';

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOTP(): string {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1000000;
  return num.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Request OTP for a reviewer
 * Creates a new session record with the OTP
 */
export async function requestOTP(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; isNewUser: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if reviewer exists
    const existingReviewer = await prisma.reviewer.findUnique({
      where: { email: normalizedEmail },
    });
    
    // Check for rate limiting - max 5 OTPs per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await prisma.reviewerSession.count({
      where: {
        email: normalizedEmail,
        created_at: { gte: oneHourAgo },
      },
    });
    
    if (recentOTPs >= 5) {
      return { 
        success: false, 
        isNewUser: false,
        error: 'Too many OTP requests. Please wait before trying again.' 
      };
    }
    
    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Create session record
    await prisma.reviewerSession.create({
      data: {
        reviewer_id: existingReviewer?.id || null,
        email: normalizedEmail,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
    
    // Return the OTP (caller will send via email)
    // In production, we'd return just success and send email here
    return {
      success: true,
      isNewUser: !existingReviewer,
      // NOTE: In production, remove this - OTP should only be sent via email
      // Keeping it here for development/testing purposes
    };
  } catch (error) {
    console.error('[reviewer-auth] Failed to request OTP:', error);
    return { success: false, isNewUser: false, error: 'Failed to send OTP' };
  }
}

/**
 * Verify OTP and create session
 */
export async function verifyOTP(
  email: string,
  otpCode: string
): Promise<{ 
  success: boolean; 
  sessionToken?: string;
  reviewer?: {
    id: string;
    email: string;
    name: string | null;
    status: string;
  };
  isNewUser: boolean;
  error?: string;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find valid OTP session
    const session = await prisma.reviewerSession.findFirst({
      where: {
        email: normalizedEmail,
        otp_code: otpCode,
        is_used: false,
        otp_expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
    
    if (!session) {
      return { 
        success: false, 
        isNewUser: false,
        error: 'Invalid or expired OTP' 
      };
    }
    
    // Generate session token
    const sessionToken = generateSessionToken();
    const sessionExpires = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    // Check if reviewer exists
    let reviewer = await prisma.reviewer.findUnique({
      where: { email: normalizedEmail },
    });
    
    const isNewUser = !reviewer;
    
    // If new user, create reviewer record
    if (!reviewer) {
      reviewer = await prisma.reviewer.create({
        data: {
          email: normalizedEmail,
          status: 'pending_onboard',
        },
      });
    }
    
    // Update session with token and mark OTP as used
    await prisma.reviewerSession.update({
      where: { id: session.id },
      data: {
        is_used: true,
        session_token: sessionToken,
        session_expires: sessionExpires,
        reviewer_id: reviewer.id,
      },
    });
    
    // Update reviewer last active
    await prisma.reviewer.update({
      where: { id: reviewer.id },
      data: { last_active_at: new Date() },
    });
    
    return {
      success: true,
      sessionToken,
      reviewer: {
        id: reviewer.id,
        email: reviewer.email,
        name: reviewer.name,
        status: reviewer.status,
      },
      isNewUser,
    };
  } catch (error) {
    console.error('[reviewer-auth] Failed to verify OTP:', error);
    return { success: false, isNewUser: false, error: 'Failed to verify OTP' };
  }
}

/**
 * Validate session token and get reviewer
 */
export async function validateSession(
  sessionToken: string
): Promise<{
  valid: boolean;
  reviewer?: {
    id: string;
    email: string;
    name: string | null;
    slug: string | null;
    bio: string | null;
    avatar_url: string | null;
    status: string;
    is_verified: boolean;
    site_ids: string[];
    expertise_areas: string[];
    location: string | null;
  };
  error?: string;
}> {
  try {
    const session = await prisma.reviewerSession.findUnique({
      where: { session_token: sessionToken },
      include: { reviewer: true },
    });
    
    if (!session || !session.reviewer) {
      return { valid: false, error: 'Invalid session' };
    }
    
    if (session.session_expires && session.session_expires < new Date()) {
      return { valid: false, error: 'Session expired' };
    }
    
    if (session.reviewer.status === 'suspended') {
      return { valid: false, error: 'Account suspended' };
    }
    
    // Update last active
    await prisma.reviewer.update({
      where: { id: session.reviewer.id },
      data: { last_active_at: new Date() },
    });
    
    return {
      valid: true,
      reviewer: {
        id: session.reviewer.id,
        email: session.reviewer.email,
        name: session.reviewer.name,
        slug: session.reviewer.slug,
        bio: session.reviewer.bio,
        avatar_url: session.reviewer.avatar_url,
        status: session.reviewer.status,
        is_verified: session.reviewer.is_verified,
        site_ids: session.reviewer.site_ids,
        expertise_areas: session.reviewer.expertise_areas,
        location: session.reviewer.location,
      },
    };
  } catch (error) {
    console.error('[reviewer-auth] Failed to validate session:', error);
    return { valid: false, error: 'Failed to validate session' };
  }
}

/**
 * Get session token from cookie
 */
export async function getSessionFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    return sessionCookie?.value || null;
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Logout - invalidate session
 */
export async function logout(sessionToken: string): Promise<void> {
  try {
    await prisma.reviewerSession.updateMany({
      where: { session_token: sessionToken },
      data: { session_expires: new Date(0) }, // Expire immediately
    });
  } catch (error) {
    console.error('[reviewer-auth] Failed to logout:', error);
  }
}

/**
 * Get current reviewer from request
 * Helper for API routes
 */
export async function getCurrentReviewer(): Promise<{
  id: string;
  email: string;
  name: string | null;
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  status: string;
  is_verified: boolean;
  site_ids: string[];
  expertise_areas: string[];
  location: string | null;
} | null> {
  const sessionToken = await getSessionFromCookie();
  if (!sessionToken) return null;
  
  const result = await validateSession(sessionToken);
  return result.valid ? result.reviewer! : null;
}

/**
 * Require reviewer authentication middleware
 * Returns reviewer or throws unauthorized error
 */
export async function requireReviewer(): Promise<{
  id: string;
  email: string;
  name: string | null;
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  status: string;
  is_verified: boolean;
  site_ids: string[];
  expertise_areas: string[];
  location: string | null;
}> {
  const reviewer = await getCurrentReviewer();
  if (!reviewer) {
    throw new Error('Unauthorized');
  }
  return reviewer;
}
