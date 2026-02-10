export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { stripePayments } from '@/lib/integrations/payment-booking'
import { notifications } from '@/lib/integrations/notifications'
import { emailMarketing } from '@/lib/integrations/email-marketing'
import { apiLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const blocked = apiLimiter(request);
  if (blocked) return blocked;

  try {
    const { paymentIntentId, paymentMethodId } = await request.json()

    if (!paymentIntentId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing payment information' },
        { status: 400 }
      )
    }

    // Confirm payment
    const result = await stripePayments.confirmPayment(paymentIntentId, paymentMethodId)

    if (!result || result.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment confirmation failed' },
        { status: 400 }
      )
    }

    // Extract booking information from metadata
    const metadata = result.metadata
    const customerEmail = metadata.customer_email
    const customerName = metadata.customer_name
    const eventName = metadata.event_name
    const totalAmount = result.amount / 100

    // Send confirmation email
    if (customerEmail) {
      const confirmationSubject = 'Booking Confirmed - Yalla London'
      const confirmationContent = `
        <div style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Booking Confirmed!</h1>
          <p>Dear ${customerName},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <p><strong>Event:</strong> ${eventName}</p>
            <p><strong>Tickets:</strong> ${metadata.ticket_quantity}</p>
            <p><strong>Total Paid:</strong> £${totalAmount}</p>
            <p><strong>Booking Reference:</strong> ${paymentIntentId}</p>
          </div>
          <p>We look forward to seeing you at this exclusive London experience!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yalla-london.com/events" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View My Bookings</a>
          </div>
        </div>
      `
      
      // Send via SendGrid
      const { SendGridAPI } = await import('@/lib/integrations/email-marketing')
      const sendgrid = new SendGridAPI()
      await sendgrid.sendEmail(customerEmail, confirmationSubject, confirmationContent)
    }

    // Send notification about successful booking
    await notifications.notifyBooking(customerName, eventName, totalAmount)

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      bookingReference: paymentIntentId,
    })

  } catch (error) {
    console.error('Payment confirmation error:', error)
    await notifications.notifyError('Payment confirmation failed', JSON.stringify(request.json()))
    
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
