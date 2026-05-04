'use client'

/**
 * Properties panel and sub-editors for the Email Template Builder.
 *
 * Extracted from email-builder.tsx to keep the main component under 500 lines.
 */

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Palette } from 'lucide-react'
import type { EmailBlock } from './email-templates'

// ---------------------------------------------------------------------------
// Tiny helper components
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-8 text-xs font-mono" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-editors
// ---------------------------------------------------------------------------

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: Array<{ platform: string; url: string }>
  onChange: (links: Array<{ platform: string; url: string }>) => void
}) {
  const platforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']
  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="w-24">
            <Select value={link.platform} onValueChange={(v) => {
              const next = [...links]; next[i] = { ...next[i], platform: v }; onChange(next)
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {platforms.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            className="h-8 text-xs flex-1"
            value={link.url}
            onChange={(e) => { const next = [...links]; next[i] = { ...next[i], url: e.target.value }; onChange(next) }}
            placeholder="URL"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(links.filter((_, j) => j !== i))}>
            &times;
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onChange([...links, { platform: 'instagram', url: '' }])}>
        Add Link
      </Button>
    </div>
  )
}

function ColumnsEditor({
  columns,
  onChange,
}: {
  columns: Array<Record<string, string>>
  onChange: (columns: Array<Record<string, string>>) => void
}) {
  const updateCol = (i: number, key: string, value: string) => {
    const next = [...columns]
    next[i] = { ...next[i], [key]: value }
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {columns.map((col, i) => (
        <div key={i} className="p-2 border border-gray-200 rounded-md space-y-1.5">
          <div className="text-xs font-medium text-gray-500">Column {i + 1}</div>
          <Input className="h-8 text-xs" value={col.heading ?? ''} onChange={(e) => updateCol(i, 'heading', e.target.value)} placeholder="Heading" />
          <Textarea className="text-xs" rows={2} value={col.text ?? ''} onChange={(e) => updateCol(i, 'text', e.target.value)} placeholder="Text" />
          <Input className="h-8 text-xs" value={col.linkUrl ?? ''} onChange={(e) => updateCol(i, 'linkUrl', e.target.value)} placeholder="Link URL" />
          <Input className="h-8 text-xs" value={col.linkText ?? ''} onChange={(e) => updateCol(i, 'linkText', e.target.value)} placeholder="Link text" />
          <Input className="h-8 text-xs" value={col.imageUrl ?? ''} onChange={(e) => updateCol(i, 'imageUrl', e.target.value)} placeholder="Image URL" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main properties panel
// ---------------------------------------------------------------------------

export function PropertiesPanel({
  block,
  onChange,
}: {
  block: EmailBlock
  onChange: (updated: EmailBlock) => void
}) {
  const updateContent = (key: string, value: unknown) => {
    onChange({ ...block, content: { ...block.content, [key]: value } })
  }
  const updateStyle = (key: string, value: string) => {
    onChange({ ...block, styles: { ...(block.styles ?? {}), [key]: value } })
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        {block.type} Properties
      </div>

      {/* Type-specific controls */}
      {block.type === 'header' && (
        <>
          <Field label="Title">
            <Input value={(block.content.title as string) ?? ''} onChange={(e) => updateContent('title', e.target.value)} />
          </Field>
          <Field label="Subtitle">
            <Input value={(block.content.subtitle as string) ?? ''} onChange={(e) => updateContent('subtitle', e.target.value)} />
          </Field>
          <Field label="Logo URL">
            <Input value={(block.content.logoUrl as string) ?? ''} onChange={(e) => updateContent('logoUrl', e.target.value)} placeholder="https://..." />
          </Field>
        </>
      )}

      {block.type === 'text' && (
        <Field label="Content (HTML)">
          <Textarea
            rows={6}
            value={(block.content.html as string) ?? ''}
            onChange={(e) => updateContent('html', e.target.value)}
            className="font-mono text-xs"
          />
        </Field>
      )}

      {block.type === 'image' && (
        <>
          <Field label="Image URL">
            <Input value={(block.content.src as string) ?? ''} onChange={(e) => updateContent('src', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Alt Text">
            <Input value={(block.content.alt as string) ?? ''} onChange={(e) => updateContent('alt', e.target.value)} />
          </Field>
          <Field label="Link URL">
            <Input value={(block.content.linkUrl as string) ?? ''} onChange={(e) => updateContent('linkUrl', e.target.value)} placeholder="Optional click-through URL" />
          </Field>
          <Field label="Width">
            <Input value={(block.content.width as string) ?? '100%'} onChange={(e) => updateContent('width', e.target.value)} />
          </Field>
        </>
      )}

      {block.type === 'button' && (
        <>
          <Field label="Button Text">
            <Input value={(block.content.text as string) ?? ''} onChange={(e) => updateContent('text', e.target.value)} />
          </Field>
          <Field label="URL">
            <Input value={(block.content.url as string) ?? ''} onChange={(e) => updateContent('url', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Background Color">
            <ColorInput value={block.styles?.backgroundColor ?? '#C8322B'} onChange={(v) => updateStyle('backgroundColor', v)} />
          </Field>
          <Field label="Text Color">
            <ColorInput value={block.styles?.color ?? '#FFFFFF'} onChange={(v) => updateStyle('color', v)} />
          </Field>
          <Field label="Border Radius">
            <Input value={block.styles?.borderRadius ?? '8px'} onChange={(e) => updateStyle('borderRadius', e.target.value)} />
          </Field>
        </>
      )}

      {block.type === 'footer' && (
        <>
          <Field label="Company Name">
            <Input value={(block.content.companyName as string) ?? ''} onChange={(e) => updateContent('companyName', e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={(block.content.address as string) ?? ''} onChange={(e) => updateContent('address', e.target.value)} />
          </Field>
          <Field label="Unsubscribe URL">
            <Input value={(block.content.unsubscribeUrl as string) ?? ''} onChange={(e) => updateContent('unsubscribeUrl', e.target.value)} />
          </Field>
        </>
      )}

      {block.type === 'social-links' && (
        <SocialLinksEditor
          links={(block.content.links as Array<{ platform: string; url: string }>) ?? []}
          onChange={(links) => updateContent('links', links)}
        />
      )}

      {block.type === 'columns' && (
        <ColumnsEditor
          columns={(block.content.columns as Array<Record<string, string>>) ?? []}
          onChange={(columns) => updateContent('columns', columns)}
        />
      )}

      {block.type === 'divider' && (
        <Field label="Divider Color">
          <ColorInput value={block.styles?.borderColor ?? '#E5E7EB'} onChange={(v) => updateStyle('borderColor', v)} />
        </Field>
      )}

      {/* Common styles */}
      <div className="pt-3 border-t border-gray-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Style
        </div>
        <Field label="Background Color">
          <ColorInput value={block.styles?.backgroundColor ?? '#FFFFFF'} onChange={(v) => updateStyle('backgroundColor', v)} />
        </Field>
        <Field label="Padding">
          <Input value={block.styles?.padding ?? '16px 24px'} onChange={(e) => updateStyle('padding', e.target.value)} placeholder="e.g. 16px 24px" />
        </Field>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state for properties panel
// ---------------------------------------------------------------------------

export function PropertiesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
      <Palette className="h-8 w-8 mb-3 opacity-40" />
      <div className="text-sm font-medium mb-1">No block selected</div>
      <div className="text-xs">
        Click a block in the preview to edit its properties.
      </div>
    </div>
  )
}
