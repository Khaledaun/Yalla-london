import { NextRequest, NextResponse } from 'next/server'
import { createRateLimit } from '@/lib/rate-limiting'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'

// Rate limiting for contact form
const rateLimiter = createRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (request: NextRequest) => {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    return `contact_form:${ip}`
  }
})

interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  category: string
  message: string
  priority: 'low' | 'medium' | 'high'
  consent: boolean
  newsletter: boolean
}

/** SECURITY: HTML-escape user input to prevent XSS in email templates */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (c) => map[c])
}

// Email sending function
async function sendEmail(data: ContactFormData) {
  // If SendGrid is configured
  if (process.env.SENDGRID_API_KEY) {
    const _siteConfig = getSiteConfig(getDefaultSiteId());
    const _siteDomain = _siteConfig?.domain || 'example.com';
    const _siteName = _siteConfig?.name || 'Yalla London';
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: process.env.CONTACT_EMAIL || `hello@${_siteDomain}` }],
          subject: `[${data.category}] ${data.subject}`
        }],
        from: {
          email: process.env.FROM_EMAIL || `noreply@${_siteDomain}`,
          name: `${_siteName} Contact Form`
        },
        content: [{
          type: 'text/html',
          value: generateEmailHTML(data)
        }]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send email via SendGrid')
    }
  }
  
  // Send admin notification via webhook (Slack/Discord)
  await sendWebhookNotification(data)
}

function generateEmailHTML(data: ContactFormData): string {
  // SECURITY: Escape all user-provided data to prevent XSS
  const safeName = escapeHtml(data.name)
  const safeEmail = escapeHtml(data.email)
  const safePhone = data.phone ? escapeHtml(data.phone) : ''
  const safeCategory = escapeHtml(data.category)
  const safeSubject = escapeHtml(data.subject)
  const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br>')
  const safePriority = escapeHtml(data.priority)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contact Form Submission</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fbbf24; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #555; }
        .value { margin-left: 10px; }
        .priority-high { color: #dc2626; font-weight: bold; }
        .priority-medium { color: #f59e0b; }
        .priority-low { color: #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
          <div class="field">
            <span class="label">Name:</span>
            <span class="value">${safeName}</span>
          </div>
          <div class="field">
            <span class="label">Email:</span>
            <span class="value">${safeEmail}</span>
          </div>
          ${safePhone ? `
          <div class="field">
            <span class="label">Phone:</span>
            <span class="value">${safePhone}</span>
          </div>
          ` : ''}
          <div class="field">
            <span class="label">Category:</span>
            <span class="value">${safeCategory}</span>
          </div>
          <div class="field">
            <span class="label">Subject:</span>
            <span class="value">${safeSubject}</span>
          </div>
          <div class="field">
            <span class="label">Priority:</span>
            <span class="value priority-${safePriority}">${safePriority.toUpperCase()}</span>
          </div>
          <div class="field">
            <span class="label">Newsletter Subscription:</span>
            <span class="value">${data.newsletter ? 'Yes' : 'No'}</span>
          </div>
          <div class="field">
            <span class="label">Message:</span>
            <div style="margin-top: 10px; padding: 15px; background: white; border-left: 4px solid #fbbf24;">
              ${safeMessage}
            </div>
          </div>
          <div class="field" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <span class="label">Submitted:</span>
            <span class="value">${new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

async function sendWebhookNotification(data: ContactFormData) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL
  
  if (!webhookUrl) return

  const isSlack = webhookUrl.includes('slack.com')
  const priorityEmoji = {
    low: '🟢',
    medium: '🟡', 
    high: '🔴'
  }

  if (isSlack) {
    // Slack format
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New Contact Form Submission ${priorityEmoji[data.priority]}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${priorityEmoji[data.priority]} New Contact: ${data.subject}`
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Name:*\n${data.name}` },
              { type: 'mrkdwn', text: `*Email:*\n${data.email}` },
              { type: 'mrkdwn', text: `*Category:*\n${data.category}` },
              { type: 'mrkdwn', text: `*Priority:*\n${data.priority.toUpperCase()}` }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Message:*\n${data.message}`
            }
          }
        ]
      })
    })
  } else {
    // Discord format
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${priorityEmoji[data.priority]} New Contact Form Submission`,
          color: data.priority === 'high' ? 0xdc2626 : data.priority === 'medium' ? 0xf59e0b : 0x10b981,
          fields: [
            { name: 'Name', value: data.name, inline: true },
            { name: 'Email', value: data.email, inline: true },
            { name: 'Category', value: data.category, inline: true },
            { name: 'Priority', value: data.priority.toUpperCase(), inline: true },
            { name: 'Subject', value: data.subject, inline: false },
            { name: 'Message', value: data.message.length > 1000 ? data.message.substring(0, 1000) + '...' : data.message, inline: false }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Yalla London Contact Form' }
        }]
      })
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimiter.check(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: 'Please wait before sending another message'
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      )
    }

    const data: ContactFormData = await request.json()

    // Validate required fields
    if (!data.name || !data.email || !data.subject || !data.message || !data.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate consent
    if (!data.consent) {
      return NextResponse.json(
        { error: 'Privacy policy consent is required' },
        { status: 400 }
      )
    }

    // Basic spam detection
    const spamKeywords = ['buy now', 'click here', 'free money', 'lottery', 'viagra']
    const hasSpam = spamKeywords.some(keyword => 
      data.message.toLowerCase().includes(keyword) || 
      data.subject.toLowerCase().includes(keyword)
    )

    if (hasSpam) {
      return NextResponse.json(
        { error: 'Message flagged as spam' },
        { status: 400 }
      )
    }

    // Send email and notifications
    await sendEmail(data)

    // Log successful submission
    console.log(`Contact form submission: ${data.email} - ${data.subject}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully' 
    })

  } catch (error) {
    console.error('Contact form error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to send message. Please try again later.'
      },
      { status: 500 }
    )
  }
}