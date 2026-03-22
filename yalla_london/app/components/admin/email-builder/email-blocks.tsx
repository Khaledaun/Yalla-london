'use client'

/**
 * Email block renderers for the Email Template Builder.
 *
 * Each block type renders as a React component for the builder preview
 * and can export to email-safe inline-styled HTML via `blockToHtml()`.
 */

import React from 'react'
import Image from 'next/image'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import {
  Type,
  ImageIcon,
  MousePointerClick,
  Minus,
  Columns2,
  Mail,
  Share2,
  Heading,
  GripVertical,
  Trash2,
} from 'lucide-react'
import type { EmailBlock } from './email-templates'

// ---------------------------------------------------------------------------
// Block type metadata (used by palette and renderer)
// ---------------------------------------------------------------------------

export interface BlockTypeMeta {
  type: EmailBlock['type']
  label: string
  icon: React.ReactNode
  defaultContent: Record<string, unknown>
  defaultStyles: Record<string, string>
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  {
    type: 'header',
    label: 'Header',
    icon: <Heading className="h-4 w-4" />,
    defaultContent: { title: 'Email Title', subtitle: '', logoUrl: '' },
    defaultStyles: { backgroundColor: '#1C1917', color: '#FFFFFF', padding: '32px 24px', textAlign: 'center' },
  },
  {
    type: 'text',
    label: 'Text',
    icon: <Type className="h-4 w-4" />,
    defaultContent: { html: '<p style="font-size:16px;line-height:1.6;color:#1F2937;">Enter your text here.</p>' },
    defaultStyles: { padding: '16px 24px', backgroundColor: '#FFFFFF' },
  },
  {
    type: 'image',
    label: 'Image',
    icon: <ImageIcon className="h-4 w-4" />,
    defaultContent: { src: '', alt: 'Image description', linkUrl: '', width: '100%' },
    defaultStyles: { padding: '0 24px', backgroundColor: '#FFFFFF' },
  },
  {
    type: 'button',
    label: 'Button',
    icon: <MousePointerClick className="h-4 w-4" />,
    defaultContent: { text: 'Click Here', url: '#' },
    defaultStyles: {
      backgroundColor: '#C8322B', color: '#FFFFFF', padding: '14px 32px',
      borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '16px',
    },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: <Minus className="h-4 w-4" />,
    defaultContent: {},
    defaultStyles: { padding: '8px 24px', borderColor: '#E5E7EB' },
  },
  {
    type: 'columns',
    label: 'Two Columns',
    icon: <Columns2 className="h-4 w-4" />,
    defaultContent: {
      columns: [
        { heading: 'Column 1', text: 'Left column content', linkUrl: '', linkText: 'Learn more', imageUrl: '' },
        { heading: 'Column 2', text: 'Right column content', linkUrl: '', linkText: 'Learn more', imageUrl: '' },
      ],
    },
    defaultStyles: { padding: '24px', gap: '16px', backgroundColor: '#FFFFFF' },
  },
  {
    type: 'footer',
    label: 'Footer',
    icon: <Mail className="h-4 w-4" />,
    defaultContent: {
      companyName: 'Zenitha.Luxury',
      address: 'Zenitha.Luxury LLC, Delaware, United States',
      unsubscribeUrl: '{{unsubscribe_url}}',
      preferencesUrl: '{{preferences_url}}',
    },
    defaultStyles: { padding: '24px', backgroundColor: '#F5F5F5', color: '#6B7280', fontSize: '12px', textAlign: 'center' },
  },
  {
    type: 'social-links',
    label: 'Social Links',
    icon: <Share2 className="h-4 w-4" />,
    defaultContent: {
      links: [
        { platform: 'instagram', url: 'https://instagram.com/' },
        { platform: 'twitter', url: 'https://x.com/' },
        { platform: 'facebook', url: 'https://facebook.com/' },
      ],
    },
    defaultStyles: { padding: '16px 24px', textAlign: 'center', backgroundColor: '#F5F5F5' },
  },
]

// ---------------------------------------------------------------------------
// Platform icon map for social links
// ---------------------------------------------------------------------------
const SOCIAL_ICONS: Record<string, string> = {
  instagram: 'IG',
  twitter: 'X',
  facebook: 'FB',
  linkedin: 'in',
  tiktok: 'TT',
  youtube: 'YT',
}

// ---------------------------------------------------------------------------
// Preview renderers (React components for the builder canvas)
// ---------------------------------------------------------------------------

function HeaderPreview({ block }: { block: EmailBlock }) {
  const { title, subtitle, logoUrl } = block.content as { title?: string; subtitle?: string; logoUrl?: string }
  const s = block.styles ?? {}
  return (
    <div style={{ backgroundColor: s.backgroundColor ?? '#1C1917', color: s.color ?? '#fff', padding: s.padding ?? '32px 24px', textAlign: (s.textAlign as React.CSSProperties['textAlign']) ?? 'center' }}>
      {logoUrl && <Image src={logoUrl as string} alt="Logo" width={0} height={0} sizes="100vw" style={{ maxHeight: 40, marginBottom: 12, display: 'inline-block', width: 'auto', height: 'auto' }} unoptimized />}
      <div style={{ fontSize: 22, fontWeight: 700 }}>{title || 'Email Title'}</div>
      {subtitle && <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}

function TextPreview({ block }: { block: EmailBlock }) {
  const { html } = block.content as { html?: string }
  const s = block.styles ?? {}
  return (
    <div
      style={{ padding: s.padding ?? '16px 24px', backgroundColor: s.backgroundColor ?? '#fff' }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || '<p>Text block</p>') }}
    />
  )
}

function ImagePreview({ block }: { block: EmailBlock }) {
  const { src, alt, width } = block.content as { src?: string; alt?: string; width?: string }
  const s = block.styles ?? {}
  return (
    <div style={{ padding: s.padding ?? '0 24px', backgroundColor: s.backgroundColor ?? '#fff' }}>
      {src ? (
        <Image src={src} alt={alt ?? ''} width={0} height={0} sizes="100vw" style={{ width: width ?? '100%', display: 'block', borderRadius: 4, height: 'auto' }} unoptimized />
      ) : (
        <div style={{ width: '100%', height: 180, backgroundColor: '#E5E7EB', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 14 }}>
          <ImageIcon style={{ width: 24, height: 24, marginRight: 8 }} />
          No image set
        </div>
      )}
    </div>
  )
}

function ButtonPreview({ block }: { block: EmailBlock }) {
  const { text } = block.content as { text?: string }
  const s = block.styles ?? {}
  return (
    <div style={{ padding: '16px 24px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
      <span
        style={{
          display: 'inline-block',
          backgroundColor: s.backgroundColor ?? '#C8322B',
          color: s.color ?? '#fff',
          padding: s.padding ?? '14px 32px',
          borderRadius: s.borderRadius ?? '8px',
          fontWeight: (s.fontWeight as React.CSSProperties['fontWeight']) ?? 600,
          fontSize: s.fontSize ?? '16px',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        {text || 'Button'}
      </span>
    </div>
  )
}

function DividerPreview({ block }: { block: EmailBlock }) {
  const s = block.styles ?? {}
  return (
    <div style={{ padding: s.padding ?? '8px 24px' }}>
      <hr style={{ border: 'none', borderTop: `1px solid ${s.borderColor ?? '#E5E7EB'}`, margin: 0 }} />
    </div>
  )
}

function ColumnsPreview({ block }: { block: EmailBlock }) {
  const { columns } = block.content as { columns?: Array<{ heading?: string; text?: string; imageUrl?: string; linkText?: string }> }
  const s = block.styles ?? {}
  const cols = columns ?? []
  return (
    <div style={{ padding: s.padding ?? '24px', backgroundColor: s.backgroundColor ?? '#fff' }}>
      <div style={{ display: 'flex', gap: s.gap ?? '16px' }}>
        {cols.map((col, i) => (
          <div key={i} style={{ flex: 1 }}>
            {col.imageUrl && (
              <Image src={col.imageUrl} alt={col.heading ?? ''} width={0} height={0} sizes="100vw" style={{ width: '100%', borderRadius: 4, marginBottom: 8, height: 'auto' }} unoptimized />
            )}
            {!col.imageUrl && (
              <div style={{ width: '100%', height: 100, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 8 }} />
            )}
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1917', marginBottom: 4 }}>{col.heading || `Column ${i + 1}`}</div>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{col.text || 'Column content'}</div>
            {col.linkText && <div style={{ fontSize: 13, color: '#C8322B', marginTop: 8, fontWeight: 500 }}>{col.linkText} &rarr;</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function FooterPreview({ block }: { block: EmailBlock }) {
  const { companyName, address } = block.content as { companyName?: string; address?: string }
  const s = block.styles ?? {}
  return (
    <div style={{ padding: s.padding ?? '24px', backgroundColor: s.backgroundColor ?? '#F5F5F5', textAlign: (s.textAlign as React.CSSProperties['textAlign']) ?? 'center', color: s.color ?? '#6B7280', fontSize: s.fontSize ?? '12px' }}>
      <div style={{ marginBottom: 4 }}>&copy; {new Date().getFullYear()} {companyName || 'Company'}</div>
      <div style={{ marginBottom: 8 }}>{address || 'Company address'}</div>
      <div>
        <span style={{ textDecoration: 'underline', cursor: 'pointer', marginRight: 12 }}>Unsubscribe</span>
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Email Preferences</span>
      </div>
    </div>
  )
}

function SocialLinksPreview({ block }: { block: EmailBlock }) {
  const { links } = block.content as { links?: Array<{ platform: string; url: string }> }
  const s = block.styles ?? {}
  return (
    <div style={{ padding: s.padding ?? '16px 24px', textAlign: (s.textAlign as React.CSSProperties['textAlign']) ?? 'center', backgroundColor: s.backgroundColor ?? '#F5F5F5' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        {(links ?? []).map((link, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#374151',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
            }}
            title={link.platform}
          >
            {SOCIAL_ICONS[link.platform] ?? link.platform.slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main render function for the builder preview
// ---------------------------------------------------------------------------

export function renderBlockPreview(
  block: EmailBlock,
  isSelected: boolean,
  onSelect: () => void,
  onDelete: () => void,
  dragHandleProps?: Record<string, unknown>,
): React.ReactNode {
  const RENDERERS: Record<EmailBlock['type'], React.FC<{ block: EmailBlock }>> = {
    header: HeaderPreview,
    text: TextPreview,
    image: ImagePreview,
    button: ButtonPreview,
    divider: DividerPreview,
    columns: ColumnsPreview,
    footer: FooterPreview,
    'social-links': SocialLinksPreview,
  }

  const Renderer = RENDERERS[block.type]
  if (!Renderer) return null

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      className={`relative group cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2'
          : 'hover:ring-1 hover:ring-gray-300 hover:ring-offset-1'
      }`}
      style={{ borderRadius: 4 }}
    >
      {/* Drag handle + delete overlay */}
      <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <span
          {...(dragHandleProps ?? {})}
          className="p-1 rounded bg-white/90 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5 text-gray-400" />
        </span>
      </div>
      <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded bg-white/90 shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors"
          title="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
        </button>
      </div>

      {/* Block type badge */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/90 shadow-sm border border-gray-200 text-gray-500 font-medium uppercase tracking-wider">
          {block.type}
        </span>
      </div>

      <Renderer block={block} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// HTML export — email-safe inline-styled output
// ---------------------------------------------------------------------------

/** Escape HTML entities in text/attribute values to prevent XSS */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function blockToHtml(block: EmailBlock): string {
  const s = block.styles ?? {}

  switch (block.type) {
    case 'header': {
      const { title, subtitle, logoUrl } = block.content as { title?: string; subtitle?: string; logoUrl?: string }
      const logoHtml = logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-height:40px;margin-bottom:12px;" />` : ''
      const subtitleHtml = subtitle ? `<div style="font-size:14px;opacity:0.85;margin-top:4px;">${esc(subtitle)}</div>` : ''
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${s.backgroundColor ?? '#1C1917'};color:${s.color ?? '#fff'};padding:${s.padding ?? '32px 24px'};text-align:${s.textAlign ?? 'center'};">${logoHtml}<div style="font-size:22px;font-weight:700;">${esc(title || 'Email Title')}</div>${subtitleHtml}</td></tr></table>`
    }
    case 'text': {
      const { html } = block.content as { html?: string }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${s.padding ?? '16px 24px'};background-color:${s.backgroundColor ?? '#fff'};">${sanitizeHtml(html || '')}</td></tr></table>`
    }
    case 'image': {
      const { src, alt, linkUrl, width } = block.content as { src?: string; alt?: string; linkUrl?: string; width?: string }
      const imgTag = `<img src="${esc(src || '')}" alt="${esc(alt || '')}" width="${esc(width ?? '100%')}" style="display:block;max-width:100%;border-radius:4px;" />`
      const inner = linkUrl ? `<a href="${esc(linkUrl)}" style="text-decoration:none;">${imgTag}</a>` : imgTag
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${s.padding ?? '0 24px'};background-color:${s.backgroundColor ?? '#fff'};">${inner}</td></tr></table>`
    }
    case 'button': {
      const { text, url } = block.content as { text?: string; url?: string }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 24px;text-align:center;background-color:#FFFFFF;"><a href="${esc(url || '#')}" style="display:inline-block;background-color:${s.backgroundColor ?? '#C8322B'};color:${s.color ?? '#fff'};padding:${s.padding ?? '14px 32px'};border-radius:${s.borderRadius ?? '8px'};font-weight:${s.fontWeight ?? '600'};font-size:${s.fontSize ?? '16px'};text-decoration:none;">${esc(text || 'Button')}</a></td></tr></table>`
    }
    case 'divider':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${s.padding ?? '8px 24px'};"><hr style="border:none;border-top:1px solid ${s.borderColor ?? '#E5E7EB'};margin:0;" /></td></tr></table>`
    case 'columns': {
      const { columns } = block.content as { columns?: Array<{ heading?: string; text?: string; imageUrl?: string; linkText?: string; linkUrl?: string }> }
      const cols = columns ?? []
      const cellWidth = Math.floor(100 / Math.max(cols.length, 1))
      const cellsHtml = cols.map((col) => {
        const imgHtml = col.imageUrl ? `<img src="${esc(col.imageUrl)}" alt="${esc(col.heading ?? '')}" style="width:100%;border-radius:4px;margin-bottom:8px;" />` : ''
        const linkHtml = col.linkText && col.linkUrl ? `<div style="margin-top:8px;"><a href="${esc(col.linkUrl)}" style="color:#C8322B;font-size:13px;font-weight:500;text-decoration:none;">${esc(col.linkText)} &rarr;</a></div>` : ''
        return `<td style="width:${cellWidth}%;vertical-align:top;padding:0 8px;" valign="top">${imgHtml}<div style="font-size:16px;font-weight:600;color:#1C1917;margin-bottom:4px;">${esc(col.heading || '')}</div><div style="font-size:14px;color:#374151;line-height:1.5;">${esc(col.text || '')}</div>${linkHtml}</td>`
      }).join('')
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${s.padding ?? '24px'};background-color:${s.backgroundColor ?? '#fff'};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cellsHtml}</tr></table></td></tr></table>`
    }
    case 'footer': {
      const { companyName, address, unsubscribeUrl, preferencesUrl } = block.content as { companyName?: string; address?: string; unsubscribeUrl?: string; preferencesUrl?: string }
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${s.padding ?? '24px'};background-color:${s.backgroundColor ?? '#F5F5F5'};text-align:${s.textAlign ?? 'center'};color:${s.color ?? '#6B7280'};font-size:${s.fontSize ?? '12px'};">&copy; ${new Date().getFullYear()} ${esc(companyName || 'Company')}<br/>${esc(address || '')}<br/><a href="${esc(unsubscribeUrl || '#')}" style="color:${s.color ?? '#6B7280'};text-decoration:underline;">Unsubscribe</a> &middot; <a href="${esc(preferencesUrl || '#')}" style="color:${s.color ?? '#6B7280'};text-decoration:underline;">Email Preferences</a></td></tr></table>`
    }
    case 'social-links': {
      const { links } = block.content as { links?: Array<{ platform: string; url: string }> }
      const iconsHtml = (links ?? []).map((link) => {
        const label = SOCIAL_ICONS[link.platform] ?? link.platform.slice(0, 2).toUpperCase()
        return `<a href="${esc(link.url)}" style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:50%;background-color:#374151;color:#fff;font-size:12px;font-weight:700;text-decoration:none;text-align:center;margin:0 6px;" title="${esc(link.platform)}">${esc(label)}</a>`
      }).join('')
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${s.padding ?? '16px 24px'};text-align:${s.textAlign ?? 'center'};background-color:${s.backgroundColor ?? '#F5F5F5'};">${iconsHtml}</td></tr></table>`
    }
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Full email HTML export
// ---------------------------------------------------------------------------

export function blocksToFullHtml(blocks: EmailBlock[], title?: string): string {
  const bodyHtml = blocks.map(blockToHtml).join('\n')
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${esc(title || 'Email')}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; }
    table { border-collapse: collapse !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;">
  <center style="width:100%;background-color:#F3F4F6;padding:24px 0;">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
    <div class="email-container" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;">
${bodyHtml}
    </div>
    <!--[if mso]></td></tr></table><![endif]-->
  </center>
</body>
</html>`
}
