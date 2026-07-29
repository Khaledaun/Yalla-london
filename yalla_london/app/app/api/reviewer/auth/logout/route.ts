/**
 * POST /api/reviewer/auth/logout
 * Logout reviewer and clear session
 */

import { NextResponse } from 'next/server';
import { getSessionFromCookie, logout, clearSessionCookie } from '@/lib/reviewer/auth';

export async function POST() {
  try {
    const sessionToken = await getSessionFromCookie();
    
    if (sessionToken) {
      // Invalidate session in database
      await logout(sessionToken);
    }
    
    // Clear session cookie
    await clearSessionCookie();
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    
  } catch (error) {
    console.error('[logout] Error:', error);
    // Even on error, try to clear the cookie
    try {
      await clearSessionCookie();
    } catch {
      // Ignore cookie clearing error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Logged out',
    });
  }
}
