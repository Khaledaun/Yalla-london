/**
 * Pre-built email templates for the Email Template Builder.
 *
 * Each template is an array of EmailBlock objects with realistic
 * travel-site content and brand-aware default styling.
 */

export interface EmailBlock {
  id: string
  type:
    | 'header'
    | 'text'
    | 'image'
    | 'button'
    | 'divider'
    | 'columns'
    | 'footer'
    | 'social-links'
  content: Record<string, unknown>
  styles?: Record<string, string>
}

let blockCounter = 0
function uid(): string {
  blockCounter += 1
  return `tmpl-${blockCounter}-${Date.now().toString(36)}`
}

// ---------------------------------------------------------------------------
// Brand defaults - reference primary/secondary from config/sites.ts
// ---------------------------------------------------------------------------
const BRAND = {
  primaryColor: '#1C1917',
  secondaryColor: '#C8322B',
  accentGold: '#D4AF37',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  darkGray: '#374151',
  textColor: '#1F2937',
  mutedText: '#6B7280',
  logoUrl: '/images/yalla-london-logo.png',
  siteName: 'Yalla London',
  siteUrl: 'https://yalla-london.com',
  supportEmail: 'hello@yalla-london.com',
  companyAddress: 'Zenitha.Luxury LLC, Delaware, United States',
} as const

// ---------------------------------------------------------------------------
// Newsletter template
// ---------------------------------------------------------------------------
const newsletter: EmailBlock[] = [
  {
    id: uid(),
    type: 'header',
    content: {
      title: 'Yalla London Weekly',
      subtitle: 'Your curated guide to luxury London experiences',
      logoUrl: BRAND.logoUrl,
    },
    styles: {
      backgroundColor: BRAND.primaryColor,
      color: BRAND.white,
      padding: '32px 24px',
      textAlign: 'center',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:16px;line-height:1.6;color:#1F2937;">Assalamu Alaikum,</p><p style="font-size:16px;line-height:1.6;color:#1F2937;">This week we have handpicked the finest London experiences for you -- from a newly opened halal fine-dining restaurant in Mayfair to an exclusive Harrods shopping guide for Gulf visitors.</p>',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'image',
    content: {
      src: '/images/newsletter/london-skyline.jpg',
      alt: 'London skyline at sunset viewed from the Thames',
      linkUrl: 'https://yalla-london.com/blog/london-skyline-guide',
      width: '100%',
    },
    styles: {
      padding: '0 24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'columns',
    content: {
      columns: [
        {
          heading: 'Halal Fine Dining in Mayfair',
          text: 'Discover 5 newly reviewed restaurants serving exceptional halal cuisine in one of London\'s most prestigious neighbourhoods.',
          linkUrl: 'https://yalla-london.com/blog/halal-mayfair',
          linkText: 'Read More',
          imageUrl: '/images/newsletter/mayfair-dining.jpg',
        },
        {
          heading: 'Harrods Shopping Guide 2026',
          text: 'Your complete guide to navigating Harrods like a VIP -- personal shoppers, prayer rooms, and exclusive Arab-friendly services.',
          linkUrl: 'https://yalla-london.com/blog/harrods-guide',
          linkText: 'Read More',
          imageUrl: '/images/newsletter/harrods-guide.jpg',
        },
      ],
    },
    styles: {
      padding: '24px',
      gap: '16px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'divider',
    content: {},
    styles: {
      padding: '0 24px',
      borderColor: '#E5E7EB',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<h2 style="font-size:20px;font-weight:700;color:#1C1917;margin-bottom:8px;">This Week\'s Top Pick</h2><p style="font-size:16px;line-height:1.6;color:#1F2937;">The Shard observation deck has launched an exclusive Ramadan sunset experience. Book through our partner link for 15% off.</p>',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'button',
    content: {
      text: 'Book The Shard Experience',
      url: 'https://yalla-london.com/go/shard-ramadan',
    },
    styles: {
      backgroundColor: BRAND.secondaryColor,
      color: BRAND.white,
      padding: '14px 32px',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '16px',
    },
  },
  {
    id: uid(),
    type: 'social-links',
    content: {
      links: [
        { platform: 'instagram', url: 'https://instagram.com/yallalondon' },
        { platform: 'twitter', url: 'https://x.com/yallalondon' },
        { platform: 'facebook', url: 'https://facebook.com/yallalondon' },
        { platform: 'tiktok', url: 'https://tiktok.com/@yallalondon' },
      ],
    },
    styles: {
      padding: '24px',
      textAlign: 'center',
      backgroundColor: BRAND.lightGray,
    },
  },
  {
    id: uid(),
    type: 'footer',
    content: {
      companyName: BRAND.siteName,
      address: BRAND.companyAddress,
      unsubscribeUrl: '{{unsubscribe_url}}',
      preferencesUrl: '{{preferences_url}}',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.lightGray,
      color: BRAND.mutedText,
      fontSize: '12px',
      textAlign: 'center',
    },
  },
]

// ---------------------------------------------------------------------------
// Welcome template
// ---------------------------------------------------------------------------
const welcome: EmailBlock[] = [
  {
    id: uid(),
    type: 'header',
    content: {
      title: 'Welcome to Yalla London',
      subtitle: '',
      logoUrl: BRAND.logoUrl,
    },
    styles: {
      backgroundColor: BRAND.primaryColor,
      color: BRAND.white,
      padding: '40px 24px',
      textAlign: 'center',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<h1 style="font-size:28px;font-weight:700;color:#1C1917;text-align:center;margin-bottom:16px;">Marhaba! Welcome aboard.</h1><p style="font-size:16px;line-height:1.7;color:#374151;text-align:center;">You have joined thousands of Arab travellers who trust Yalla London for authentic, halal-friendly travel advice in the heart of the UK capital.</p>',
    },
    styles: {
      padding: '32px 24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'image',
    content: {
      src: '/images/newsletter/welcome-london.jpg',
      alt: 'Tower Bridge illuminated at night',
      width: '100%',
    },
    styles: {
      padding: '0 24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:16px;line-height:1.7;color:#374151;">Here is what you can expect from us:</p><ul style="font-size:15px;line-height:1.8;color:#374151;padding-left:20px;"><li>Weekly curated guides to London\'s finest halal restaurants</li><li>Exclusive hotel deals through our booking partners</li><li>Seasonal event guides tailored for Arab visitors</li><li>Insider tips from locals who know the city intimately</li></ul>',
    },
    styles: {
      padding: '16px 24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'button',
    content: {
      text: 'Explore Our Latest Guides',
      url: 'https://yalla-london.com/blog',
    },
    styles: {
      backgroundColor: BRAND.secondaryColor,
      color: BRAND.white,
      padding: '14px 40px',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '16px',
    },
  },
  {
    id: uid(),
    type: 'divider',
    content: {},
    styles: {
      padding: '8px 24px',
      borderColor: '#E5E7EB',
    },
  },
  {
    id: uid(),
    type: 'footer',
    content: {
      companyName: BRAND.siteName,
      address: BRAND.companyAddress,
      unsubscribeUrl: '{{unsubscribe_url}}',
      preferencesUrl: '{{preferences_url}}',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.lightGray,
      color: BRAND.mutedText,
      fontSize: '12px',
      textAlign: 'center',
    },
  },
]

// ---------------------------------------------------------------------------
// Deal Alert template
// ---------------------------------------------------------------------------
const dealAlert: EmailBlock[] = [
  {
    id: uid(),
    type: 'header',
    content: {
      title: 'Exclusive Deal Alert',
      subtitle: 'Limited time offer for Yalla London subscribers',
      logoUrl: BRAND.logoUrl,
    },
    styles: {
      backgroundColor: BRAND.secondaryColor,
      color: BRAND.white,
      padding: '32px 24px',
      textAlign: 'center',
    },
  },
  {
    id: uid(),
    type: 'image',
    content: {
      src: '/images/newsletter/hotel-deal.jpg',
      alt: 'Luxury hotel suite with London cityscape view',
      linkUrl: 'https://yalla-london.com/go/hotel-deal',
      width: '100%',
    },
    styles: {
      padding: '0',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<h2 style="font-size:24px;font-weight:700;color:#1C1917;margin-bottom:8px;">The Shangri-La at The Shard</h2><p style="font-size:14px;color:#C8322B;font-weight:600;margin-bottom:12px;">SAVE UP TO 30% -- ENDS FRIDAY</p><p style="font-size:16px;line-height:1.6;color:#374151;">Experience London from the 34th floor with panoramic views of the Thames. This halal-friendly five-star hotel offers Arabic-speaking concierge, prayer mats in every room, and a dedicated halal kitchen.</p><ul style="font-size:15px;line-height:1.8;color:#374151;padding-left:20px;"><li>Deluxe City View Room from <strong>&pound;285/night</strong> (was &pound;410)</li><li>Complimentary breakfast at TING restaurant</li><li>Late checkout guaranteed until 2pm</li><li>Free cancellation up to 48 hours before</li></ul>',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'button',
    content: {
      text: 'Book Now -- Save 30%',
      url: 'https://yalla-london.com/go/shangri-la-deal',
    },
    styles: {
      backgroundColor: BRAND.accentGold,
      color: BRAND.primaryColor,
      padding: '16px 40px',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: '700',
      fontSize: '18px',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:13px;color:#6B7280;text-align:center;margin-top:8px;">This is an affiliate offer. Yalla London may earn a commission at no extra cost to you.</p>',
    },
    styles: {
      padding: '0 24px 16px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'footer',
    content: {
      companyName: BRAND.siteName,
      address: BRAND.companyAddress,
      unsubscribeUrl: '{{unsubscribe_url}}',
      preferencesUrl: '{{preferences_url}}',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.lightGray,
      color: BRAND.mutedText,
      fontSize: '12px',
      textAlign: 'center',
    },
  },
]

// ---------------------------------------------------------------------------
// Article Notification template
// ---------------------------------------------------------------------------
const articleNotification: EmailBlock[] = [
  {
    id: uid(),
    type: 'header',
    content: {
      title: 'New on Yalla London',
      subtitle: '',
      logoUrl: BRAND.logoUrl,
    },
    styles: {
      backgroundColor: BRAND.primaryColor,
      color: BRAND.white,
      padding: '24px',
      textAlign: 'center',
    },
  },
  {
    id: uid(),
    type: 'image',
    content: {
      src: '/images/newsletter/article-hero.jpg',
      alt: 'Article featured image',
      linkUrl: 'https://yalla-london.com/blog/latest-article',
      width: '100%',
    },
    styles: {
      padding: '0',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#C8322B;margin-bottom:8px;font-weight:600;">Restaurants &amp; Dining</p><h2 style="font-size:24px;font-weight:700;color:#1C1917;line-height:1.3;margin-bottom:12px;">The 12 Best Halal Restaurants in Knightsbridge You Need to Try in 2026</h2><p style="font-size:16px;line-height:1.6;color:#374151;">From Michelin-starred Lebanese cuisine to hidden gem Pakistani grills, we spent three weeks eating our way through Knightsbridge to bring you this definitive halal dining guide. Every restaurant personally visited and reviewed.</p>',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'button',
    content: {
      text: 'Read the Full Article',
      url: 'https://yalla-london.com/blog/halal-restaurants-knightsbridge',
    },
    styles: {
      backgroundColor: BRAND.primaryColor,
      color: BRAND.white,
      padding: '14px 36px',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '16px',
    },
  },
  {
    id: uid(),
    type: 'divider',
    content: {},
    styles: {
      padding: '8px 24px',
      borderColor: '#E5E7EB',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:14px;color:#6B7280;text-align:center;">You are receiving this because you subscribed to new article notifications on Yalla London.</p>',
    },
    styles: {
      padding: '8px 24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'footer',
    content: {
      companyName: BRAND.siteName,
      address: BRAND.companyAddress,
      unsubscribeUrl: '{{unsubscribe_url}}',
      preferencesUrl: '{{preferences_url}}',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.lightGray,
      color: BRAND.mutedText,
      fontSize: '12px',
      textAlign: 'center',
    },
  },
]

// ---------------------------------------------------------------------------
// Transactional template (receipt / confirmation)
// ---------------------------------------------------------------------------
const transactional: EmailBlock[] = [
  {
    id: uid(),
    type: 'header',
    content: {
      title: 'Booking Confirmation',
      subtitle: '',
      logoUrl: BRAND.logoUrl,
    },
    styles: {
      backgroundColor: BRAND.primaryColor,
      color: BRAND.white,
      padding: '24px',
      textAlign: 'center',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:16px;line-height:1.6;color:#1F2937;">Dear {{customer_name}},</p><p style="font-size:16px;line-height:1.6;color:#1F2937;">Thank you for booking through Yalla London. Here are your confirmation details:</p>',
    },
    styles: {
      padding: '24px 24px 8px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<table style="width:100%;border-collapse:collapse;font-size:15px;color:#374151;"><tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:12px 0;font-weight:600;">Booking Reference</td><td style="padding:12px 0;text-align:right;">{{booking_ref}}</td></tr><tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:12px 0;font-weight:600;">Property</td><td style="padding:12px 0;text-align:right;">{{hotel_name}}</td></tr><tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:12px 0;font-weight:600;">Check-in</td><td style="padding:12px 0;text-align:right;">{{checkin_date}}</td></tr><tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:12px 0;font-weight:600;">Check-out</td><td style="padding:12px 0;text-align:right;">{{checkout_date}}</td></tr><tr style="border-bottom:1px solid #E5E7EB;"><td style="padding:12px 0;font-weight:600;">Guests</td><td style="padding:12px 0;text-align:right;">{{guest_count}}</td></tr><tr><td style="padding:12px 0;font-weight:700;font-size:16px;">Total Paid</td><td style="padding:12px 0;text-align:right;font-weight:700;font-size:16px;color:#1C1917;">{{total_amount}}</td></tr></table>',
    },
    styles: {
      padding: '8px 24px 24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'divider',
    content: {},
    styles: {
      padding: '0 24px',
      borderColor: '#E5E7EB',
    },
  },
  {
    id: uid(),
    type: 'text',
    content: {
      html: '<p style="font-size:15px;line-height:1.6;color:#374151;">Need to make changes? Contact us at <a href="mailto:hello@yalla-london.com" style="color:#C8322B;">hello@yalla-london.com</a> or reply directly to this email.</p>',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.white,
    },
  },
  {
    id: uid(),
    type: 'button',
    content: {
      text: 'View Booking Details',
      url: '{{booking_url}}',
    },
    styles: {
      backgroundColor: BRAND.primaryColor,
      color: BRAND.white,
      padding: '14px 36px',
      borderRadius: '8px',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: '16px',
    },
  },
  {
    id: uid(),
    type: 'footer',
    content: {
      companyName: BRAND.siteName,
      address: BRAND.companyAddress,
      unsubscribeUrl: '{{unsubscribe_url}}',
      preferencesUrl: '{{preferences_url}}',
    },
    styles: {
      padding: '24px',
      backgroundColor: BRAND.lightGray,
      color: BRAND.mutedText,
      fontSize: '12px',
      textAlign: 'center',
    },
  },
]

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const EMAIL_TEMPLATES: Record<string, { name: string; description: string; blocks: EmailBlock[] }> = {
  newsletter: {
    name: 'Weekly Newsletter',
    description: 'Header, article grid with images, featured pick, and social links footer',
    blocks: newsletter,
  },
  welcome: {
    name: 'Welcome Email',
    description: 'Logo, greeting message, value proposition list, and CTA button',
    blocks: welcome,
  },
  dealAlert: {
    name: 'Deal Alert',
    description: 'Hero image, deal details with pricing, bold CTA, and affiliate disclosure',
    blocks: dealAlert,
  },
  articleNotification: {
    name: 'Article Notification',
    description: 'Featured image, article preview with category badge, and read more button',
    blocks: articleNotification,
  },
  transactional: {
    name: 'Booking Confirmation',
    description: 'Confirmation details table, booking reference, and support contact',
    blocks: transactional,
  },
}

export { BRAND as EMAIL_BRAND_DEFAULTS }
