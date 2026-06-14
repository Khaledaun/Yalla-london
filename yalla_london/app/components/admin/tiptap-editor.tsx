'use client'

import React, { useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Link2,
  Minus,
  Quote,
  Code2,
  Undo2,
  Redo2,
} from 'lucide-react'

let useEditor: typeof import('@tiptap/react').useEditor
let EditorContent: typeof import('@tiptap/react').EditorContent
let StarterKit: typeof import('@tiptap/starter-kit').default
let ImageExt: typeof import('@tiptap/extension-image').default
let LinkExt: typeof import('@tiptap/extension-link').default
let PlaceholderExt: typeof import('@tiptap/extension-placeholder').default
let TextAlignExt: typeof import('@tiptap/extension-text-align').default
let UnderlineExt: typeof import('@tiptap/extension-underline').default

let tiptapLoaded = false

try {
  const tiptapReact = require('@tiptap/react')
  useEditor = tiptapReact.useEditor
  EditorContent = tiptapReact.EditorContent
  StarterKit = require('@tiptap/starter-kit').default
  ImageExt = require('@tiptap/extension-image').default
  LinkExt = require('@tiptap/extension-link').default
  PlaceholderExt = require('@tiptap/extension-placeholder').default
  TextAlignExt = require('@tiptap/extension-text-align').default
  UnderlineExt = require('@tiptap/extension-underline').default
  tiptapLoaded = true
} catch {
  console.warn('[tiptap-editor] Tiptap packages not available, using fallback textarea')
}

export interface TiptapEditorProps {
  content?: string
  onChange?: (html: string, json: Record<string, unknown>) => void
  onSave?: (html: string) => void
  placeholder?: string
  editable?: boolean
  showToolbar?: boolean
  onImageInsert?: () => void
}

interface ToolbarButtonProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
}

function ToolbarButton({ icon: Icon, label, onClick, isActive, disabled }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />
}

function FallbackEditor({ content, onChange, onSave, placeholder, editable }: TiptapEditorProps) {
  const [value, setValue] = React.useState(content || '')

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-yellow-50 border-b px-3 py-2 text-sm text-yellow-700">
        Rich text editor unavailable. Install @tiptap packages for full functionality.
      </div>
      <textarea
        className="w-full min-h-[400px] p-4 font-mono text-sm resize-y focus:outline-none"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          onChange?.(e.target.value, {})
        }}
        onKeyDown={(e) => {
          if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSave?.(value)
          }
        }}
        placeholder={placeholder || 'Start writing...'}
        readOnly={editable === false}
      />
    </div>
  )
}

function TiptapEditorInner({
  content,
  onChange,
  onSave,
  placeholder,
  editable = true,
  showToolbar = true,
  onImageInsert,
}: TiptapEditorProps) {
  const editor = useEditor!({
    extensions: [
      StarterKit!.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExt!.configure({ inline: false, allowBase64: true }),
      LinkExt!.configure({ openOnClick: false, autolink: true }),
      PlaceholderExt!.configure({ placeholder: placeholder || 'Start writing your article...' }),
      TextAlignExt!.configure({ types: ['heading', 'paragraph'] }),
      UnderlineExt!,
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML(), ed.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none min-h-[400px] px-6 py-4 focus:outline-none',
      },
    },
  })

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (editor && onSave) {
          onSave(editor.getHTML())
        }
      }
    },
    [editor, onSave]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const insertLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Enter URL:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border rounded-lg overflow-hidden bg-white">
        {showToolbar && editable && (
          <div className="sticky top-0 z-10 bg-white border-b px-2 py-1.5 flex flex-wrap items-center gap-0.5">
            {/* Text Formatting */}
            <ToolbarButton
              icon={Bold}
              label="Bold (Ctrl+B)"
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
            />
            <ToolbarButton
              icon={Italic}
              label="Italic (Ctrl+I)"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            />
            <ToolbarButton
              icon={UnderlineIcon}
              label="Underline (Ctrl+U)"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
            />
            <ToolbarButton
              icon={Strikethrough}
              label="Strikethrough"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
            />

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton
              icon={Heading1}
              label="Heading 1"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
            />
            <ToolbarButton
              icon={Heading2}
              label="Heading 2"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
            />
            <ToolbarButton
              icon={Heading3}
              label="Heading 3"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
            />
            <ToolbarButton
              icon={Pilcrow}
              label="Paragraph"
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
            />

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
              icon={List}
              label="Bullet List"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Ordered List"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
            />

            <ToolbarDivider />

            {/* Text Alignment */}
            <ToolbarButton
              icon={AlignLeft}
              label="Align Left"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
            />
            <ToolbarButton
              icon={AlignCenter}
              label="Align Center"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
            />
            <ToolbarButton
              icon={AlignRight}
              label="Align Right"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
            />

            <ToolbarDivider />

            {/* Insert */}
            <ToolbarButton
              icon={ImageIcon}
              label="Insert Image"
              onClick={() => {
                if (onImageInsert) {
                  onImageInsert()
                } else {
                  const url = window.prompt('Enter image URL:')
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run()
                  }
                }
              }}
            />
            <ToolbarButton
              icon={Link2}
              label="Insert Link"
              onClick={insertLink}
              isActive={editor.isActive('link')}
            />
            <ToolbarButton
              icon={Minus}
              label="Horizontal Rule"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            />
            <ToolbarButton
              icon={Quote}
              label="Blockquote"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
            />
            <ToolbarButton
              icon={Code2}
              label="Code Block"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
            />

            <ToolbarDivider />

            {/* Undo/Redo */}
            <ToolbarButton
              icon={Undo2}
              label="Undo (Ctrl+Z)"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              icon={Redo2}
              label="Redo (Ctrl+Shift+Z)"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            />
          </div>
        )}

        {EditorContent && <EditorContent editor={editor} />}
      </div>
    </TooltipProvider>
  )
}

export function TiptapEditor(props: TiptapEditorProps) {
  if (!tiptapLoaded) {
    return <FallbackEditor {...props} />
  }
  return <TiptapEditorInner {...props} />
}

export default TiptapEditor
