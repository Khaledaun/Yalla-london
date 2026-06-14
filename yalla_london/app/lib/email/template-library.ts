/**
 * Yalla London Email Template Library
 *
 * 10 production-ready, email-client-compatible HTML templates.
 * Table-based layout for Gmail, Outlook, Apple Mail, Yahoo.
 * All styles inline. Supports merge tags ({{first_name}}, {{email}}, etc.)
 *
 * Usage:
 *   POST /api/admin/email-templates { action: "seed_templates", site: "yalla-london" }
 *   OR: npx tsx scripts/seed-email-templates.ts
 */

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const YEAR = new Date().getFullYear();

interface BrandVars {
  name: string;
  domain: string;
  siteUrl: string;
  logo: string;
  hero: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  bg: string;
  surface: string;
  border: string;
}

function getVars(siteId: string): BrandVars {
  // Yalla London defaults — extend for other sites later
  const domain = "www.yalla-london.com";
  const siteUrl = `https://${domain}`;
  return {
    name: "Yalla London",
    domain,
    siteUrl,
    logo: `${siteUrl}/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png`,
    hero: `${siteUrl}/images/hero/tower-bridge.jpg`,
    primary: "#C8322B",
    secondary: "#C49A2A",
    accent: "#3B7EA1",
    text: "#1C1917",
    muted: "#78716C",
    bg: "#FAF8F4",
    surface: "#FFFFFF",
    border: "#D6D0C4",
  };
}

// ─── HTML building blocks ──────────────────────────────────────

function wrap(b: BrandVars, title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${b.bg};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${b.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background-color:${b.surface};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
${body}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heroImg(b: BrandVars, alt: string): string {
  return `          <tr>
            <td style="padding:0;text-align:center;">
              <a href="${b.siteUrl}" target="_blank" style="display:block;text-decoration:none;">
                <img src="${b.hero}" width="580" alt="${alt}" style="display:block;width:100%;max-width:580px;height:auto;min-height:200px;border:0;outline:none;object-fit:cover;" />
              </a>
            </td>
          </tr>`;
}

function logoRow(b: BrandVars): string {
  return `          <tr>
            <td style="padding:28px 40px 4px;text-align:center;">
              <a href="${b.siteUrl}" target="_blank" style="text-decoration:none;">
                <img src="${b.logo}" width="64" height="64" alt="${b.name} logo" style="display:inline-block;width:64px;height:64px;border:0;border-radius:50%;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 0;text-align:center;">
              <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${b.secondary};">${b.name}</p>
            </td>
          </tr>`;
}

function accentLine(b: BrandVars): string {
  return `          <tr>
            <td style="padding:16px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:2px;background:${b.primary};width:33.33%;"></td>
                  <td style="height:2px;background:${b.secondary};width:33.34%;"></td>
                  <td style="height:2px;background:${b.accent};width:33.33%;"></td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function heading(b: BrandVars, text: string): string {
  return `          <tr>
            <td style="padding:24px 40px 8px;text-align:left;">
              <p style="margin:0;font-family:${FONT};font-size:22px;font-weight:700;color:${b.text};">${text}</p>
            </td>
          </tr>`;
}

function para(text: string): string {
  return `          <tr>
            <td style="padding:4px 40px 16px;text-align:left;">
              <p style="margin:0;font-family:${FONT};font-size:15px;color:#4B5563;line-height:1.7;">${text}</p>
            </td>
          </tr>`;
}

function cta(b: BrandVars, text: string, url: string, color?: string): string {
  const c = color || b.primary;
  return `          <tr>
            <td style="padding:8px 40px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:${c};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="${c}" fillcolor="${c}">
                      <w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${text}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${url}" style="display:inline-block;padding:14px 40px;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;letter-spacing:0.3px;" target="_blank">${text}</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function footer(b: BrandVars): string {
  return `          <tr>
            <td style="padding:20px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;color:#9CA3AF;">&copy; ${YEAR} Zenitha.Luxury LLC. All rights reserved.</p>
              <p style="margin:0;font-family:${FONT};font-size:11px;">
                <a href="${b.siteUrl}" style="color:${b.accent};text-decoration:none;">${b.domain}</a>
                &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                <a href="{{unsubscribe_url}}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>`;
}

function label(b: BrandVars, text: string): string {
  return `          <tr>
            <td style="padding:0 40px 8px;text-align:left;">
              <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${b.secondary};">${text}</p>
            </td>
          </tr>`;
}

function card(b: BrandVars, title: string, excerpt: string, url: string): string {
  return `          <tr>
            <td style="padding:8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${b.border};border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 6px;font-family:${FONT};font-size:16px;font-weight:700;color:${b.text};"><a href="${url}" style="color:${b.text};text-decoration:none;">${title}</a></p>
                    <p style="margin:0 0 12px;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">${excerpt}</p>
                    <a href="${url}" style="font-family:${FONT};font-size:13px;font-weight:700;color:${b.primary};text-decoration:none;">Read more &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function spacer(h: number = 16): string {
  return `          <tr><td style="height:${h}px;"></td></tr>`;
}

function closing(b: BrandVars, text: string): string {
  return `          <tr>
            <td style="padding:0 40px 28px;text-align:left;">
              <p style="margin:0;font-family:${FONT};font-size:14px;color:#6B7280;line-height:1.6;">${text}<br /><strong style="color:${b.text};">The ${b.name} Team</strong></p>
            </td>
          </tr>`;
}

function numberedItem(b: BrandVars, num: number, color: string, title: string, desc: string, isLast: boolean): string {
  return `                <tr>
                  <td style="padding:14px 0;${isLast ? "" : `border-bottom:1px solid rgba(0,0,0,0.06);`}">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="52" style="vertical-align:top;padding-right:16px;">
                          <div style="width:44px;height:44px;border-radius:50%;background:${color};text-align:center;line-height:44px;font-size:18px;font-weight:700;color:#FFFFFF;">${num}</div>
                        </td>
                        <td>
                          <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};">${title}</p>
                          <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">${desc}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
}

// ─── Template definitions ──────────────────────────────────────

export interface TemplateDef {
  name: string;
  type: string;
  subject: string;
  description: string;
  html: string;
}

export function getYallaLondonTemplates(siteId: string = "yalla-london"): TemplateDef[] {
  const b = getVars(siteId);

  return [
    // 1. Weekly Newsletter / Digest
    {
      name: "Weekly Digest",
      type: "newsletter",
      subject: "Your Week in London — Top Picks from {{site_name}}",
      description: "Weekly roundup of the best new articles, trending topics, and insider tips. Sent every Monday morning.",
      html: wrap(b, "Your Week in London", [
        heroImg(b, "London skyline"),
        logoRow(b),
        accentLine(b),
        heading(b, "Hi {{first_name}}, here's your weekly roundup"),
        para("A curated selection of the best guides, reviews, and insider tips published this week. From luxury hotels to hidden dining gems — everything you need for an extraordinary London experience."),
        label(b, "This week's highlights"),
        card(b, "The 10 Best Luxury Hotels in Mayfair", "Our honest reviews of the finest five-star hotels in London's most prestigious neighbourhood, including halal-friendly options.", `${b.siteUrl}/blog`),
        card(b, "Where to Find the Best Afternoon Tea in London", "From the Ritz to hidden gems — a connoisseur's guide to London's finest afternoon tea experiences.", `${b.siteUrl}/blog`),
        card(b, "A Weekend in Knightsbridge: The Ultimate Itinerary", "48 hours of luxury shopping, world-class dining, and cultural treasures in one of London's most elegant districts.", `${b.siteUrl}/blog`),
        spacer(8),
        cta(b, "See All Articles", `${b.siteUrl}/blog`),
        closing(b, "Happy reading,"),
        footer(b),
      ].join("\n")),
    },

    // 2. New Article Alert
    {
      name: "New Article Alert",
      type: "notification",
      subject: "New Guide Published — Don't Miss This",
      description: "Sent immediately when a new high-quality article is published. Single article focus with strong CTA.",
      html: wrap(b, "New Article Published", [
        heroImg(b, "New guide from Yalla London"),
        logoRow(b),
        accentLine(b),
        heading(b, "{{first_name}}, we just published something you'll love"),
        para("A brand-new guide is live on Yalla London. We've done the research, visited the spots, and put together everything you need to know — so you don't have to."),
        label(b, "Just published"),
        card(b, "New Guide: [Article Title]", "An in-depth look at one of London's best-kept secrets. Insider tips, honest reviews, and practical advice from our team on the ground.", `${b.siteUrl}/blog`),
        spacer(8),
        cta(b, "Read the Full Guide", `${b.siteUrl}/blog`),
        closing(b, "Enjoy the read,"),
        footer(b),
      ].join("\n")),
    },

    // 3. Exclusive Offer / Promotion
    {
      name: "Exclusive Offer",
      type: "campaign",
      subject: "An Exclusive Offer for You, {{first_name}}",
      description: "Promotional email for limited-time hotel deals, experience discounts, or partner offers. Features urgency elements.",
      html: wrap(b, "Exclusive Offer", [
        `          <tr>
            <td style="padding:0;text-align:center;background:${b.primary};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:40px 40px 32px;text-align:center;">
                    <img src="${b.logo}" width="56" height="56" alt="${b.name}" style="display:inline-block;width:56px;height:56px;border:0;border-radius:50%;margin-bottom:16px;" />
                    <p style="margin:0 0 8px;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${b.secondary};">Exclusive for subscribers</p>
                    <p style="margin:0;font-family:${FONT};font-size:28px;font-weight:700;color:#FFFFFF;line-height:1.3;">Save on Your Next London Hotel Stay</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        accentLine(b),
        heading(b, "{{first_name}}, this one's just for you"),
        para("We've partnered with some of London's finest hotels to bring you an exclusive booking offer. For a limited time, enjoy special rates at hand-picked luxury properties — available only through Yalla London."),
        `          <tr>
            <td style="padding:8px 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bg};border-radius:8px;border:1px solid ${b.border};">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${b.secondary};">Limited time</p>
                    <p style="margin:0 0 8px;font-family:${FONT};font-size:24px;font-weight:700;color:${b.primary};">Up to 20% Off</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;color:${b.muted};">Select luxury hotels in Mayfair, Knightsbridge &amp; Kensington</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        spacer(8),
        cta(b, "View the Offer", `${b.siteUrl}/hotels`),
        para("This offer is available for a limited period and subject to availability. Book early for the best selection."),
        closing(b, "Best regards,"),
        footer(b),
      ].join("\n")),
    },

    // 4. Event Invitation
    {
      name: "Event Invitation",
      type: "campaign",
      subject: "You're Invited — A Special London Experience",
      description: "Invitation to curated events, seasonal happenings, or exclusive experiences in London. Includes date, location, and RSVP CTA.",
      html: wrap(b, "Event Invitation", [
        heroImg(b, "London event"),
        logoRow(b),
        accentLine(b),
        heading(b, "{{first_name}}, you're invited"),
        para("We've curated a special experience for our most valued readers. Whether it's a seasonal market, a cultural exhibition, or a private tasting — this is something you won't want to miss."),
        `          <tr>
            <td style="padding:8px 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bg};border-radius:8px;border:1px solid ${b.border};">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${b.secondary};">Upcoming event</p>
                    <p style="margin:0 0 12px;font-family:${FONT};font-size:20px;font-weight:700;color:${b.text};">[Event Name]</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${b.muted};width:80px;vertical-align:top;">Date</td>
                        <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${b.text};font-weight:600;">[Date &amp; Time]</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${b.muted};width:80px;vertical-align:top;">Location</td>
                        <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${b.text};font-weight:600;">[Venue, London]</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${b.muted};width:80px;vertical-align:top;">Dress code</td>
                        <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${b.text};font-weight:600;">Smart casual</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        spacer(8),
        cta(b, "RSVP Now", `${b.siteUrl}/events`),
        closing(b, "We hope to see you there,"),
        footer(b),
      ].join("\n")),
    },

    // 5. Re-engagement
    {
      name: "We Miss You",
      type: "campaign",
      subject: "{{first_name}}, it's been a while — here's what you've missed",
      description: "Re-engagement email for subscribers inactive for 30+ days. Warm tone, highlights recent content, includes easy unsubscribe.",
      html: wrap(b, "We Miss You", [
        logoRow(b),
        accentLine(b),
        heading(b, "Hi {{first_name}}, it's been a while"),
        para("We noticed you haven't visited Yalla London recently, and we wanted to make sure you're not missing out. We've published some of our best guides yet — and we'd love for you to take a look."),
        label(b, "While you were away"),
        card(b, "Best Halal Restaurants in Central London", "A comprehensive guide to halal fine dining, casual spots, and hidden gems across the city.", `${b.siteUrl}/blog`),
        card(b, "London's Best-Kept Shopping Secrets", "Beyond Oxford Street — discover the boutiques, markets, and luxury outlets locals love.", `${b.siteUrl}/blog`),
        spacer(8),
        cta(b, "Catch Up on Yalla London", `${b.siteUrl}/blog`, b.accent),
        para("If you'd prefer not to hear from us, no hard feelings — you can unsubscribe at any time using the link below."),
        closing(b, "Warmly,"),
        footer(b),
      ].join("\n")),
    },

    // 6. Feedback Request
    {
      name: "Quick Feedback",
      type: "transactional",
      subject: "{{first_name}}, a quick question (30 seconds)",
      description: "Short feedback request to understand subscriber preferences. Simple question format, not a full survey.",
      html: wrap(b, "We'd Love Your Feedback", [
        logoRow(b),
        accentLine(b),
        heading(b, "{{first_name}}, we'd value your opinion"),
        para("We're always working to make Yalla London more useful for you. Would you mind answering one quick question? It takes less than 30 seconds and helps us create better content."),
        label(b, "Quick question"),
        `          <tr>
            <td style="padding:8px 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bg};border-radius:8px;border:1px solid ${b.border};">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 16px;font-family:${FONT};font-size:16px;font-weight:700;color:${b.text};">What would you most like to see more of?</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding:4px 8px;"><a href="${b.siteUrl}/feedback?choice=hotels" style="display:inline-block;padding:10px 20px;font-family:${FONT};font-size:13px;font-weight:600;color:${b.primary};border:2px solid ${b.primary};border-radius:6px;text-decoration:none;">Hotel Reviews</a></td>
                        <td style="padding:4px 8px;"><a href="${b.siteUrl}/feedback?choice=dining" style="display:inline-block;padding:10px 20px;font-family:${FONT};font-size:13px;font-weight:600;color:${b.primary};border:2px solid ${b.primary};border-radius:6px;text-decoration:none;">Dining Guides</a></td>
                      </tr>
                      <tr>
                        <td style="padding:4px 8px;"><a href="${b.siteUrl}/feedback?choice=experiences" style="display:inline-block;padding:10px 20px;font-family:${FONT};font-size:13px;font-weight:600;color:${b.primary};border:2px solid ${b.primary};border-radius:6px;text-decoration:none;">Experiences</a></td>
                        <td style="padding:4px 8px;"><a href="${b.siteUrl}/feedback?choice=itineraries" style="display:inline-block;padding:10px 20px;font-family:${FONT};font-size:13px;font-weight:600;color:${b.primary};border:2px solid ${b.primary};border-radius:6px;text-decoration:none;">Itineraries</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        spacer(8),
        para("Thank you for helping us improve. Every response matters."),
        closing(b, "With gratitude,"),
        footer(b),
      ].join("\n")),
    },

    // 7. London Update / Breaking News
    {
      name: "London Update",
      type: "notification",
      subject: "London Update: What's Happening This Week",
      description: "Timely updates about London events, openings, seasonal happenings, or breaking travel news.",
      html: wrap(b, "London Update", [
        `          <tr>
            <td style="padding:0;text-align:center;background:${b.text};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 40px;text-align:center;">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${b.secondary};">London Update</p>
                    <p style="margin:0;font-family:${FONT};font-size:24px;font-weight:700;color:#FFFFFF;">What's Happening in London</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        accentLine(b),
        heading(b, "Hi {{first_name}}, here's what's new"),
        para("Important updates from London that you should know about — from new restaurant openings and hotel launches to seasonal events and travel advisories."),
        label(b, "In the news"),
        `          <tr>
            <td style="padding:8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${numberedItem(b, 1, b.primary, "[News Headline 1]", "[Brief summary of the news item and why it matters to visitors.]", false)}
${numberedItem(b, 2, b.secondary, "[News Headline 2]", "[Brief summary of the second news item.]", false)}
${numberedItem(b, 3, b.accent, "[News Headline 3]", "[Brief summary of the third news item.]", true)}
              </table>
            </td>
          </tr>`,
        spacer(8),
        cta(b, "Read Full Coverage", `${b.siteUrl}/news`),
        closing(b, "Stay informed,"),
        footer(b),
      ].join("\n")),
    },

    // 8. Seasonal Guide
    {
      name: "Seasonal Guide",
      type: "campaign",
      subject: "London This Season — Your Complete Guide",
      description: "Seasonal content email (Ramadan, Christmas, Summer, etc.) with curated recommendations. Adapt the season block for each send.",
      html: wrap(b, "Seasonal Guide", [
        heroImg(b, "London seasonal guide"),
        logoRow(b),
        accentLine(b),
        `          <tr>
            <td style="padding:24px 40px 8px;text-align:center;">
              <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${b.secondary};">Seasonal guide</p>
              <p style="margin:0;font-family:${FONT};font-size:24px;font-weight:700;color:${b.text};">London This [Season]</p>
            </td>
          </tr>`,
        para("{{first_name}}, the city transforms with the seasons — and so does our guide. Here are our top picks for making the most of London right now."),
        label(b, "Where to stay"),
        card(b, "[Seasonal Hotel Recommendation]", "Our top hotel pick for this time of year, with special seasonal rates and experiences.", `${b.siteUrl}/hotels`),
        label(b, "Where to eat"),
        card(b, "[Seasonal Dining Recommendation]", "The restaurants and cafes that shine brightest this season, including seasonal menus and special events.", `${b.siteUrl}/blog`),
        label(b, "What to do"),
        card(b, "[Seasonal Experience Recommendation]", "The exhibitions, markets, and outdoor experiences that make this season special in London.", `${b.siteUrl}/experiences`),
        spacer(8),
        cta(b, "See the Full Seasonal Guide", `${b.siteUrl}/blog`),
        closing(b, "Enjoy the season,"),
        footer(b),
      ].join("\n")),
    },

    // 9. Insider Tips (Evergreen Drip Series)
    {
      name: "Insider Tips",
      type: "newsletter",
      subject: "5 Things First-Time London Visitors Always Get Wrong",
      description: "Educational content email with practical travel advice. Part of an evergreen drip series for new subscribers.",
      html: wrap(b, "Insider Tips", [
        logoRow(b),
        accentLine(b),
        heading(b, "{{first_name}}, a few tips from the inside"),
        para("After years of helping travellers experience the best of London, we've noticed the same mistakes come up again and again. Here are five things to get right before your trip."),
        `          <tr>
            <td style="padding:8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:${b.primary};">Tip 1</p>
                    <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};">Don't stay near the airport</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">Heathrow is 45 minutes from central London. Book in Zone 1 — Mayfair, Kensington, or the South Bank — and use the Tube or taxi from the airport.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:${b.primary};">Tip 2</p>
                    <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};">Get an Oyster card immediately</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">A contactless Oyster card or bank card saves up to 50% vs buying individual tickets. Available at every Tube station.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:${b.primary};">Tip 3</p>
                    <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};">Book afternoon tea in advance</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">The best venues (Claridge's, The Ritz, Sketch) book out weeks ahead. Reserve at least 2 weeks before your trip.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:${b.primary};">Tip 4</p>
                    <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};">Walk more than you think</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">Many attractions are closer together than the Tube map suggests. Walking from Big Ben to Buckingham Palace takes 15 minutes and you see more of the city.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:${b.primary};">Tip 5</p>
                    <p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};">Tip at restaurants, skip the rest</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;line-height:1.5;">10-12.5% at sit-down restaurants is standard. Check your bill — many add a service charge automatically. No need to tip at pubs, cafes, or taxis (though rounding up is appreciated).</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        spacer(8),
        cta(b, "More Insider Tips", `${b.siteUrl}/blog`),
        closing(b, "Safe travels,"),
        footer(b),
      ].join("\n")),
    },

    // 10. Welcome Series — Day 3
    {
      name: "Welcome Series — Day 3",
      type: "welcome",
      subject: "{{first_name}}, here are our most popular guides",
      description: "Third email in the welcome drip series (sent 3 days after signup). Showcases top-performing content to drive engagement.",
      html: wrap(b, "Our Most Popular Guides", [
        logoRow(b),
        accentLine(b),
        heading(b, "{{first_name}}, start with the best"),
        para("You joined Yalla London a few days ago — welcome again. We thought you'd like to see the guides our readers love most. These are the articles that have helped thousands of travellers plan better London trips."),
        label(b, "Reader favourites"),
        `          <tr>
            <td style="padding:8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" style="vertical-align:top;padding-right:12px;">
                          <div style="width:32px;height:32px;border-radius:50%;background:${b.secondary};text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#FFFFFF;">1</div>
                        </td>
                        <td>
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};"><a href="${b.siteUrl}/blog" style="color:${b.text};text-decoration:none;">The Ultimate London Travel Guide</a></p>
                          <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;">Everything you need to know, from neighbourhoods to transport to dining.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" style="vertical-align:top;padding-right:12px;">
                          <div style="width:32px;height:32px;border-radius:50%;background:${b.secondary};text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#FFFFFF;">2</div>
                        </td>
                        <td>
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};"><a href="${b.siteUrl}/blog" style="color:${b.text};text-decoration:none;">Best Luxury Hotels in London</a></p>
                          <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;">Our honest reviews of five-star properties across the city.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" style="vertical-align:top;padding-right:12px;">
                          <div style="width:32px;height:32px;border-radius:50%;background:${b.secondary};text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#FFFFFF;">3</div>
                        </td>
                        <td>
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};"><a href="${b.siteUrl}/blog" style="color:${b.text};text-decoration:none;">Halal Restaurants in London: The Complete Guide</a></p>
                          <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;">From fine dining to street food — every halal option worth knowing about.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" style="vertical-align:top;padding-right:12px;">
                          <div style="width:32px;height:32px;border-radius:50%;background:${b.secondary};text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#FFFFFF;">4</div>
                        </td>
                        <td>
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:15px;font-weight:700;color:${b.text};"><a href="${b.siteUrl}/blog" style="color:${b.text};text-decoration:none;">London on a Weekend: The Perfect 48-Hour Itinerary</a></p>
                          <p style="margin:0;font-family:${FONT};font-size:13px;color:#6B7280;">Make the most of a short trip with our day-by-day plan.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
        spacer(8),
        cta(b, "Explore All Guides", `${b.siteUrl}/blog`),
        para("Reply to this email any time — we read every message and love hearing what you're planning."),
        closing(b, "Happy planning,"),
        footer(b),
      ].join("\n")),
    },
  ];
}
