'use client'

/**
 * Email Template Builder — drag-and-drop visual email editor.
 *
 * Three-panel layout:
 *   Left sidebar (200px)  — block palette (drag to add)
 *   Center (flexible)     — live email preview (600px email width)
 *   Right sidebar (250px) — properties panel for selected block
 *
 * Uses @dnd-kit/sortable for reordering and @dnd-kit/core for
 * drag-from-palette functionality.
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Monitor,
  Smartphone,
  Save,
  Send,
  Download,
  Plus,
  Undo2,
  Redo2,
  Palette,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

import type { EmailBlock } from './email-templates'
import { EMAIL_TEMPLATES } from './email-templates'
import { BLOCK_TYPES, renderBlockPreview, blocksToFullHtml } from './email-blocks'
import { PropertiesPanel, PropertiesEmptyState } from './email-properties'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailBuilderProps {
  initialBlocks?: EmailBlock[]
  templateId?: string
  site: string
  onSave?: (blocks: EmailBlock[], html: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function cloneBlock(meta: (typeof BLOCK_TYPES)[number]): EmailBlock {
  return {
    id: generateId(),
    type: meta.type,
    content: JSON.parse(JSON.stringify(meta.defaultContent)),
    styles: { ...meta.defaultStyles },
  }
}

// ---------------------------------------------------------------------------
// Sortable block wrapper
// ---------------------------------------------------------------------------

function SortableBlock({
  block,
  isSelected,
  onSelect,
  onDelete,
}: {
  block: EmailBlock
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {renderBlockPreview(block, isSelected, onSelect, onDelete, listeners as Record<string, unknown>)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Block palette item
// ---------------------------------------------------------------------------

function PaletteItem({ meta, onAdd }: { meta: (typeof BLOCK_TYPES)[number]; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      <span className="text-gray-500 flex-shrink-0">{meta.icon}</span>
      <span className="text-gray-700 font-medium">{meta.label}</span>
      <Plus className="h-3 w-3 ml-auto text-gray-400" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EmailBuilder({ initialBlocks, templateId, site, onSave }: EmailBuilderProps) {
  const { toast } = useToast()
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    if (initialBlocks?.length) return initialBlocks
    if (templateId && EMAIL_TEMPLATES[templateId]) {
      return JSON.parse(JSON.stringify(EMAIL_TEMPLATES[templateId].blocks))
    }
    return []
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState(
    templateId ? (EMAIL_TEMPLATES[templateId]?.name ?? 'Untitled') : 'Untitled Email'
  )
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [activeId, setActiveId] = useState<string | null>(null)

  // Undo / redo
  const historyRef = useRef<EmailBlock[][]>([])
  const futureRef = useRef<EmailBlock[][]>([])

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current, JSON.parse(JSON.stringify(blocks))]
    futureRef.current = []
  }, [blocks])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    futureRef.current = [...futureRef.current, JSON.parse(JSON.stringify(blocks))]
    const prev = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    setBlocks(prev)
  }, [blocks])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    historyRef.current = [...historyRef.current, JSON.parse(JSON.stringify(blocks))]
    const next = futureRef.current[futureRef.current.length - 1]
    futureRef.current = futureRef.current.slice(0, -1)
    setBlocks(next)
  }, [blocks])

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null

  // --- Actions ---

  const addBlock = useCallback((meta: (typeof BLOCK_TYPES)[number]) => {
    pushHistory()
    const newBlock = cloneBlock(meta)
    setBlocks((prev) => [...prev, newBlock])
    setSelectedId(newBlock.id)
  }, [pushHistory])

  const deleteBlock = useCallback((id: string) => {
    pushHistory()
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }, [pushHistory, selectedId])

  const updateBlock = useCallback((updated: EmailBlock) => {
    pushHistory()
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }, [pushHistory])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    pushHistory()
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id)
      const newIndex = prev.findIndex((b) => b.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [pushHistory])

  const handleSave = useCallback(() => {
    const html = blocksToFullHtml(blocks, templateName)
    onSave?.(blocks, html)
    toast({ title: 'Template saved', description: `${templateName} saved with ${blocks.length} blocks.` })
  }, [blocks, templateName, onSave, toast])

  const handleExportHtml = useCallback(() => {
    const html = blocksToFullHtml(blocks, templateName)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateName.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'HTML exported', description: 'Email HTML file downloaded.' })
  }, [blocks, templateName, toast])

  const handleSendTest = useCallback(() => {
    toast({ title: 'Send test', description: 'Test email sending is not yet connected to a mail provider.' })
  }, [toast])

  const loadTemplate = useCallback((key: string) => {
    if (!EMAIL_TEMPLATES[key]) return
    pushHistory()
    const fresh: EmailBlock[] = JSON.parse(JSON.stringify(EMAIL_TEMPLATES[key].blocks))
    fresh.forEach((b) => { b.id = generateId() })
    setBlocks(fresh)
    setTemplateName(EMAIL_TEMPLATES[key].name)
    setSelectedId(null)
    toast({ title: 'Template loaded', description: EMAIL_TEMPLATES[key].name })
  }, [pushHistory, toast])

  // --- Render ---

  const activeBlock = blocks.find((b) => b.id === activeId) ?? null

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="max-w-[240px] h-8 text-sm font-medium"
        />

        <Select onValueChange={loadTemplate}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Load template..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {tmpl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden ml-auto">
          <button
            onClick={() => setPreviewMode('desktop')}
            className={`p-1.5 ${previewMode === 'desktop' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            title="Desktop preview"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPreviewMode('mobile')}
            className={`p-1.5 ${previewMode === 'mobile' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            title="Mobile preview"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={handleSendTest}>
          <Send className="h-3.5 w-3.5 mr-1.5" /> Send Test
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportHtml}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export HTML
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save Template
        </Button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Block palette */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Palette className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Blocks</span>
          </div>
          <div className="space-y-1.5">
            {BLOCK_TYPES.map((meta) => (
              <PaletteItem key={meta.type} meta={meta} onAdd={() => addBlock(meta)} />
            ))}
          </div>

          {/* Template quick-load */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Templates</span>
            <div className="mt-2 space-y-1.5">
              {Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => loadTemplate(key)}
                  className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Live email preview */}
        <div className="flex-1 overflow-y-auto p-6" onClick={() => setSelectedId(null)}>
          <div
            className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-200"
            style={{ maxWidth: previewMode === 'desktop' ? 600 : 375 }}
          >
            {blocks.length === 0 ? (
              <div className="py-24 px-8 text-center text-gray-400">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <div className="text-sm font-medium mb-1">No blocks yet</div>
                <div className="text-xs">Click a block in the left panel or load a template to get started.</div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      isSelected={block.id === selectedId}
                      onSelect={() => setSelectedId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeBlock ? (
                    <div className="opacity-80 shadow-xl rounded" style={{ maxWidth: previewMode === 'desktop' ? 600 : 375 }}>
                      {renderBlockPreview(activeBlock, false, () => {}, () => {})}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>

        {/* Right sidebar: Properties */}
        <div className="w-[250px] flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto p-3">
          {selectedBlock ? (
            <PropertiesPanel block={selectedBlock} onChange={updateBlock} />
          ) : (
            <PropertiesEmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
