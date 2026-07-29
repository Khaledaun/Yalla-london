'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AdminCard,
  AdminPageHeader,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminTabs,
  AdminButton,
} from '@/components/admin/admin-ui'

// ─── Types ─────────────────────────────────────────────────────────

interface Conversation {
  id: string
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  channel: 'whatsapp' | 'email' | 'web'
  status: 'active' | 'resolved' | 'pending'
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
}

interface ConversationsResponse {
  conversations: Conversation[]
  total: number
  page: number
  pageSize: number
}

// ─── Helpers ───────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, { icon: string; color: string }> = {
  whatsapp: { icon: 'WA', color: 'bg-[#25D366] text-white' },
  email: { icon: '@', color: 'bg-[#3B7EA1] text-white' },
  web: { icon: 'WEB', color: 'bg-[#C49A2A] text-white' },
}

const CHANNEL_TABS = [
  { id: 'all', label: 'All' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'web', label: 'Web' },
]

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMon = Math.floor(diffDay / 30)
  return `${diffMon}mo ago`
}

function truncate(text: string | null, max: number): string {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '\u2026'
}

// ─── Empty State Icon ──────────────────────────────────────────────

function InboxIcon({ size, color }: { size?: number | string; color?: string }) {
  return (
    <span style={{ fontSize: size, color }} aria-hidden="true">
      {'[inbox]'}
    </span>
  )
}

// ─── Page Component ────────────────────────────────────────────────

export default function CommunicationsPage() {
  const router = useRouter()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeChannel !== 'all') params.set('channel', activeChannel)
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/admin/communications?${params.toString()}`, {
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data: ConversationsResponse = await res.json()
      setConversations(data.conversations ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      console.warn('[communications] fetch failed:', err instanceof Error ? err.message : err)
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [activeChannel, search, page])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [activeChannel, search])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // ─── Search Debounce ─────────────────────────────────────────────

  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] px-4 py-6 max-w-3xl mx-auto">
      <AdminPageHeader
        title="Communications Hub"
        subtitle="Unified inbox across all channels"
      />

      {/* Channel Filter Tabs */}
      <div className="mb-4">
        <AdminTabs
          tabs={CHANNEL_TABS}
          activeTab={activeChannel}
          onTabChange={(id) => setActiveChannel(id)}
        />
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="
            w-full px-4 py-3 rounded-xl
            border border-[rgba(214,208,196,0.6)]
            bg-white text-stone-800 text-sm
            font-[var(--font-system)]
            placeholder:text-stone-400
            focus:outline-none focus:ring-2 focus:ring-[#C8322B]/20 focus:border-[#C8322B]/40
            min-h-[44px]
          "
        />
      </div>

      {/* Error Banner */}
      {error && (
        <AdminCard className="mb-4 border-l-[3px] border-l-[#C8322B]">
          <p className="font-[var(--font-system)] text-sm text-[#9B2520]">{error}</p>
          <AdminButton variant="ghost" size="sm" onClick={fetchConversations} className="mt-2">
            Retry
          </AdminButton>
        </AdminCard>
      )}

      {/* Loading */}
      {loading && <AdminLoadingState label="Loading conversations..." />}

      {/* Empty State */}
      {!loading && !error && conversations.length === 0 && (
        <AdminEmptyState
          icon={InboxIcon}
          title="No conversations"
          description={
            search
              ? 'No conversations match your search. Try a different query.'
              : 'No conversations yet. Incoming messages from WhatsApp, email, and web will appear here.'
          }
        />
      )}

      {/* Conversation List */}
      {!loading && conversations.length > 0 && (
        <div className="flex flex-col gap-2">
          {conversations.map((conv) => {
            const ch = CHANNEL_LABELS[conv.channel] ?? CHANNEL_LABELS.web
            const contactDisplay =
              conv.contactName || conv.contactPhone || conv.contactEmail || 'Unknown Contact'

            return (
              <AdminCard
                key={conv.id}
                className="cursor-pointer hover:shadow-[0_2px_8px_rgba(28,25,23,0.08),0_8px_24px_rgba(28,25,23,0.06)] active:scale-[0.99] transition-all"
              >
                <div
                  onClick={() => router.push(`/admin/communications/${conv.id}`)}
                  className="flex items-start gap-3 min-h-[44px]"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/admin/communications/${conv.id}`)
                    }
                  }}
                >
                  {/* Channel Badge */}
                  <div
                    className={`
                      flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      font-[var(--font-system)] text-[10px] font-bold tracking-wide
                      ${ch.color}
                    `}
                  >
                    {ch.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`
                            font-[var(--font-display)] text-sm leading-tight truncate
                            ${conv.unreadCount > 0 ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}
                          `}
                        >
                          {contactDisplay}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C8322B] text-white text-[10px] font-bold flex items-center justify-center">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="flex-shrink-0 font-[var(--font-system)] text-[11px] text-stone-400 whitespace-nowrap">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>

                    <p className="font-[var(--font-system)] text-[12px] text-stone-500 mt-0.5 truncate leading-relaxed">
                      {truncate(conv.lastMessagePreview, 100) || 'No messages yet'}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <AdminStatusBadge status={conv.status} />
                      {conv.contactPhone && conv.channel !== 'whatsapp' && (
                        <span className="font-[var(--font-system)] text-[10px] text-stone-400">
                          {conv.contactPhone}
                        </span>
                      )}
                      {conv.contactEmail && conv.channel !== 'email' && (
                        <span className="font-[var(--font-system)] text-[10px] text-stone-400 truncate max-w-[140px]">
                          {conv.contactEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AdminCard>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <AdminButton
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </AdminButton>
          <span className="font-[var(--font-system)] text-[11px] text-stone-500 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <AdminButton
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </AdminButton>
        </div>
      )}
    </div>
  )
}
