'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CheckSquare, Database, Shield, Cpu, Settings2, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink,
  Copy, Eye, EyeOff, Plus, Trash2, Play, Zap, Key, Globe,
  BarChart3, Activity, Server, AlertCircle, Info, Loader2, Check,
  Sparkles, Brain, Bot, TrendingUp, Search, Link as LinkIcon,
} from 'lucide-react'
import {
  AdminCard, AdminPageHeader, AdminButton, AdminSectionLabel,
  AdminLoadingState, AdminEmptyState, AdminKPICard, AdminTabs,
} from '@/components/admin/admin-ui'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodoItem {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  actionLabel?: string
  actionUrl?: string
  actionApi?: string
  actionPayload?: Record<string, unknown>
  instructions?: string[]
  resolved: boolean
}

interface Provider {
  id: string
  name: string
  displayName: string
  hasApiKey: boolean
  apiKeyMasked: string | null
  isActive: boolean
  lastTestedAt: string | null
  testStatus: string | null
  modelConfigJson: Record<string, unknown> | null
  knownProvider: {
    color: string
    models: string[]
    capabilities: string[]
    api_endpoint: string
  } | null
}

interface Task {
  id: string
  label: string
  description: string
}

interface ModelRoute {
  id: string
  routeName: string
  primaryProviderId: string
  primaryProviderName: string
  isActive: boolean
}

interface TableHealth {
  name: string
  label: string
  count: number | null
  status: 'ok' | 'empty' | 'error'
  error?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '🟥',
  openai:    '🟩',
  google:    '🟦',
  perplexity:'🟦',
  xai:       '⬛',
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#C8322B',
  openai:    '#10A37F',
  google:    '#4285F4',
  perplexity:'#20808D',
  xai:       '#1C1917',
}

const TABS = [
  { id: 'todo',           label: 'To-Do' },
  { id: 'ai-models',      label: 'AI Models' },
  { id: 'database',       label: 'Database' },
  { id: 'variable-vault', label: 'Variable Vault' },
  { id: 'system',         label: 'System' },
]

// ── Main Component ────────────────────────────────────────────────────────────

function SettingsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'todo')

  const setTab = (tab: string) => {
    setActiveTab(tab)
    router.replace(`/admin/settings?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Platform control center — AI models, database, env vars, and action items"
      />

      {/* Tab Bar */}
      <div className="mb-6">
        <AdminTabs tabs={TABS} activeTab={activeTab} onTabChange={setTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'todo'           && <TodoTab />}
      {activeTab === 'ai-models'      && <AiModelsTab />}
      {activeTab === 'database'       && <DatabaseTab />}
      {activeTab === 'variable-vault' && <VariableVaultTab />}
      {activeTab === 'system'         && <SystemTab />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: TO-DO
// ══════════════════════════════════════════════════════════════════════════════

function TodoTab() {
  const [data, setData] = useState<{ todos: TodoItem[]; summary: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/todo')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const runAction = async (item: TodoItem) => {
    if (item.actionUrl && !item.actionApi) {
      window.location.href = item.actionUrl
      return
    }
    if (!item.actionApi) return
    setRunning(item.id)
    try {
      const res = await fetch(item.actionApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.actionPayload || {}),
      })
      if (res.ok) setDone((prev) => new Set([...prev, item.id]))
    } catch (err) {
      console.warn('[settings] action failed:', err instanceof Error ? err.message : err)
    } finally {
      setRunning(null)
    }
  }

  const filtered = data?.todos.filter((t) => !done.has(t.id)) ?? []
  const s = data?.summary

  if (loading) return <AdminLoadingState label="Checking system health..." />

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <AdminKPICard value={s.critical} label="Critical" color="#C8322B" />
          <AdminKPICard value={s.high} label="High" color="#C49A2A" />
          <AdminKPICard value={s.medium} label="Medium" color="#78716C" />
          <AdminKPICard value={s.total} label="Total" color="#1C1917" />
        </div>
      )}

      {filtered.length === 0 && (
        <AdminEmptyState
          icon={CheckCircle}
          title="All clear!"
          description="No action items detected. Platform looks healthy."
        />
      )}

      {filtered.map((item) => (
        <AdminCard key={item.id}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {item.priority === 'critical' && <XCircle size={16} style={{ color: '#C8322B' }} />}
              {item.priority === 'high'     && <AlertTriangle size={16} style={{ color: '#C49A2A' }} />}
              {item.priority === 'medium'   && <AlertCircle size={16} style={{ color: '#78716C' }} />}
              {item.priority === 'low'      && <Info size={16} style={{ color: '#A8A29E' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                  {item.title}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full" style={{
                  fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-system)',
                  backgroundColor: item.priority === 'critical' ? 'rgba(200,50,43,0.08)' :
                                   item.priority === 'high' ? 'rgba(196,154,42,0.08)' :
                                   item.priority === 'medium' ? 'rgba(120,113,108,0.08)' :
                                   'rgba(168,162,158,0.08)',
                  color: item.priority === 'critical' ? '#C8322B' :
                         item.priority === 'high' ? '#C49A2A' :
                         item.priority === 'medium' ? '#78716C' : '#A8A29E',
                }}>
                  {item.priority}
                </span>
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.category}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', lineHeight: 1.6 }} className="mt-1.5">
                {item.description}
              </p>

              {item.instructions && item.instructions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {item.instructions.map((step, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#57534E', lineHeight: 1.5 }}>
                      {step}
                    </li>
                  ))}
                </ul>
              )}

              {item.actionLabel && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <AdminButton
                    variant="primary"
                    size="sm"
                    onClick={() => runAction(item)}
                    disabled={running === item.id}
                    loading={running === item.id}
                  >
                    <Play size={11} />
                    {item.actionLabel}
                  </AdminButton>
                  {item.actionUrl && (
                    <a href={item.actionUrl} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-stone-100"
                       style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600, color: '#78716C', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      <ExternalLink size={11} />
                      Open
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </AdminCard>
      ))}

      <div className="flex justify-end">
        <AdminButton variant="ghost" size="sm" onClick={load}>
          <RefreshCw size={11} />
          Refresh
        </AdminButton>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: AI MODELS
// ══════════════════════════════════════════════════════════════════════════════

function AiModelsTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [catalogue, setCatalogue] = useState<Record<string, { models: string[]; color: string; capabilities: string[]; api_endpoint: string }>>({})
  const [tasks, setTasks] = useState<Task[]>([])
  const [routes, setRoutes] = useState<ModelRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [modelInput, setModelInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; error?: string }>>({})
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'providers' | 'task-router'>('providers')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [provRes, routeRes] = await Promise.all([
        fetch('/api/admin/ai-models'),
        fetch('/api/admin/ai-models?view=routes'),
      ])
      if (provRes.ok) {
        const d = await provRes.json()
        setProviders(d.providers || [])
        setCatalogue(d.catalogue || {})
        setTasks(d.tasks || [])
      }
      if (routeRes.ok) {
        const d = await routeRes.json()
        setRoutes(d.routes || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveProvider = async (providerName: string) => {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      const cat = catalogue[providerName]
      await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_provider',
          name: providerName,
          apiKey: keyInput.trim(),
          modelConfigJson: { defaultModel: modelInput || cat?.models[0] },
        }),
      })
      setKeyInput('')
      setModelInput('')
      setAddingKey(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const testProvider = async (provider: Provider) => {
    setTesting(provider.id)
    try {
      const res = await fetch('/api/admin/ai-models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      })
      const result = await res.json()
      setTestResult((prev) => ({ ...prev, [provider.id]: result }))
      await load()
    } finally {
      setTesting(null)
    }
  }

  const toggleProvider = async (provider: Provider) => {
    await fetch('/api/admin/ai-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_provider', id: provider.id }),
    })
    await load()
  }

  const saveRoute = async (routeName: string, primaryProviderId: string) => {
    await fetch('/api/admin/ai-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_route', routeName, primaryProviderId }),
    })
    await load()
  }

  if (loading) return <AdminLoadingState label="Loading AI providers..." />

  const configuredProviders = Object.keys(catalogue).filter((k) =>
    providers.some((p) => p.name === k)
  )
  const unconfiguredProviders = Object.keys(catalogue).filter((k) =>
    !providers.some((p) => p.name === k)
  )

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['providers', 'task-router'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
                  className={`admin-filter-pill ${view === v ? 'active' : ''}`}>
            {v === 'providers' ? 'API Keys & Providers' : 'Task Router'}
          </button>
        ))}
      </div>

      {/* ── Providers View ── */}
      {view === 'providers' && (
        <div className="space-y-4">
          <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
            Add API keys for each AI provider. Keys are encrypted at rest using AES-256-GCM.
          </p>

          {/* Configured providers */}
          {providers.map((provider) => {
            const cat = catalogue[provider.name]
            const color = PROVIDER_COLORS[provider.name] || '#1C1917'
            const tr = testResult[provider.id]
            const isAdding = addingKey === provider.id

            return (
              <AdminCard key={provider.id}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4"
                     style={{ paddingBottom: 12, borderBottom: '1px solid rgba(214,208,196,0.6)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                         style={{ backgroundColor: color }}>
                      {PROVIDER_ICONS[provider.name] || '🤖'}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                        {provider.displayName}
                      </div>
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#78716C', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        {cat?.capabilities.join(' · ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status */}
                    {provider.testStatus && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                        fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-system)',
                        backgroundColor: provider.testStatus === 'success' ? 'rgba(45,90,61,0.08)' : 'rgba(200,50,43,0.08)',
                        color: provider.testStatus === 'success' ? '#2D5A3D' : '#C8322B',
                      }}>
                        {provider.testStatus === 'success' ? '✓ Connected' : '✗ Failed'}
                      </span>
                    )}
                    {/* Active toggle */}
                    <button onClick={() => toggleProvider(provider)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg transition-all"
                            style={{
                              fontFamily: 'var(--font-system)', fontSize: 9, letterSpacing: '0.3px', fontWeight: 600,
                              backgroundColor: provider.isActive ? 'rgba(45,90,61,0.08)' : 'rgba(120,113,108,0.08)',
                              color: provider.isActive ? '#2D5A3D' : '#78716C',
                            }}>
                      {provider.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {/* Key row */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Key size={13} style={{ color: '#78716C' }} />
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#57534E' }}>
                      {provider.hasApiKey ? provider.apiKeyMasked : 'No API key stored'}
                    </span>
                    {provider.hasApiKey && (
                      <AdminButton variant="ghost" size="sm"
                                   onClick={() => { setAddingKey(isAdding ? null : provider.id); setKeyInput('') }}>
                        {isAdding ? 'Cancel' : 'Update Key'}
                      </AdminButton>
                    )}
                  </div>

                  {/* Default model */}
                  {provider.modelConfigJson?.defaultModel && (
                    <div className="flex items-center gap-2">
                      <Bot size={12} style={{ color: '#A8A29E' }} />
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                        Default model: {String(provider.modelConfigJson.defaultModel)}
                      </span>
                    </div>
                  )}

                  {/* Update key form */}
                  {isAdding && (
                    <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
                      <div className="relative">
                        <input type={showKey ? 'text' : 'password'}
                               value={keyInput}
                               onChange={(e) => setKeyInput(e.target.value)}
                               placeholder="Paste your API key..."
                               className="admin-input w-full"
                               style={{ fontSize: 11, paddingRight: 36 }} />
                        <button onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                style={{ color: '#78716C' }}>
                          {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>

                      <select value={modelInput}
                              onChange={(e) => setModelInput(e.target.value)}
                              className="admin-select w-full"
                              style={{ fontSize: 11 }}>
                        <option value="">Select default model...</option>
                        {cat?.models.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>

                      <div className="flex gap-2">
                        <AdminButton variant="primary" size="sm"
                                     onClick={() => saveProvider(provider.name)}
                                     disabled={saving || !keyInput.trim()}
                                     loading={saving}>
                          <Check size={11} />
                          Save Key
                        </AdminButton>
                      </div>
                    </div>
                  )}

                  {/* Test result */}
                  {tr && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{
                      fontFamily: 'var(--font-system)', fontSize: 10,
                      backgroundColor: tr.success ? 'rgba(45,90,61,0.06)' : 'rgba(200,50,43,0.06)',
                      color: tr.success ? '#2D5A3D' : '#C8322B',
                    }}>
                      {tr.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {tr.success ? 'API key is valid — connection successful!' : `Failed: ${tr.error}`}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {provider.hasApiKey && (
                      <AdminButton variant="secondary" size="sm"
                                   onClick={() => testProvider(provider)}
                                   disabled={testing === provider.id}
                                   loading={testing === provider.id}>
                        <Zap size={11} />
                        Test Connection
                      </AdminButton>
                    )}
                    {!isAdding && !provider.hasApiKey && (
                      <AdminButton variant="primary" size="sm"
                                   onClick={() => { setAddingKey(provider.id); setKeyInput('') }}>
                        <Plus size={11} />
                        Add API Key
                      </AdminButton>
                    )}
                  </div>
                </div>
              </AdminCard>
            )
          })}

          {/* Unconfigured providers */}
          {unconfiguredProviders.length > 0 && (
            <div>
              <AdminSectionLabel>Available Providers</AdminSectionLabel>
              <div className="grid sm:grid-cols-2 gap-3">
                {unconfiguredProviders.map((name) => {
                  const cat = catalogue[name]
                  const color = PROVIDER_COLORS[name] || '#1C1917'
                  const isAdding = addingKey === name

                  return (
                    <div key={name} className="rounded-xl p-4"
                         style={{ backgroundColor: 'rgba(120,113,108,0.04)', border: '1px dashed rgba(214,208,196,0.8)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                             style={{ backgroundColor: color, color: '#fff' }}>
                          {PROVIDER_ICONS[name] || '🤖'}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                            {cat?.capabilities ? name.charAt(0).toUpperCase() + name.slice(1) : name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', letterSpacing: '0.5px' }}>
                            Not configured
                          </div>
                        </div>
                      </div>

                      {isAdding ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input type={showKey ? 'text' : 'password'}
                                   value={keyInput}
                                   onChange={(e) => setKeyInput(e.target.value)}
                                   placeholder="Paste API key..."
                                   className="admin-input w-full"
                                   style={{ fontSize: 11, paddingRight: 36 }} />
                            <button onClick={() => setShowKey(!showKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: '#78716C' }}>
                              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                          <select value={modelInput} onChange={(e) => setModelInput(e.target.value)}
                                  className="admin-select w-full"
                                  style={{ fontSize: 11 }}>
                            <option value="">Default model...</option>
                            {cat?.models.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <AdminButton variant="primary" size="sm"
                                         onClick={() => saveProvider(name)}
                                         disabled={saving || !keyInput.trim()}
                                         loading={saving}>
                              <Check size={11} />
                              Save
                            </AdminButton>
                            <AdminButton variant="ghost" size="sm" onClick={() => setAddingKey(null)}>
                              Cancel
                            </AdminButton>
                          </div>
                        </div>
                      ) : (
                        <AdminButton variant="primary" size="sm"
                                     onClick={() => { setAddingKey(name); setKeyInput('') }}>
                          <Plus size={11} />
                          Connect
                        </AdminButton>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Task Router View ── */}
      {view === 'task-router' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4"
               style={{ backgroundColor: 'rgba(200,50,43,0.06)', border: '1px solid rgba(200,50,43,0.15)' }}>
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#57534E', lineHeight: 1.7 }}>
              <strong>Task Router</strong> — Assign each pipeline task to a specific AI provider. For example: use xAI Grok for topic research, Claude for content writing, Perplexity for fact checking, and Gemini for SEO audits.
            </p>
          </div>

          {providers.length === 0 && (
            <AdminEmptyState
              icon={Brain}
              title="No providers configured"
              description="Add API keys first."
              action={
                <AdminButton variant="primary" size="sm" onClick={() => setView('providers')}>
                  <Plus size={11} />
                  Add Provider
                </AdminButton>
              }
            />
          )}

          {providers.length > 0 && tasks.map((task) => {
            const currentRoute = routes.find((r) => r.routeName === task.id)
            const currentProvider = currentRoute?.primaryProviderId

            return (
              <AdminCard key={task.id}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                      {task.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                      {task.description}
                    </div>
                  </div>
                  <select
                    value={currentProvider || ''}
                    onChange={(e) => { if (e.target.value) saveRoute(task.id, e.target.value) }}
                    className="admin-select min-w-[160px]"
                    style={{ fontSize: 10 }}>
                    <option value="">— no route —</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
              </AdminCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DATABASE
// ══════════════════════════════════════════════════════════════════════════════

function DatabaseTab() {
  const [data, setData] = useState<{
    overallHealth: string
    dbConnected: boolean
    dbLatencyMs: number | null
    tables: TableHealth[]
    errorCount: number
    checkedAt: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{ message: string; instructions?: string[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/db-status')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const runMigration = async () => {
    setMigrating(true)
    try {
      const res = await fetch('/api/admin/settings/db-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_migration' }),
      })
      setMigrationResult(await res.json())
    } finally {
      setMigrating(false)
    }
  }

  if (loading) return <AdminLoadingState label="Checking database health..." />

  const healthColor = data?.overallHealth === 'healthy' ? '#2D5A3D' : data?.overallHealth === 'degraded' ? '#C49A2A' : '#C8322B'

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <AdminCard>
        <div className="flex items-center justify-between mb-4">
          <AdminSectionLabel>Database Connection</AdminSectionLabel>
          <AdminButton variant="ghost" size="sm" onClick={load}><RefreshCw size={11} /></AdminButton>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <AdminKPICard
            value={data?.dbConnected ? 'Online' : 'Offline'}
            label="Status"
            color={data?.dbConnected ? '#2D5A3D' : '#C8322B'}
          />
          <AdminKPICard
            value={data?.dbLatencyMs !== null ? `${data?.dbLatencyMs}ms` : '—'}
            label="Latency"
          />
          <AdminKPICard
            value={data?.overallHealth || '—'}
            label="Health"
            color={healthColor}
          />
        </div>
      </AdminCard>

      {/* Migration section */}
      <AdminCard>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#1C1917' }} className="mb-2">
          Database Migrations
        </div>
        <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', lineHeight: 1.6 }} className="mb-4">
          Migrations run automatically on each Vercel deployment. Use the button below to see migration instructions if you need to run them manually.
        </p>
        <AdminButton variant="primary" onClick={runMigration} disabled={migrating} loading={migrating}>
          <Database size={13} />
          View Migration Instructions
        </AdminButton>

        {migrationResult && (
          <div className="mt-4 rounded-xl p-4 admin-card-inset">
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#57534E' }} className="mb-2">
              {migrationResult.message}
            </p>
            {migrationResult.instructions && (
              <ul className="space-y-1.5">
                {migrationResult.instructions.map((inst, i) => (
                  <li key={i} style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#1C1917', lineHeight: 1.5 }}>
                    {inst}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </AdminCard>

      {/* Table health grid */}
      <div>
        <AdminSectionLabel>Table Health — {data?.tables.length} tables checked</AdminSectionLabel>
        <div className="grid sm:grid-cols-2 gap-2">
          {data?.tables.map((table) => (
            <div key={table.name} className="admin-card flex items-center gap-3 !py-3 !px-4">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                table.status === 'ok' ? 'bg-[#2D5A3D]' :
                table.status === 'empty' ? 'bg-[#C49A2A]' : 'bg-[#C8322B]'
              }`} />
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>{table.label}</div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#78716C' }}>
                  {table.error || (table.count !== null ? `${table.count.toLocaleString()} records` : '—')}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#78716C' }}>
                {table.count !== null ? table.count.toLocaleString() : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* External tools */}
      <div className="grid sm:grid-cols-2 gap-3">
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
           className="admin-card flex items-center gap-3 transition-all hover:shadow-md">
          <Server size={20} style={{ color: '#2D5A3D' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>Open Supabase</div>
            <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>View tables, run SQL, manage data</div>
          </div>
          <ExternalLink size={13} style={{ color: '#78716C', marginLeft: 'auto' }} />
        </a>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
           className="admin-card flex items-center gap-3 transition-all hover:shadow-md">
          <Globe size={20} style={{ color: '#1C1917' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>Open Vercel</div>
            <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>Deployments, env vars, functions</div>
          </div>
          <ExternalLink size={13} style={{ color: '#78716C', marginLeft: 'auto' }} />
        </a>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: VARIABLE VAULT
// ══════════════════════════════════════════════════════════════════════════════

function VariableVaultTab() {
  const ENV_GROUPS = [
    {
      label: 'Critical — App will not start without these',
      color: '#C8322B',
      vars: [
        { key: 'DATABASE_URL', hint: 'PostgreSQL connection string from Supabase' },
        { key: 'NEXTAUTH_SECRET', hint: 'Random 32+ char string for session encryption' },
        { key: 'NEXTAUTH_URL', hint: 'Your full app URL e.g. https://yalla-london.vercel.app' },
        { key: 'ADMIN_PASSWORD_HASH', hint: 'bcrypt hash of admin password' },
      ],
    },
    {
      label: 'Content Generation — Pipeline will fail without these',
      color: '#C49A2A',
      vars: [
        { key: 'GROK_API_KEY', hint: 'xAI Grok — primary content generation model' },
        { key: 'ENCRYPTION_KEY', hint: 'AES-256 key for encrypting stored API keys' },
      ],
    },
    {
      label: 'SEO & Indexing',
      color: '#3B7EA1',
      vars: [
        { key: 'INDEXNOW_KEY', hint: 'Shared key for IndexNow (Google/Bing submission)' },
        { key: 'GOOGLE_SEARCH_CONSOLE_SITE', hint: 'Your GSC site URL for sitemap submission' },
      ],
    },
    {
      label: 'Optional AI Providers',
      color: '#78716C',
      vars: [
        { key: 'ANTHROPIC_API_KEY', hint: 'Claude API — configure in AI Models tab instead' },
        { key: 'OPENAI_API_KEY', hint: 'OpenAI GPT — configure in AI Models tab instead' },
        { key: 'PERPLEXITY_API_KEY', hint: 'Perplexity Sonar — configure in AI Models tab instead' },
        { key: 'GOOGLE_AI_API_KEY', hint: 'Gemini — configure in AI Models tab instead' },
      ],
    },
    {
      label: 'Analytics & Monitoring',
      color: '#2D5A3D',
      vars: [
        { key: 'GA4_MEASUREMENT_ID', hint: 'Google Analytics 4 measurement ID (G-XXXXXXXX)' },
        { key: 'CRON_SECRET', hint: 'Optional secret to protect cron endpoints' },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4"
           style={{ backgroundColor: 'rgba(59,126,161,0.06)', border: '1px solid rgba(59,126,161,0.15)' }}>
        <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#57534E', lineHeight: 1.7 }}>
          Environment variables are configured in <strong>Vercel → Project → Settings → Environment Variables</strong>.
          They cannot be edited here for security reasons. This list tells you what each variable does.
        </p>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
           className="inline-block mt-3">
          <AdminButton variant="primary" size="sm">
            <ExternalLink size={11} />
            Open Vercel Environment Variables
          </AdminButton>
        </a>
      </div>

      {ENV_GROUPS.map((group) => (
        <div key={group.label}>
          <p style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: group.color, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 8 }}>
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.vars.map(({ key, hint }) => (
              <div key={key} className="admin-card flex items-start gap-3 !py-3 !px-4">
                <Key size={12} style={{ color: group.color, marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#1C1917' }}>{key}</div>
                  <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', lineHeight: 1.5 }}>{hint}</div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(key)}
                        className="p-1 rounded hover:bg-stone-100 transition-colors flex-shrink-0"
                        title="Copy variable name">
                  <Copy size={11} style={{ color: '#A8A29E' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center">
        <Link href="/admin/variable-vault" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#3B7EA1', textDecoration: 'underline' }}>
          View full Variable Vault (per-site variables) →
        </Link>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function SystemTab() {
  const QUICK_LINKS = [
    { label: 'Theme & Branding',    href: '/admin/settings/theme',          icon: Sparkles, desc: 'Colors, fonts, logo' },
    { label: 'Feature Flags',       href: '/admin/settings/feature-flags',  icon: Settings2, desc: 'Enable/disable platform features' },
    { label: 'Cron Job Logs',       href: '/admin/cron-logs',               icon: Clock, desc: 'View all cron run history' },
    { label: 'Health Monitoring',   href: '/admin/health-monitoring',       icon: Activity, desc: 'System health & alerts' },
    { label: 'Audit Logs',          href: '/admin/audit-logs',              icon: Shield, desc: 'Security & change history' },
    { label: 'API Security',        href: '/admin/api-security',            icon: Key, desc: 'Rate limits & key management' },
    { label: 'Full Variable Vault', href: '/admin/variable-vault',          icon: Database, desc: 'Per-site environment variables' },
    { label: 'Command Center',      href: '/admin/command-center/sites',    icon: Globe, desc: 'Multi-site management' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <AdminSectionLabel>Quick Access</AdminSectionLabel>
        <div className="grid sm:grid-cols-2 gap-2">
          {QUICK_LINKS.map(({ label, href, icon: Icon, desc }) => (
            <Link key={href} href={href}
               className="admin-card flex items-center gap-3 transition-all hover:shadow-md">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: 'rgba(200,50,43,0.08)' }}>
                <Icon size={14} style={{ color: '#C8322B' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>{desc}</div>
              </div>
              <ChevronRight size={13} style={{ color: '#A8A29E', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Export with Suspense (required for useSearchParams) ──────────────────────

export default function SettingsPage() {
  return (
    <Suspense fallback={<AdminLoadingState label="Loading settings..." />}>
      <SettingsPageInner />
    </Suspense>
  )
}
