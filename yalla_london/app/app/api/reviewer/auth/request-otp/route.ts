/**
 * POST /api/reviewer/auth/request-otp
 * Request OTP code for reviewer login
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestOTP, generateOTP } from '@/lib/reviewer/auth';
import { sendOTPEmail } from '@/lib/reviewer/email';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, siteId } = body;
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Request OTP
    const result = await requestOTP(email, ipAddress, userAgent);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 429 }
      );
    }
    
    // Get the OTP code from the most recent session
    const session = await prisma.reviewerSession.findFirst({
      where: { 
        email: email.toLowerCase().trim(),
        is_used: false,
      },
      orderBy: { created_at: 'desc' },
    });
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Failed to create OTP session' },
        { status: 500 }
      );
    }
    
    // Send OTP via email
    const emailResult = await sendOTPEmail({
      to: email,
      otpCode: session.otp_code,
      siteId,
      isNewUser: result.isNewUser,
    });
    
    if (!emailResult.success) {
      // Clean up the session if email fails
      await prisma.reviewerSession.delete({ where: { id: session.id } });
      
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      isNewUser: result.isNewUser,
    });
    
  } catch (error) {
    console.error('[request-otp] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
