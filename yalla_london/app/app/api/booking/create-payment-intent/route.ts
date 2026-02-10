export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { stripePayments } from '@/lib/integrations/payment-booking'
import { notifications } from '@/lib/integrations/notifications'
import { apiLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const blocked = apiLimiter(request);
  if (blocked) return blocked;

  try {
    const { 
      eventId, 
      eventName,
      customerEmail, 
      customerName,
      ticketQuantity, 
      unitPrice,
      currency = 'gbp' 
    } = await request.json()

    if (!eventId || !customerEmail || !customerName || !ticketQuantity || !unitPrice) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      )
    }

    const totalAmount = ticketQuantity * unitPrice

    // Create payment intent
    const paymentIntent = await stripePayments.createPaymentIntent(
      totalAmount * 100, // Convert to cents
      currency,
      {
        event_id: eventId,
        event_name: eventName,
        customer_email: customerEmail,
        customer_name: customerName,
        ticket_quantity: ticketQuantity.toString(),
      }
    )

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Failed to create payment intent' },
        { status: 500 }
      )
    }

    // Send notification about new booking attempt
    await notifications.send({
      title: 'New Booking Started',
      message: `${customerName} is attempting to book ${ticketQuantity} ticket(s) for "${eventName}"`,
      type: 'info',
      data: { 
        eventId, 
        eventName,
        customerEmail, 
        totalAmount: `£${totalAmount}` 
      },
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id,
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    await notifications.notifyError('Payment intent creation failed', JSON.stringify(request.json()))
    
    return NextResponse.json(
      { error: 'Failed to process booking request' },
      { status: 500 }
    )
  }
}
