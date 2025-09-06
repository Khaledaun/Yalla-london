
// Notification System Integration
export interface Notification {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}

export class SlackNotifications {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('Slack webhook URL not configured');
      return false;
    }

    try {
      const color = this.getColor(notification.type);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color: color,
            title: `Yalla London: ${notification.title}`,
            text: notification.message,
            timestamp: Math.floor(Date.now() / 1000),
            fields: notification.data ? Object.entries(notification.data).map(([key, value]) => ({
              title: key,
              value: value.toString(),
              short: true,
            })) : undefined,
          }],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  private getColor(type: string): string {
    switch (type) {
      case 'success': return 'good';
      case 'warning': return 'warning';
      case 'error': return 'danger';
      default: return '#36a3f7';
    }
  }
}

export class DiscordNotifications {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('Discord webhook URL not configured');
      return false;
    }

    try {
      const embed = {
        title: notification.title,
        description: notification.message,
        color: this.getColor(notification.type),
        timestamp: new Date().toISOString(),
        author: {
          name: 'Yalla London Bot',
        },
        fields: notification.data ? Object.entries(notification.data).map(([key, value]) => ({
          name: key,
          value: value.toString(),
          inline: true,
        })) : undefined,
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      return false;
    }
  }

  private getColor(type: string): number {
    switch (type) {
      case 'success': return 0x00ff00;
      case 'warning': return 0xffff00;
      case 'error': return 0xff0000;
      default: return 0x7c3aed;
    }
  }
}

export class EmailNotifications {
  async send(notification: Notification, recipients: string[]): Promise<boolean> {
    const { emailMarketing } = await import('./email-marketing');
    
    const subject = `Yalla London Alert: ${notification.title}`;
    const htmlContent = `
      <div style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.data ? `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>Details:</h3>
            ${Object.entries(notification.data).map(([key, value]) => `
              <p><strong>${key}:</strong> ${value}</p>
            `).join('')}
          </div>
        ` : ''}
        <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated notification from Yalla London.
        </p>
      </div>
    `;

    try {
      for (const email of recipients) {
        // Use SendGrid for admin notifications
        const { SendGridAPI } = await import('./email-marketing');
        const sendgrid = new SendGridAPI();
        await sendgrid.sendEmail(email, subject, htmlContent);
      }
      return true;
    } catch (error) {
      console.error('Failed to send email notifications:', error);
      return false;
    }
  }
}

// Universal Notification Manager
export class NotificationManager {
  private slack: SlackNotifications;
  private discord: DiscordNotifications;
  private email: EmailNotifications;

  constructor() {
    this.slack = new SlackNotifications();
    this.discord = new DiscordNotifications();
    this.email = new EmailNotifications();
  }

  async send(notification: Notification, channels: ('slack' | 'discord' | 'email')[] = ['slack']) {
    const results: Record<string, boolean> = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'slack':
            results.slack = await this.slack.send(notification);
            break;
          case 'discord':
            results.discord = await this.discord.send(notification);
            break;
          case 'email':
                  // Send to admin email addresses
            const adminEmails = ['admin@yalla-london.com']; // Configure as needed
            results.email = await this.email.send(notification, adminEmails);
            break;
        }
      } catch (error) {
        console.error(`Failed to send notification via ${channel}:`, error);
        results[channel] = false;
      }
    }

    return results;
  }

  // Predefined notification types
  async notifyContentPublished(title: string, type: string, url: string) {
    return this.send({
      title: 'Content Published',
      message: `New ${type} "${title}" has been published successfully.`,
      type: 'success',
      data: { url, publishedAt: new Date().toISOString() },
    });
  }

  async notifyNewSubscriber(email: string, source: string) {
    return this.send({
      title: 'New Newsletter Subscriber',
      message: `Someone just subscribed to the newsletter!`,
      type: 'info',
      data: { email, source, subscribedAt: new Date().toISOString() },
    });
  }

  async notifyBooking(customerName: string, eventName: string, amount: number) {
    return this.send({
      title: 'New Booking Received',
      message: `${customerName} just booked "${eventName}"`,
      type: 'success',
      data: { 
        customer: customerName, 
        event: eventName, 
        amount: `£${amount}`,
        bookedAt: new Date().toISOString(),
      },
    });
  }

  async notifyError(error: string, context?: string) {
    return this.send({
      title: 'System Error',
      message: `An error occurred: ${error}`,
      type: 'error',
      data: context ? { context, errorAt: new Date().toISOString() } : undefined,
    });
  }

  async notifyPerformanceIssue(metric: string, value: number, threshold: number) {
    return this.send({
      title: 'Performance Alert',
      message: `${metric} is ${value}, which exceeds the threshold of ${threshold}`,
      type: 'warning',
      data: { metric, value, threshold, detectedAt: new Date().toISOString() },
    });
  }
}

export const notifications = new NotificationManager();
