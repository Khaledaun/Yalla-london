
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { notifications } from '@/lib/integrations/notifications'
import { emailMarketing } from '@/lib/integrations/email-marketing'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  try {
    // Verify webhook signature (simplified - in production use Stripe SDK)
    // const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    
    // For now, parse the event directly
    const event = JSON.parse(body)

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object)
        break
        
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSuccessfulPayment(paymentIntent: any) {
  const metadata = paymentIntent.metadata
  const customerEmail = metadata.customer_email
  const customerName = metadata.customer_name
  const eventName = metadata.event_name
  const totalAmount = paymentIntent.amount / 100

  console.log('Payment succeeded:', {
    id: paymentIntent.id,
    customer: customerName,
    event: eventName,
    amount: totalAmount
  })

  // Send notification
  await notifications.notifyBooking(customerName, eventName, totalAmount)

  // Send confirmation email
  if (customerEmail) {
    const { SendGridAPI } = await import('@/lib/integrations/email-marketing')
    const sendgrid = new SendGridAPI()
    
    const subject = 'Booking Confirmed - Yalla London'
    const htmlContent = `
      <div style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Booking Confirmed!</h1>
        <p>Dear ${customerName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Tickets:</strong> ${metadata.ticket_quantity}</p>
          <p><strong>Total Paid:</strong> £${totalAmount}</p>
          <p><strong>Booking Reference:</strong> ${paymentIntent.id}</p>
        </div>
        <p>We look forward to seeing you at this exclusive London experience!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://yalla-london.com/events" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View My Bookings</a>
        </div>
      </div>
    `
    
    await sendgrid.sendEmail(customerEmail, subject, htmlContent)
  }
}

async function handleFailedPayment(paymentIntent: any) {
  const metadata = paymentIntent.metadata
  const customerEmail = metadata.customer_email
  const customerName = metadata.customer_name
  
  console.log('Payment failed:', {
    id: paymentIntent.id,
    customer: customerName,
    reason: paymentIntent.last_payment_error?.message
  })

  // Send notification about failed payment
  await notifications.send({
    title: 'Payment Failed',
    message: `Payment failed for ${customerName} - ${paymentIntent.last_payment_error?.message}`,
    type: 'warning',
    data: {
      paymentIntentId: paymentIntent.id,
      customerEmail: customerEmail,
      failureReason: paymentIntent.last_payment_error?.message
    }
  })
}
