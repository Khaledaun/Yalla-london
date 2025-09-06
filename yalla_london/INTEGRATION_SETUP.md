
# 🚀 Yalla London - Phase 2 Integration Setup Guide

This comprehensive guide will help you configure all the Phase 2 integrations for your Yalla London website. Each integration is optional, but together they create a powerful automated marketing and business system.

## 📋 Quick Setup Checklist

- [ ] Google Analytics 4
- [ ] Google Search Console  
- [ ] Email Marketing (choose one: Mailchimp, ConvertKit, or SendGrid)
- [ ] Social Media APIs (Instagram & TikTok)
- [ ] Payment System (Stripe)
- [ ] Booking System (Calendly)
- [ ] Notification System (Slack/Discord)
- [ ] Performance Monitoring (Sentry)

---

## 🔍 Analytics & SEO

### Google Analytics 4
**Purpose:** Track website performance, user behavior, and conversions

1. **Create GA4 Property:**
   - Go to [Google Analytics](https://analytics.google.com)
   - Create a new GA4 property for your website
   - Copy your Measurement ID (format: G-XXXXXXXXXX)

2. **Configure Environment Variable:**
   ```bash
   NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
   ```

3. **Set up Goals:**
   - Newsletter signups
   - Event bookings
   - Contact form submissions
   - External link clicks

### Google Search Console
**Purpose:** Monitor search performance and submit URLs for indexing

1. **Add Your Website:**
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add your website property
   - Verify ownership using HTML tag method

2. **Create Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable "Google Search Console API"
   - Create service account credentials
   - Download JSON key file

3. **Configure Environment Variables:**
   ```bash
   GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
   ```

---

## 📧 Email Marketing (Choose One)

### Option 1: Mailchimp (Recommended)
**Purpose:** Newsletter management and automated email campaigns

1. **Setup:**
   - Create [Mailchimp account](https://mailchimp.com)
   - Create an audience/list
   - Generate API key from Account → Extras → API keys

2. **Configure:**
   ```bash
   MAILCHIMP_API_KEY="your_api_key_here"
   MAILCHIMP_AUDIENCE_ID="your_audience_id"
   MAILCHIMP_SERVER_PREFIX="us1"  # Check your API key for correct prefix
   ```

### Option 2: ConvertKit
**Purpose:** Creator-focused email marketing

1. **Setup:**
   - Create [ConvertKit account](https://convertkit.com)
   - Create a form
   - Get API key from Account settings

2. **Configure:**
   ```bash
   CONVERTKIT_API_KEY="your_api_key_here"
   CONVERTKIT_FORM_ID="your_form_id"
   ```

### Option 3: SendGrid
**Purpose:** Transactional and marketing emails

1. **Setup:**
   - Create [SendGrid account](https://sendgrid.com)
   - Generate API key with full access
   - Verify sender identity

2. **Configure:**
   ```bash
   SENDGRID_API_KEY="SG.your_api_key_here"
   ```

---

## 📱 Social Media Integration

### Instagram Business API
**Purpose:** Display Instagram feed on website and auto-posting

1. **Prerequisites:**
   - Instagram Business account
   - Facebook Page connected to Instagram
   - Facebook Developer account

2. **Setup:**
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Create app with Instagram Basic Display
   - Generate access token
   - Get your Instagram Business Account ID

3. **Configure:**
   ```bash
   INSTAGRAM_ACCESS_TOKEN="your_access_token_here"
   INSTAGRAM_BUSINESS_ACCOUNT_ID="your_business_account_id"
   ```

### TikTok for Business API
**Purpose:** Auto-upload TikTok videos (optional)

1. **Setup:**
   - Apply for [TikTok for Business](https://ads.tiktok.com/marketing_api/homepage)
   - Get approved for Content Posting API access
   - Create app and get credentials

2. **Configure:**
   ```bash
   TIKTOK_CLIENT_KEY="your_client_key_here"
   TIKTOK_CLIENT_SECRET="your_client_secret_here"
   TIKTOK_ACCESS_TOKEN="your_access_token_here"
   ```

---

## 💳 Payment & Booking System

### Stripe Payment Processing
**Purpose:** Handle event ticket payments and bookings

1. **Setup:**
   - Create [Stripe account](https://stripe.com)
   - Complete business verification
   - Get API keys from Dashboard → Developers → API keys

2. **Configure:**
   ```bash
   STRIPE_PUBLISHABLE_KEY="pk_live_your_publishable_key"
   STRIPE_SECRET_KEY="sk_live_your_secret_key"
   STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
   ```

3. **Set up Webhooks:**
   - Add webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Calendly Integration
**Purpose:** Consultation booking system

1. **Setup:**
   - Create [Calendly account](https://calendly.com)
   - Set up event types for consultations
   - Generate API token from Integrations → API & Webhooks

2. **Configure:**
   ```bash
   CALENDLY_ACCESS_TOKEN="your_access_token_here"
   CALENDLY_USER_URI="https://api.calendly.com/users/your_user_id"
   ```

---

## 🔔 Notification Systems (Choose One or Both)

### Slack Notifications
**Purpose:** Get notified about bookings, subscriptions, and errors

1. **Setup:**
   - Create Slack workspace or use existing
   - Create channel for notifications (e.g., #yalla-london-alerts)
   - Add "Incoming Webhooks" app to your workspace
   - Configure webhook for your channel

2. **Configure:**
   ```bash
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

### Discord Notifications
**Purpose:** Alternative to Slack for notifications

1. **Setup:**
   - Create Discord server or use existing
   - Create channel for notifications
   - Go to Channel Settings → Integrations → Webhooks
   - Create webhook and copy URL

2. **Configure:**
   ```bash
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
   ```

---

## 📊 Performance Monitoring

### Sentry Error Tracking
**Purpose:** Monitor application errors and performance issues

1. **Setup:**
   - Create [Sentry account](https://sentry.io)
   - Create new project for Next.js
   - Copy DSN from project settings

2. **Configure:**
   ```bash
   SENTRY_DSN="https://your_dsn@sentry.io/project_id"
   ```

---

## 🤖 Automated Content Publishing

### Content Scheduling Configuration
The system is pre-configured to automatically generate and publish content. You can customize the schedule:

```bash
CONTENT_PUBLISHING_SCHEDULE="0 9,21 * * *"  # 9AM and 9PM daily
MIN_HOURS_BETWEEN_POSTS=7
```

**How it works:**
1. System generates blog posts, Instagram content, and TikTok scripts using AI
2. Content is scheduled based on optimal posting times
3. Automatically publishes across platforms
4. Submits new blog posts to Google for indexing
5. Sends notifications when content goes live

---

## 🚀 Deployment & Testing

### Testing Individual Integrations

1. **Newsletter Signup:** Visit homepage, submit email
2. **Analytics:** Check GA4 real-time reports
3. **Search Console:** Publish new blog post, check indexing
4. **Instagram Feed:** API will display recent posts
5. **Booking System:** Try booking an event
6. **Notifications:** Should receive Slack/Discord alerts

### Production Checklist

- [ ] All environment variables set
- [ ] Webhooks configured and tested
- [ ] Payment processing in live mode
- [ ] Analytics tracking working
- [ ] Email deliverability configured
- [ ] SSL certificate installed
- [ ] Domain verified with all services

---

## 🛠️ Advanced Configuration

### Custom Email Templates
Edit welcome email templates in:
```
/lib/integrations/email-marketing.ts
```

### Notification Customization
Modify notification triggers in:
```
/lib/integrations/notifications.ts
```

### Content Generation Rules
Adjust AI prompts and scheduling in:
```
/lib/integrations/content-scheduler.ts
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Google APIs not working:** Ensure service account has correct permissions
2. **Email delivery problems:** Check domain verification and DNS records
3. **Payment failures:** Verify Stripe webhook endpoints
4. **Instagram feed empty:** Check access token expiration
5. **Content not publishing:** Check cron job configuration

### Getting Help

- Check browser console for JavaScript errors
- Review server logs for API errors
- Test API endpoints individually using tools like Postman
- Verify environment variables are loaded correctly

---

## 🎯 Success Metrics to Track

Once configured, monitor these KPIs in your analytics dashboard:

- **Newsletter Growth:** Subscribers per week
- **Booking Conversions:** Event bookings per visitor
- **Content Performance:** Blog views, social engagement
- **Revenue Tracking:** Booking values and trends
- **User Experience:** Page load times, bounce rates

---

*This completes the comprehensive setup for Phase 2 integrations. Each integration is modular, so you can implement them gradually based on your priorities and resources.*
