/**
 * Phase 4C CRM Subscription API
 * Double opt-in subscription management with GDPR compliance
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAdmin } from "@/lib/admin-middleware";

// Zod schemas for validation
const SubscribeSchema = z.object({
  email: z.string().email(),
  source: z.enum(['exit_intent', 'newsletter_signup', 'content_gate']).default('newsletter_signup'),
  preferences: z.object({
    topics: z.array(z.string()).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
    language: z.enum(['en', 'ar', 'both']).default('en')
  }).optional(),
  utm_params: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional()
  }).optional(),
  consent_version: z.string().default('2024.1'),
  ip_address: z.string().optional(),
  user_agent: z.string().optional()
});

// POST - Subscribe user (with double opt-in)
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Feature flag check
    if (!isFeatureEnabled('FEATURE_CRM_MINIMAL')) {
      return NextResponse.json(
        { error: 'CRM feature is disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = SubscribeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { email, source, preferences, utm_params, consent_version, ip_address, user_agent } = validation.data;

    // Check if subscriber already exists
    const existingSubscriber = await prisma.subscriber.findFirst({
      where: { email: email }
    });

    if (existingSubscriber) {
      // If already confirmed, return success
      if (existingSubscriber.status === 'CONFIRMED') {
        return NextResponse.json({
          success: true,
          message: 'Already subscribed',
          status: 'confirmed'
        });
      }
      
      // If pending, resend confirmation
      if (existingSubscriber.status === 'PENDING') {
        // Generate new token and update
        const doubleOptinToken = crypto.randomBytes(32).toString('hex');
        
        await prisma.subscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            double_optin_token: doubleOptinToken,
            double_optin_sent_at: new Date(),
            preferences_json: preferences,
            metadata_json: { utm_params, user_agent, ip_address: ip_address?.slice(0, -1) + 'X' } // Anonymize last octet
          }
        });

        // TODO: Send confirmation email
        console.log(`Sending confirmation email to ${email}`);

        return NextResponse.json({
          success: true,
          message: 'Confirmation email resent',
          status: 'pending'
        });
      }
    }

    // Create new subscriber
    const doubleOptinToken = crypto.randomBytes(32).toString('hex');
    
    const subscriber = await prisma.subscriber.create({
      data: {
        email: email,
        status: 'PENDING',
        source: source,
        preferences_json: preferences,
        metadata_json: { 
          utm_params, 
          user_agent,
          ip_address: ip_address?.slice(0, -1) + 'X' // Anonymize last octet immediately
        },
        double_optin_token: doubleOptinToken,
        double_optin_sent_at: new Date()
      }
    });

    // Log consent
    await prisma.consentLog.create({
      data: {
        subscriber_id: subscriber.id,
        consent_type: 'newsletter',
        consent_version: consent_version,
        action: 'granted',
        legal_basis: 'consent',
        processing_purposes: ['marketing', 'communications'],
        data_categories: ['email', 'preferences'],
        consent_text: 'User consented to receive newsletter communications',
        ip_address: ip_address?.slice(0, -1) + 'X', // Anonymize
        user_agent: user_agent
      }
    });

    // TODO: Send double opt-in confirmation email
    console.log(`Sending confirmation email to ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription initiated. Please check your email to confirm.',
      status: 'pending',
      subscriber_id: subscriber.id
    }, { status: 201 });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Confirm subscription (double opt-in)
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    if (!isFeatureEnabled('FEATURE_CRM_MINIMAL')) {
      return NextResponse.json(
        { error: 'CRM feature is disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Confirmation token required' },
        { status: 400 }
      );
    }

    // Find subscriber by token
    const subscriber = await prisma.subscriber.findFirst({
      where: { 
        double_optin_token: token,
        status: 'PENDING'
      }
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token' },
        { status: 404 }
      );
    }

    // Check if token is not expired (valid for 24 hours)
    const tokenAge = Date.now() - (subscriber.double_optin_sent_at?.getTime() || 0);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Confirmation token has expired' },
        { status: 410 }
      );
    }

    // Confirm subscription
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'CONFIRMED',
        confirmed_at: new Date(),
        double_optin_token: null // Clear token after use
      }
    });

    // Log confirmation consent
    await prisma.consentLog.create({
      data: {
        subscriber_id: subscriber.id,
        consent_type: 'newsletter',
        consent_version: '2024.1',
        action: 'confirmed',
        legal_basis: 'consent',
        processing_purposes: ['marketing', 'communications'],
        data_categories: ['email', 'preferences'],
        consent_text: 'User confirmed email subscription via double opt-in'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully',
      status: 'confirmed'
    });

  } catch (error) {
    console.error('Confirmation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to confirm subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}