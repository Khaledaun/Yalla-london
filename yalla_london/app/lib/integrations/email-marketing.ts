
// Email Marketing Integration (Multiple Providers)
export interface EmailSubscriber {
  email: string;
  firstName?: string;
  lastName?: string;
  language: 'en' | 'ar';
  source: string;
  tags?: string[];
}

export interface EmailCampaign {
  subject: string;
  content: string;
  segmentId?: string;
  scheduledTime?: Date;
}

// Mailchimp Integration
export class MailchimpAPI {
  private apiKey: string;
  private audienceId: string;
  private serverPrefix: string;

  constructor() {
    this.apiKey = process.env.MAILCHIMP_API_KEY || '';
    this.audienceId = process.env.MAILCHIMP_AUDIENCE_ID || '';
    this.serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX || '';
  }

  async addSubscriber(subscriber: EmailSubscriber) {
    if (!this.apiKey || !this.audienceId) {
      console.warn('Mailchimp credentials not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://${this.serverPrefix}.api.mailchimp.com/3.0/lists/${this.audienceId}/members`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: subscriber.email,
            status: 'subscribed',
            merge_fields: {
              FNAME: subscriber.firstName || '',
              LNAME: subscriber.lastName || '',
              LANGUAGE: subscriber.language,
            },
            tags: subscriber.tags || ['yalla-london-subscriber'],
          }),
        }
      );

      return await response.json();
    } catch (error) {
      console.error('Failed to add Mailchimp subscriber:', error);
      return null;
    }
  }

  async createCampaign(campaign: EmailCampaign) {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        `https://${this.serverPrefix}.api.mailchimp.com/3.0/campaigns`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'regular',
            recipients: {
              list_id: this.audienceId,
            },
            settings: {
              subject_line: campaign.subject,
              from_name: 'Zenitha Content Network',
              reply_to: 'hello@zenitha.luxury',
            },
          }),
        }
      );

      return await response.json();
    } catch (error) {
      console.error('Failed to create Mailchimp campaign:', error);
      return null;
    }
  }
}

// ConvertKit Integration
export class ConvertKitAPI {
  private apiKey: string;
  private formId: string;

  constructor() {
    this.apiKey = process.env.CONVERTKIT_API_KEY || '';
    this.formId = process.env.CONVERTKIT_FORM_ID || '';
  }

  async addSubscriber(subscriber: EmailSubscriber) {
    if (!this.apiKey || !this.formId) {
      console.warn('ConvertKit credentials not configured');
      return null;
    }

    try {
      const response = await fetch(`https://api.convertkit.com/v3/forms/${this.formId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          email: subscriber.email,
          first_name: subscriber.firstName,
          fields: {
            last_name: subscriber.lastName,
            language: subscriber.language,
            source: subscriber.source,
          },
          tags: subscriber.tags,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to add ConvertKit subscriber:', error);
      return null;
    }
  }
}

// SendGrid Integration
export class SendGridAPI {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
  }

  async addContact(subscriber: EmailSubscriber) {
    if (!this.apiKey) {
      console.warn('SendGrid API key not configured');
      return null;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: [{
            email: subscriber.email,
            first_name: subscriber.firstName,
            last_name: subscriber.lastName,
            custom_fields: {
              language: subscriber.language,
              source: subscriber.source,
            },
          }],
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to add SendGrid contact:', error);
      return null;
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    if (!this.apiKey) return null;

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }],
            subject: subject,
          }],
          from: { email: 'hello@zenitha.luxury', name: 'Zenitha Content Network' },
          content: [{
            type: 'text/html',
            value: htmlContent,
          }],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email via SendGrid:', error);
      return false;
    }
  }
}

// Universal Email Marketing Manager
export class EmailMarketing {
  private provider: 'mailchimp' | 'convertkit' | 'sendgrid';
  private mailchimp: MailchimpAPI;
  private convertkit: ConvertKitAPI;
  private sendgrid: SendGridAPI;

  constructor(provider: 'mailchimp' | 'convertkit' | 'sendgrid' = 'mailchimp') {
    this.provider = provider;
    this.mailchimp = new MailchimpAPI();
    this.convertkit = new ConvertKitAPI();
    this.sendgrid = new SendGridAPI();
  }

  async subscribe(subscriber: EmailSubscriber) {
    switch (this.provider) {
      case 'mailchimp':
        return await this.mailchimp.addSubscriber(subscriber);
      case 'convertkit':
        return await this.convertkit.addSubscriber(subscriber);
      case 'sendgrid':
        return await this.sendgrid.addContact(subscriber);
      default:
        console.error('Unknown email provider');
        return null;
    }
  }

  async sendWelcomeEmail(email: string, language: 'en' | 'ar') {
    const subject = language === 'en' 
      ? 'Welcome to Yalla London - Your Luxury Guide Awaits!'
      : 'مرحباً بك في يالا لندن - دليلك الفاخر في انتظارك!';

    const htmlContent = this.getWelcomeEmailTemplate(language);

    if (this.provider === 'sendgrid') {
      return await this.sendgrid.sendEmail(email, subject, htmlContent);
    }

    return false;
  }

  private getWelcomeEmailTemplate(language: 'en' | 'ar'): string {
    if (language === 'ar') {
      return `
        <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed; text-align: center;">مرحباً بك في يالا لندن!</h1>
          <p>شكراً لك على الانضمام إلى مجتمعنا الرائع من محبي السفر الفاخر.</p>
          <p>ستحصل قريباً على:</p>
          <ul>
            <li>دليل لندن الفاخر المجاني</li>
            <li>توصيات حصرية للمطاعم والفنادق</li>
            <li>نصائح من الداخل لأفضل التجارب</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yalla-london.com" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">استكشف الآن</a>
          </div>
        </div>
      `;
    }

    return `
      <div style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed; text-align: center;">Welcome to Yalla London!</h1>
        <p>Thank you for joining our amazing community of luxury travel enthusiasts.</p>
        <p>You'll soon receive:</p>
        <ul>
          <li>Your free London luxury guide</li>
          <li>Exclusive restaurant and hotel recommendations</li>
          <li>Insider tips for the best experiences</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://yalla-london.com" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Explore Now</a>
        </div>
      </div>
    `;
  }
}

export const emailMarketing = new EmailMarketing();
