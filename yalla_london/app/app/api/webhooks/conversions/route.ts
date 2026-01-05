/**
 * Conversion Webhook API
 *
 * POST /api/webhooks/conversions - Receive conversion notifications from affiliate partners
 *
 * This endpoint handles incoming webhooks from:
 * - Booking.com
 * - Agoda
 * - Other affiliate networks
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordConversion, updateConversionStatus, getClick } from '@/lib/domains/affiliate';
import crypto from 'crypto';

// Webhook secret keys for verification (set in environment variables)
const WEBHOOK_SECRETS: Record<string, string | undefined> = {
  'booking-com': process.env.BOOKING_WEBHOOK_SECRET,
  agoda: process.env.AGODA_WEBHOOK_SECRET,
  generic: process.env.GENERIC_WEBHOOK_SECRET,
};

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partner = searchParams.get('partner') || 'generic';

    // Verify webhook signature if secret is configured
    const secret = WEBHOOK_SECRETS[partner];
    if (secret) {
      const signature = request.headers.get('x-webhook-signature');
      const body = await request.text();

      if (!verifySignature(body, signature, secret)) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }

      // Re-parse body since we already consumed it
      const payload = JSON.parse(body);
      return handleWebhook(partner, payload);
    }

    const body = await request.json();
    return handleWebhook(partner, body);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleWebhook(partner: string, payload: any) {
  // Normalize payload based on partner format
  const normalized = normalizePayload(partner, payload);

  if (!normalized) {
    return NextResponse.json(
      { success: false, error: 'Unable to parse webhook payload' },
      { status: 400 }
    );
  }

  const { click_id, event_type, booking_ref, booking_value, commission, currency, check_in, check_out } =
    normalized;

  // Verify click exists
  const click = await getClick(click_id);
  if (!click) {
    return NextResponse.json(
      { success: false, error: 'Click not found' },
      { status: 404 }
    );
  }

  try {
    if (event_type === 'booking') {
      // New booking
      const conversion = await recordConversion({
        click_id,
        booking_ref,
        booking_value: Math.round(booking_value * 100), // Convert to cents
        commission: Math.round(commission * 100),
        currency,
        check_in: check_in ? new Date(check_in) : undefined,
        check_out: check_out ? new Date(check_out) : undefined,
      });

      return NextResponse.json({
        success: true,
        data: { conversion_id: conversion.id },
      });
    } else if (event_type === 'completed') {
      // Stay completed
      await updateConversionStatus(normalized.conversion_id, 'COMPLETED');
      return NextResponse.json({ success: true, message: 'Marked as completed' });
    } else if (event_type === 'cancelled') {
      // Booking cancelled
      await updateConversionStatus(normalized.conversion_id, 'CANCELLED');
      return NextResponse.json({ success: true, message: 'Marked as cancelled' });
    } else if (event_type === 'paid') {
      // Commission paid
      await updateConversionStatus(normalized.conversion_id, 'PAID');
      return NextResponse.json({ success: true, message: 'Marked as paid' });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown event type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Normalize webhook payload from different partners
 */
function normalizePayload(partner: string, payload: any): any {
  try {
    switch (partner) {
      case 'booking-com':
        return {
          click_id: payload.sub_id || payload.subid,
          event_type: payload.event_type || 'booking',
          booking_ref: payload.reservation_id,
          booking_value: parseFloat(payload.booking_value || payload.amount || 0),
          commission: parseFloat(payload.commission || 0),
          currency: payload.currency || 'USD',
          check_in: payload.check_in_date,
          check_out: payload.check_out_date,
          conversion_id: payload.conversion_id,
        };

      case 'agoda':
        return {
          click_id: payload.clickId || payload.subId,
          event_type: payload.status === 'confirmed' ? 'completed' : 'booking',
          booking_ref: payload.bookingId,
          booking_value: parseFloat(payload.totalPrice || 0),
          commission: parseFloat(payload.commission || 0),
          currency: payload.currency || 'USD',
          check_in: payload.checkIn,
          check_out: payload.checkOut,
          conversion_id: payload.conversionId,
        };

      default:
        // Generic format
        return {
          click_id: payload.click_id || payload.subid || payload.sub_id,
          event_type: payload.event_type || payload.type || 'booking',
          booking_ref: payload.booking_ref || payload.order_id,
          booking_value: parseFloat(payload.booking_value || payload.amount || 0),
          commission: parseFloat(payload.commission || 0),
          currency: payload.currency || 'USD',
          check_in: payload.check_in,
          check_out: payload.check_out,
          conversion_id: payload.conversion_id,
        };
    }
  } catch {
    return null;
  }
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
