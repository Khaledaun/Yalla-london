'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminLoadingState,
  AdminStatusBadge,
} from '@/components/admin/admin-ui'

// ─── Types ─────────────────────────────────────────────────────────

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'whatsapp' | 'email' | 'web'
  content: string
  contentType: string
  createdAt: string
  confidence: number | null
}

interface Contact {
  name: string | null
  phone: string | null
  email: string | null
  leadScore: number | null
  opportunityStage: string | null
}

interface ConversationDetail {
  id: string
  channel: 'whatsapp' | 'email' | 'web'
  status: 'active' | 'resolved' | 'pending'
  summary: string | null
  contact: Contact
  messages: Message[]
}

// ─── Helpers ───────────────────────────────────────────────────────

const CHANNEL_INDICATORS: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WA', color: 'bg-[#25D366] text-white' },
  email: { label: '@', color: 'bg-[#3B7EA1] text-white' },
  web: { label: 'WEB', color: 'bg-[#C49A2A] text-white' },
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) return time

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()

  if (isYesterday) return `Yesterday ${time}`

  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

// ─── Page Component ────────────────────────────────────────────────

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params?.id as string

  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyChannel, setReplyChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/communications/${conversationId}`, {
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data: ConversationDetail = await res.json()
      setConversation(data)
      // Default reply channel to conversation's channel if applicable
      if (data.channel === 'whatsapp' || data.channel === 'email') {
        setReplyChannel(data.channel)
      }
    } catch (err) {
      console.warn('[conversation-detail] fetch failed:', err instanceof Error ? err.message : err)
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (conversation?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation?.messages])

  // ─── Actions ─────────────────────────────────────────────────────

  async function handleSendReply() {
    if (!replyText.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/communications/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message: replyText.trim(), channel: replyChannel }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => 'Send failed')
        throw new Error(text || `HTTP ${res.status}`)
      }
      setReplyText('')
      // Refresh conversation to show new message
      await fetchConversation()
    } catch (err) {
      console.warn('[conversation-detail] send failed:', err instanceof Error ? err.message : err)
      alert(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function handleAction(action: string) {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/admin/communications/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => 'Action failed')
        throw new Error(text || `HTTP ${res.status}`)
      }
      await fetchConversation()
    } catch (err) {
      console.warn('[conversation-detail] action failed:', err instanceof Error ? err.message : err)
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Loading & Error States ──────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] px-4 py-6 max-w-3xl mx-auto">
        <AdminPageHeader title="Conversation" backHref="/admin/communications" />
        <AdminLoadingState label="Loading conversation..." />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] px-4 py-6 max-w-3xl mx-auto">
        <AdminPageHeader title="Conversation" backHref="/admin/communications" />
        <AdminCard className="border-l-[3px] border-l-[#C8322B]">
          <p className="font-[var(--font-system)] text-sm text-[#9B2520]">
            {error || 'Conversation not found'}
          </p>
          <div className="flex gap-2 mt-3">
            <AdminButton variant="ghost" size="sm" onClick={fetchConversation}>
              Retry
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={() => router.push('/admin/communications')}>
              Back to Inbox
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    )
  }

  const { contact, messages } = conversation
  const contactDisplay = contact.name || contact.phone || contact.email || 'Unknown Contact'

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex-shrink-0">
        <AdminPageHeader
          title={contactDisplay}
          subtitle={`${conversation.channel.toUpperCase()} conversation`}
          backHref="/admin/communications"
          action={<AdminStatusBadge status={conversation.status} />}
        />
      </div>

      {/* Contact Summary Card */}
      <div className="px-4 mb-3 flex-shrink-0">
        <AdminCard>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {contact.name && (
              <div>
                <p className="font-[var(--font-system)] text-[10px] text-stone-400 uppercase tracking-[1px]">Name</p>
                <p className="font-[var(--font-system)] text-[13px] text-stone-800 font-medium">{contact.name}</p>
              </div>
            )}
            {contact.phone && (
              <div>
                <p className="font-[var(--font-system)] text-[10px] text-stone-400 uppercase tracking-[1px]">Phone</p>
                <p className="font-[var(--font-system)] text-[13px] text-stone-800 font-medium">{contact.phone}</p>
              </div>
            )}
            {contact.email && (
              <div>
                <p className="font-[var(--font-system)] text-[10px] text-stone-400 uppercase tracking-[1px]">Email</p>
                <p className="font-[var(--font-system)] text-[13px] text-stone-800 font-medium">{contact.email}</p>
              </div>
            )}
            {contact.leadScore !== null && contact.leadScore !== undefined && (
              <div>
                <p className="font-[var(--font-system)] text-[10px] text-stone-400 uppercase tracking-[1px]">Lead Score</p>
                <p className="font-[var(--font-display)] text-[16px] font-bold text-[#C8322B]">{contact.leadScore}</p>
              </div>
            )}
            {contact.opportunityStage && (
              <div>
                <p className="font-[var(--font-system)] text-[10px] text-stone-400 uppercase tracking-[1px]">Opportunity</p>
                <AdminStatusBadge status={contact.opportunityStage} />
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-3 flex gap-2 flex-shrink-0">
        <AdminButton
          variant="success"
          size="sm"
          loading={actionLoading === 'mark_resolved'}
          disabled={conversation.status === 'resolved'}
          onClick={() => handleAction('mark_resolved')}
        >
          Mark Resolved
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="sm"
          loading={actionLoading === 'create_opportunity'}
          onClick={() => handleAction('create_opportunity')}
        >
          Create Opportunity
        </AdminButton>
      </div>

      {/* Messages Area — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="font-[var(--font-system)] text-[12px] text-stone-400">No messages in this conversation yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => {
              const isOutbound = msg.direction === 'outbound'
              const ch = CHANNEL_INDICATORS[msg.channel] ?? CHANNEL_INDICATORS.web

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-2xl px-4 py-3
                      ${isOutbound
                        ? 'bg-[#3B7EA1] text-white rounded-br-md'
                        : 'bg-white border border-[rgba(214,208,196,0.6)] text-stone-800 rounded-bl-md'
                      }
                    `}
                  >
                    {/* Message Content */}
                    <p
                      className={`
                        font-[var(--font-body)] text-[13px] leading-relaxed whitespace-pre-wrap break-words
                        ${isOutbound ? 'text-white' : 'text-stone-800'}
                      `}
                    >
                      {msg.content}
                    </p>

                    {/* Meta Row: time + channel */}
                    <div
                      className={`
                        flex items-center gap-2 mt-1.5
                        ${isOutbound ? 'justify-end' : 'justify-start'}
                      `}
                    >
                      <span
                        className={`
                          font-[var(--font-system)] text-[10px]
                          ${isOutbound ? 'text-white/60' : 'text-stone-400'}
                        `}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                      <span
                        className={`
                          inline-flex items-center justify-center
                          px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide
                          ${ch.color}
                        `}
                      >
                        {ch.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Reply Bar */}
      <div className="flex-shrink-0 border-t border-[rgba(214,208,196,0.6)] bg-white px-4 py-3">
        {/* Channel Selector */}
        <div className="flex gap-1.5 mb-2">
          {(['whatsapp', 'email'] as const).map((ch) => {
            const ind = CHANNEL_INDICATORS[ch]
            const isActive = replyChannel === ch
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setReplyChannel(ch)}
                className={`
                  px-3 py-1.5 rounded-full
                  font-[var(--font-system)] text-[10px] font-semibold uppercase tracking-[0.5px]
                  transition-all min-h-[32px]
                  ${isActive
                    ? `${ind.color} shadow-sm`
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }
                `}
              >
                {ind.label} {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </button>
            )
          })}
        </div>

        {/* Input + Send */}
        <div className="flex gap-2 items-end">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendReply()
              }
            }}
            className="
              flex-1 px-3 py-2.5 rounded-xl
              border border-[rgba(214,208,196,0.6)]
              bg-[#FAF8F4] text-stone-800 text-[13px]
              font-[var(--font-body)]
              placeholder:text-stone-400
              focus:outline-none focus:ring-2 focus:ring-[#3B7EA1]/20 focus:border-[#3B7EA1]/40
              resize-none
              min-h-[44px]
            "
          />
          <AdminButton
            variant="primary"
            size="lg"
            loading={sending}
            disabled={!replyText.trim()}
            onClick={handleSendReply}
            className="flex-shrink-0"
          >
            Send
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
