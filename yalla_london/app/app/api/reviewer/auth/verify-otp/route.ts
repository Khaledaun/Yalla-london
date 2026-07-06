/**
 * POST /api/reviewer/auth/verify-otp
 * Verify OTP code and create session
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP, setSessionCookie } from '@/lib/reviewer/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { success: false, error: 'OTP code is required' },
        { status: 400 }
      );
    }
    
    // Verify OTP - accepts 6-digit code
    const cleanOTP = otp.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanOTP)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP format' },
        { status: 400 }
      );
    }
    
    // Verify OTP and create session
    const result = await verifyOTP(email, cleanOTP);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }
    
    // Set session cookie
    if (result.sessionToken) {
      await setSessionCookie(result.sessionToken);
    }
    
    return NextResponse.json({
      success: true,
      isNewUser: result.isNewUser,
      reviewer: result.reviewer,
      // Include redirect hint for client
      redirectTo: result.isNewUser || result.reviewer?.status === 'pending_onboard'
        ? '/reviewer/onboard'
        : '/reviewer/dashboard',
    });
    
  } catch (error) {
    console.error('[verify-otp] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
