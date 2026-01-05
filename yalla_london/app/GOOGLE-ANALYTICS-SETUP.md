# Google Analytics 4 Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Click **Admin** (gear icon)
3. Click **Create Property**
4. Enter:
   - Property name: `Yalla London`
   - Reporting time zone: `United Kingdom`
   - Currency: `British Pound (£)`
5. Click **Next** and complete business details

### Step 2: Create Data Stream

1. In your new property, click **Data Streams**
2. Click **Add stream** → **Web**
3. Enter:
   - Website URL: `yalla-london.com`
   - Stream name: `Yalla London Website`
4. Click **Create stream**
5. Copy your **Measurement ID** (starts with `G-`)

### Step 3: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **yalla-london** project
3. Go to **Settings** → **Environment Variables**
4. Add:
   ```
   Name: NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
   Value: G-XXXXXXXXXX (your Measurement ID)
   Environment: Production, Preview, Development
   ```
5. Click **Save**
6. Redeploy your site

### Step 4: Verify Installation

1. Visit https://yalla-london.com
2. Open browser DevTools → Network tab
3. Filter by `gtag` or `google`
4. You should see requests to `googletagmanager.com`

Or use Google Tag Assistant:
https://tagassistant.google.com/

---

## Enhanced Tracking (Already Implemented)

Your site automatically tracks:

### Page Views
- Every page navigation
- Language switches (EN/AR)
- URL parameters

### Engagement Metrics
- **Scroll depth**: 25%, 50%, 75%, 100%
- **Time on page**: Automatic tracking
- **Page load time**: Performance monitoring

### Conversions (Configure in GA4)
Set up these conversion events in GA4 → Configure → Events:

| Event Name | Mark as Conversion | Description |
|------------|-------------------|-------------|
| `newsletter_signup` | Yes | Email subscriptions |
| `booking_click` | Yes | Restaurant/event bookings |
| `contact_form` | Yes | Contact form submissions |
| `event_ticket` | Yes | Ticket purchases |

---

## Google Search Console Integration

### Step 1: Verify Site Ownership
1. Go to [Search Console](https://search.google.com/search-console)
2. Add property: `yalla-london.com`
3. Choose **URL prefix** method
4. Verify via **HTML tag** method
5. Copy the verification code

### Step 2: Add Verification Code

Update in `.env.local` or Vercel:
```
GOOGLE_SITE_VERIFICATION=your-verification-code
```

Or add to `app/layout.tsx`:
```html
<meta name="google-site-verification" content="your-verification-code" />
```

### Step 3: Link to GA4
1. In GA4 → Admin → Property → Search Console Links
2. Click **Link**
3. Select your Search Console property
4. Click **Submit**

---

## Custom Events You Can Track

Use these functions in your components:

```typescript
import { trackEvent, trackConversion } from '@/lib/integrations/google-analytics';

// Track button clicks
trackEvent('cta_click', 'engagement', 'hero_book_now');

// Track form submissions
trackConversion('newsletter_signup');

// Track booking actions
trackConversion('booking_click', 50, 'GBP'); // With value
```

---

## Dashboards to Create in GA4

### 1. Content Performance Dashboard
- **Metrics**: Page views, Avg. engagement time, Bounce rate
- **Dimensions**: Page title, Language, Device category
- **Filter**: Content pages only

### 2. Acquisition Dashboard
- **Metrics**: Users, Sessions, Engagement rate
- **Dimensions**: Source/medium, Country, City
- **Useful for**: Understanding traffic sources

### 3. Arabic vs English Dashboard
- **Metrics**: Users, Page views, Conversions
- **Dimensions**: Language (from URL parameter)
- **Filter**: `?lang=ar` vs default

---

## API Access (For Command Center)

To display GA4 data in your admin dashboard:

### Step 1: Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Analytics Data API**
4. Create **Service Account**
5. Download JSON key file

### Step 2: Grant Access
1. In GA4 → Admin → Property Access Management
2. Add service account email
3. Grant **Viewer** role

### Step 3: Add Environment Variables
```
GA4_PROPERTY_ID=123456789
GA4_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## Testing Checklist

- [ ] GA4 property created
- [ ] Measurement ID added to Vercel
- [ ] Page views tracking in Realtime report
- [ ] Scroll depth events firing
- [ ] Search Console linked
- [ ] Conversions configured

---

## Expected Data After Setup

| Metric | Where to Find |
|--------|---------------|
| Real-time visitors | GA4 → Reports → Realtime |
| Page views | GA4 → Reports → Engagement → Pages |
| Traffic sources | GA4 → Reports → Acquisition |
| Search queries | Search Console → Performance |
| Core Web Vitals | Search Console → Experience |

---

**Last Updated:** January 2026
