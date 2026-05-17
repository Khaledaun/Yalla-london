
// Payment & Booking Integration
export interface BookingData {
  eventId: string;
  customerEmail: string;
  customerName: string;
  ticketQuantity: number;
  totalAmount: number;
  currency: string;
  eventDate: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
}

// Stripe Integration
export class StripePayments {
  private publishableKey: string;
  private secretKey: string;

  constructor() {
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
  }

  // Create payment intent
  async createPaymentIntent(
    amount: number,
    currency: string = 'gbp',
    metadata: Record<string, string> = {}
  ): Promise<PaymentIntent | null> {
    if (!this.secretKey) {
      console.warn('Stripe secret key not configured');
      return null;
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: amount.toString(),
          currency: currency,
          ...Object.entries(metadata).reduce((acc, [key, value]) => ({
            ...acc,
            [`metadata[${key}]`]: value,
          }), {}),
        }),
      });

      const paymentIntent = await response.json();
      
      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error('Failed to create Stripe payment intent:', error);
      return null;
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId: string, paymentMethodId: string) {
    if (!this.secretKey) return null;

    try {
      const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payment_method: paymentMethodId,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to confirm Stripe payment:', error);
      return null;
    }
  }

  // Create customer
  async createCustomer(email: string, name: string) {
    if (!this.secretKey) return null;

    try {
      const response = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
          name: name,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      return null;
    }
  }
}

// Calendly Integration
export class CalendlyBooking {
  private accessToken: string;
  private userUri: string;

  constructor() {
    this.accessToken = process.env.CALENDLY_ACCESS_TOKEN || '';
    this.userUri = process.env.CALENDLY_USER_URI || '';
  }

  // Get available event types
  async getEventTypes() {
    if (!this.accessToken || !this.userUri) {
      console.warn('Calendly credentials not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.calendly.com/event_types?user=${encodeURIComponent(this.userUri)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      const data = await response.json();
      return data.collection;
    } catch (error) {
      console.error('Failed to get Calendly event types:', error);
      return null;
    }
  }

  // Get scheduled events
  async getScheduledEvents(startTime?: string, endTime?: string) {
    if (!this.accessToken || !this.userUri) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        user: this.userUri,
      });

      if (startTime) params.append('min_start_time', startTime);
      if (endTime) params.append('max_start_time', endTime);

      const response = await fetch(
        `https://api.calendly.com/scheduled_events?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      const data = await response.json();
      return data.collection;
    } catch (error) {
      console.error('Failed to get scheduled events:', error);
      return null;
    }
  }

  // Create event type
  async createEventType(
    name: string,
    duration: number,
    description: string
  ) {
    if (!this.accessToken) return null;

    try {
      const response = await fetch('https://api.calendly.com/event_types', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          duration: duration,
          description: description,
          profile: {
            uri: this.userUri,
          },
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to create Calendly event type:', error);
      return null;
    }
  }
}

// Universal Booking Manager
export class BookingManager {
  private stripe: StripePayments;
  private calendly: CalendlyBooking;

  constructor() {
    this.stripe = new StripePayments();
    this.calendly = new CalendlyBooking();
  }

  // Process event ticket booking
  async processEventBooking(bookingData: BookingData) {
    try {
      // Create customer
      const customer = await this.stripe.createCustomer(
        bookingData.customerEmail,
        bookingData.customerName
      );

      if (!customer) {
        throw new Error('Failed to create customer');
      }

      // Create payment intent
      const paymentIntent = await this.stripe.createPaymentIntent(
        bookingData.totalAmount * 100, // Stripe expects cents
        bookingData.currency.toLowerCase(),
        {
          event_id: bookingData.eventId,
          customer_email: bookingData.customerEmail,
          ticket_quantity: bookingData.ticketQuantity.toString(),
        }
      );

      if (!paymentIntent) {
        throw new Error('Failed to create payment intent');
      }

      return {
        success: true,
        paymentIntent: paymentIntent,
        customerId: customer.id,
      };
    } catch (error) {
      console.error('Failed to process booking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get consultation booking link
  async getConsultationLink(eventTypeId?: string) {
    const eventTypes = await this.calendly.getEventTypes();
    
    if (!eventTypes || eventTypes.length === 0) {
      return ''; // No Calendly event types configured
    }

    const targetEventType = eventTypeId
      ? eventTypes.find((et: any) => et.uri.includes(eventTypeId))
      : eventTypes[0];

    return targetEventType?.scheduling_url || '';
  }
}

export const bookingManager = new BookingManager();
export const stripePayments = new StripePayments();
export const calendlyBooking = new CalendlyBooking();
