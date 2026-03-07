'use client'

import { useState, useRef, useEffect } from 'react'
import {
  MessageSquare, Send, Loader2, Copy, Code, FileText, AlertCircle,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  patches?: Array<{ file: string; diff: string }>
  claudePrompts?: string[]
  timestamp: string
}

export default function AICodingAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: data.response || 'No response',
        patches: data.patches,
        claudePrompts: data.claudePrompts,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 mb-3" style={{ borderBottom: '1px solid rgba(120,113,108,0.12)' }}>
        <MessageSquare style={{ width: 18, height: 18, color: '#6366F1' }} />
        <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 15, color: '#1C1917' }}>
          Coding Assistant
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
          Read-only · No shell access
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare style={{ width: 32, height: 32, color: '#A8A29E', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#78716C', marginBottom: 8 }}>
              Ask about errors, cron failures, pipeline status, or request code fixes.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                'Why are articles stuck in the pipeline?',
                'What cron jobs failed today?',
                'Generate a fix for the assembly timeout',
                'Create a Claude Code prompt for the indexing issue',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-2 rounded-xl transition-all active:scale-[0.97]"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="rounded-xl px-4 py-3 max-w-[85%]"
              style={{
                backgroundColor: msg.role === 'user' ? '#6366F1' : 'var(--neu-bg, #EDE9E1)',
                color: msg.role === 'user' ? '#FAF8F4' : '#1C1917',
                boxShadow: msg.role === 'user' ? 'none' : 'var(--neu-flat)',
              }}
            >
              {/* Content */}
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>

              {/* Patches */}
              {msg.patches && msg.patches.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.patches.map((patch, i) => (
                    <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(120,113,108,0.2)' }}>
                      <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                        <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#78716C' }}>
                          <Code style={{ width: 12, height: 12 }} />
                          {patch.file}
                        </span>
                        <button onClick={() => copyText(patch.diff)} style={{ fontSize: 9, color: '#6366F1' }}>
                          <Copy style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <pre className="px-3 py-2 text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 200 }}>
                        {patch.diff}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Claude Code prompts */}
              {msg.claudePrompts && msg.claudePrompts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.claudePrompts.map((prompt, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#6366F1' }}>
                          <FileText style={{ width: 12, height: 12 }} />
                          Paste into Claude Code
                        </span>
                        <button
                          onClick={() => copyText(prompt)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ fontSize: 10, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }}
                        >
                          <Copy style={{ width: 12, height: 12 }} /> Copy
                        </button>
                      </div>
                      <pre className="text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
                        {prompt}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
              <Loader2 style={{ width: 16, height: 16, color: '#6366F1' }} className="animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 p-2 rounded-lg flex items-center gap-2"
             style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
          <AlertCircle style={{ width: 14, height: 14, color: '#C8322B' }} />
          <span style={{ fontSize: 11, color: '#C8322B' }}>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-3" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about errors, pipeline status, or request code fixes..."
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-xl border-none resize-none"
          style={{
            backgroundColor: 'var(--neu-bg, #EDE9E1)',
            boxShadow: 'var(--neu-inset)',
            fontSize: 13,
            color: '#1C1917',
            minHeight: 48,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center rounded-xl transition-all active:scale-[0.95] disabled:opacity-50"
          style={{
            backgroundColor: '#6366F1',
            color: '#FAF8F4',
            minWidth: 48,
            minHeight: 48,
            boxShadow: '3px 3px 8px var(--neu-shadow-dark, #CAC5BC)',
          }}
        >
          {loading ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <Send style={{ width: 18, height: 18 }} />}
        </button>
      </div>
    </div>
  )
}
