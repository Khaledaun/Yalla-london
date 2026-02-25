'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckSquare, Database, Shield, Cpu, Settings2, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink,
  Copy, Eye, EyeOff, Plus, Trash2, Play, Zap, Key, Globe,
  BarChart3, Activity, Server, AlertCircle, Info, Loader2, Check,
  Sparkles, Brain, Bot, TrendingUp, Search, Link as LinkIcon,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodoItem {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  actionApi?: string;
  actionPayload?: Record<string, unknown>;
  instructions?: string[];
  resolved: boolean;
}

interface Provider {
  id: string;
  name: string;
  displayName: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  isActive: boolean;
  lastTestedAt: string | null;
  testStatus: string | null;
  modelConfigJson: Record<string, unknown> | null;
  knownProvider: {
    color: string;
    models: string[];
    capabilities: string[];
    api_endpoint: string;
  } | null;
}

interface Task {
  id: string;
  label: string;
  description: string;
}

interface ModelRoute {
  id: string;
  routeName: string;
  primaryProviderId: string;
  primaryProviderName: string;
  isActive: boolean;
}

interface TableHealth {
  name: string;
  label: string;
  count: number | null;
  status: 'ok' | 'empty' | 'error';
  error?: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  neu: (extra = '') =>
    `rounded-xl transition-all ${extra}`,
  card: 'rounded-xl p-5',
  input: `w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200`,
  btn: (variant: 'primary' | 'ghost' | 'danger' = 'ghost', size: 'sm' | 'md' = 'md') => {
    const base = `inline-flex items-center gap-1.5 font-medium rounded-lg transition-all ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`;
    if (variant === 'primary') return `${base} bg-red-600 text-white hover:bg-red-700`;
    if (variant === 'danger') return `${base} bg-red-50 text-red-600 hover:bg-red-100`;
    return `${base} bg-stone-100 text-stone-700 hover:bg-stone-200`;
  },
  priorityBadge: (p: string) => {
    const map: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border border-red-200',
      high: 'bg-orange-100 text-orange-700 border border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      low: 'bg-stone-100 text-stone-600 border border-stone-200',
    };
    return `text-xs px-2 py-0.5 rounded-full font-medium ${map[p] || map.low}`;
  },
  statusDot: (s: string) => {
    const map: Record<string, string> = {
      success: 'bg-green-500',
      ok: 'bg-green-500',
      failed: 'bg-red-500',
      error: 'bg-red-500',
      empty: 'bg-yellow-500',
      pending: 'bg-stone-400',
    };
    return `w-2 h-2 rounded-full ${map[s] || 'bg-stone-300'}`;
  },
};

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '🟥',
  openai:    '🟩',
  google:    '🟦',
  perplexity:'🟦',
  xai:       '⬛',
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#C8322B',
  openai:    '#10A37F',
  google:    '#4285F4',
  perplexity:'#20808D',
  xai:       '#1C1917',
};

const TABS = [
  { id: 'todo',          label: 'To-Do',         icon: CheckSquare },
  { id: 'ai-models',     label: 'AI Models',      icon: Brain },
  { id: 'database',      label: 'Database',       icon: Database },
  { id: 'variable-vault',label: 'Variable Vault', icon: Shield },
  { id: 'system',        label: 'System',         icon: Settings2 },
];

// ── Main Component ────────────────────────────────────────────────────────────

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'todo');

  const setTab = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/admin/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--neu-bg,#EDE9E1)' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 22, color: '#1C1917' }}>
          Settings
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C', letterSpacing: 0.3 }} className="mt-1">
          Platform control center — AI models, database, env vars, and action items
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto"
           style={{ backgroundColor: 'rgba(120,113,108,0.08)', scrollbarWidth: 'none' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeTab === id ? 'bg-white shadow-sm text-red-700' : 'text-stone-600 hover:text-stone-900'}`}
                  style={activeTab === id ? { fontFamily: "'Anybody',sans-serif", fontWeight: 700 } : { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 0.5 }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'todo'           && <TodoTab />}
      {activeTab === 'ai-models'      && <AiModelsTab />}
      {activeTab === 'database'       && <DatabaseTab />}
      {activeTab === 'variable-vault' && <VariableVaultTab />}
      {activeTab === 'system'         && <SystemTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: TO-DO
// ══════════════════════════════════════════════════════════════════════════════

function TodoTab() {
  const [data, setData] = useState<{ todos: TodoItem[]; summary: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/todo');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = async (item: TodoItem) => {
    if (item.actionUrl && !item.actionApi) {
      window.location.href = item.actionUrl;
      return;
    }
    if (!item.actionApi) return;
    setRunning(item.id);
    try {
      const res = await fetch(item.actionApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.actionPayload || {}),
      });
      if (res.ok) setDone((prev) => new Set([...prev, item.id]));
    } finally {
      setRunning(null);
    }
  };

  const filtered = data?.todos.filter((t) => !done.has(t.id)) ?? [];
  const s = data?.summary;

  if (loading) return <LoadingCard label="Checking system health..." />;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          {[
            { label: 'Critical', val: s.critical, color: '#C8322B', bg: 'rgba(200,50,43,0.08)' },
            { label: 'High',     val: s.high,     color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
            { label: 'Medium',   val: s.medium,   color: '#78716C', bg: 'rgba(120,113,108,0.08)' },
            { label: 'Total',    val: s.total,    color: '#1C1917', bg: 'rgba(28,25,23,0.05)' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="rounded-xl p-4 text-center"
                 style={{ backgroundColor: bg }}>
              <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 26, color }}>{val}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
             style={{ backgroundColor: 'rgba(45,90,61,0.06)' }}>
          <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#2D5A3D' }} />
          <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, color: '#2D5A3D', fontSize: 16 }}>All clear!</div>
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }} className="mt-1">
            No action items detected. Platform looks healthy.
          </p>
        </div>
      )}

      {filtered.map((item) => (
        <div key={item.id} className="rounded-xl p-5"
             style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: 'var(--neu-raised,3px 3px 8px #CAC5BC, -2px -2px 6px #FDFAF5)' }}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {item.priority === 'critical' && <XCircle size={16} style={{ color: '#C8322B' }} />}
              {item.priority === 'high'     && <AlertTriangle size={16} style={{ color: '#D97706' }} />}
              {item.priority === 'medium'   && <AlertCircle size={16} style={{ color: '#78716C' }} />}
              {item.priority === 'low'      && <Info size={16} style={{ color: '#A8A29E' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                  {item.title}
                </span>
                <span className={S.priorityBadge(item.priority)}>{item.priority}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {item.category}
                </span>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C', lineHeight: 1.6 }} className="mt-1.5">
                {item.description}
              </p>

              {item.instructions && item.instructions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {item.instructions.map((step, i) => (
                    <li key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#57534E', lineHeight: 1.5 }}>
                      {step}
                    </li>
                  ))}
                </ul>
              )}

              {item.actionLabel && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button onClick={() => runAction(item)}
                          disabled={running === item.id}
                          className={S.btn('primary', 'sm')}>
                    {running === item.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                    {item.actionLabel}
                  </button>
                  {item.actionUrl && (
                    <a href={item.actionUrl} className={S.btn('ghost', 'sm')}>
                      <ExternalLink size={11} />
                      Open
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button onClick={load} className={S.btn('ghost', 'sm')}>
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: AI MODELS
// ══════════════════════════════════════════════════════════════════════════════

function AiModelsTab() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [catalogue, setCatalogue] = useState<Record<string, { models: string[]; color: string; capabilities: string[]; api_endpoint: string }>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routes, setRoutes] = useState<ModelRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; error?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'providers' | 'task-router'>('providers');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, routeRes] = await Promise.all([
        fetch('/api/admin/ai-models'),
        fetch('/api/admin/ai-models?view=routes'),
      ]);
      if (provRes.ok) {
        const d = await provRes.json();
        setProviders(d.providers || []);
        setCatalogue(d.catalogue || {});
        setTasks(d.tasks || []);
      }
      if (routeRes.ok) {
        const d = await routeRes.json();
        setRoutes(d.routes || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProvider = async (providerName: string) => {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      const cat = catalogue[providerName];
      await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_provider',
          name: providerName,
          apiKey: keyInput.trim(),
          modelConfigJson: { defaultModel: modelInput || cat?.models[0] },
        }),
      });
      setKeyInput('');
      setModelInput('');
      setAddingKey(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (provider: Provider) => {
    setTesting(provider.id);
    try {
      const res = await fetch('/api/admin/ai-models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      });
      const result = await res.json();
      setTestResult((prev) => ({ ...prev, [provider.id]: result }));
      await load();
    } finally {
      setTesting(null);
    }
  };

  const toggleProvider = async (provider: Provider) => {
    await fetch('/api/admin/ai-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_provider', id: provider.id }),
    });
    await load();
  };

  const saveRoute = async (routeName: string, primaryProviderId: string) => {
    await fetch('/api/admin/ai-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_route', routeName, primaryProviderId }),
    });
    await load();
  };

  if (loading) return <LoadingCard label="Loading AI providers..." />;

  const configuredProviders = Object.keys(catalogue).filter((k) =>
    providers.some((p) => p.name === k)
  );
  const unconfiguredProviders = Object.keys(catalogue).filter((k) =>
    !providers.some((p) => p.name === k)
  );

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['providers', 'task-router'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${view === v ? 'bg-white shadow text-red-700' : 'text-stone-500 hover:text-stone-700'}`}
                  style={{ fontFamily: view === v ? "'Anybody',sans-serif" : "'IBM Plex Mono',monospace", fontWeight: view === v ? 700 : 400, letterSpacing: view !== v ? 0.5 : 0 }}>
            {v === 'providers' ? '🔑 API Keys & Providers' : '🗺️ Task Router'}
          </button>
        ))}
      </div>

      {/* ── Providers View ── */}
      {view === 'providers' && (
        <div className="space-y-4">
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>
            Add API keys for each AI provider. Keys are encrypted at rest using AES-256-GCM.
          </p>

          {/* Configured providers */}
          {providers.map((provider) => {
            const cat = catalogue[provider.name];
            const color = PROVIDER_COLORS[provider.name] || '#1C1917';
            const tr = testResult[provider.id];
            const isAdding = addingKey === provider.id;

            return (
              <div key={provider.id} className="rounded-xl overflow-hidden"
                   style={{ boxShadow: 'var(--neu-raised,3px 3px 8px #CAC5BC, -2px -2px 6px #FDFAF5)', backgroundColor: 'var(--neu-bg,#EDE9E1)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4"
                     style={{ borderBottom: '1px solid rgba(120,113,108,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                         style={{ backgroundColor: color }}>
                      {PROVIDER_ICONS[provider.name] || '🤖'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                        {provider.displayName}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {cat?.capabilities.join(' · ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status */}
                    {provider.testStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${provider.testStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9 }}>
                        {provider.testStatus === 'success' ? '✓ Connected' : '✗ Failed'}
                      </span>
                    )}
                    {/* Active toggle */}
                    <button onClick={() => toggleProvider(provider)}
                            className={`text-xs px-2.5 py-1 rounded-lg transition-all ${provider.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}
                            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: 0.3 }}>
                      {provider.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {/* Key row */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Key size={13} style={{ color: '#78716C' }} />
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#57534E' }}>
                      {provider.hasApiKey ? provider.apiKeyMasked : 'No API key stored'}
                    </span>
                    {provider.hasApiKey && (
                      <button onClick={() => { setAddingKey(isAdding ? null : provider.id); setKeyInput(''); }}
                              className={S.btn('ghost', 'sm')}>
                        {isAdding ? 'Cancel' : 'Update Key'}
                      </button>
                    )}
                  </div>

                  {/* Default model */}
                  {provider.modelConfigJson?.defaultModel && (
                    <div className="flex items-center gap-2">
                      <Bot size={12} style={{ color: '#A8A29E' }} />
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                        Default model: {String(provider.modelConfigJson.defaultModel)}
                      </span>
                    </div>
                  )}

                  {/* Update key form */}
                  {isAdding && (
                    <div className="space-y-2 pt-2 border-t border-stone-200">
                      <div className="relative">
                        <input type={showKey ? 'text' : 'password'}
                               value={keyInput}
                               onChange={(e) => setKeyInput(e.target.value)}
                               placeholder="Paste your API key..."
                               className={S.input}
                               style={{ backgroundColor: 'rgba(120,113,108,0.06)', border: '1px solid rgba(120,113,108,0.15)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, paddingRight: 36 }} />
                        <button onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                style={{ color: '#78716C' }}>
                          {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>

                      <select value={modelInput}
                              onChange={(e) => setModelInput(e.target.value)}
                              className={S.input}
                              style={{ backgroundColor: 'rgba(120,113,108,0.06)', border: '1px solid rgba(120,113,108,0.15)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                        <option value="">Select default model...</option>
                        {cat?.models.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>

                      <div className="flex gap-2">
                        <button onClick={() => saveProvider(provider.name)}
                                disabled={saving || !keyInput.trim()}
                                className={S.btn('primary', 'sm')}>
                          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Save Key
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Test result */}
                  {tr && (
                    <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${tr.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                         style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>
                      {tr.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {tr.success ? 'API key is valid — connection successful!' : `Failed: ${tr.error}`}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {provider.hasApiKey && (
                      <button onClick={() => testProvider(provider)}
                              disabled={testing === provider.id}
                              className={S.btn('ghost', 'sm')}>
                        {testing === provider.id ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                        Test Connection
                      </button>
                    )}
                    {!isAdding && !provider.hasApiKey && (
                      <button onClick={() => { setAddingKey(provider.id); setKeyInput(''); }}
                              className={S.btn('primary', 'sm')}>
                        <Plus size={11} />
                        Add API Key
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Unconfigured providers */}
          {unconfiguredProviders.length > 0 && (
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1 }} className="mb-3">
                Available Providers
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {unconfiguredProviders.map((name) => {
                  const cat = catalogue[name];
                  const color = PROVIDER_COLORS[name] || '#1C1917';
                  const isAdding = addingKey === name;

                  return (
                    <div key={name} className="rounded-xl p-4"
                         style={{ backgroundColor: 'rgba(120,113,108,0.04)', border: '1px dashed rgba(120,113,108,0.2)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                             style={{ backgroundColor: color, color: '#fff' }}>
                          {PROVIDER_ICONS[name] || '🤖'}
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                            {cat?.capabilities ? name.charAt(0).toUpperCase() + name.slice(1) : name}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A8A29E', letterSpacing: 0.5 }}>
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
                                   className={S.input}
                                   style={{ backgroundColor: 'white', border: '1px solid rgba(120,113,108,0.2)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, paddingRight: 36 }} />
                            <button onClick={() => setShowKey(!showKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: '#78716C' }}>
                              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                          <select value={modelInput} onChange={(e) => setModelInput(e.target.value)}
                                  className={S.input}
                                  style={{ backgroundColor: 'white', border: '1px solid rgba(120,113,108,0.2)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                            <option value="">Default model...</option>
                            {cat?.models.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => saveProvider(name)} disabled={saving || !keyInput.trim()}
                                    className={S.btn('primary', 'sm')}>
                              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Save
                            </button>
                            <button onClick={() => setAddingKey(null)} className={S.btn('ghost', 'sm')}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setAddingKey(name); setKeyInput(''); }}
                                className={S.btn('primary', 'sm')}>
                          <Plus size={11} />
                          Connect
                        </button>
                      )}
                    </div>
                  );
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
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#57534E', lineHeight: 1.7 }}>
              <strong>Task Router</strong> — Assign each pipeline task to a specific AI provider. For example: use xAI Grok for topic research, Claude for content writing, Perplexity for fact checking, and Gemini for SEO audits.
            </p>
          </div>

          {providers.length === 0 && (
            <div className="text-center py-10 rounded-xl"
                 style={{ backgroundColor: 'rgba(120,113,108,0.06)', border: '1px dashed rgba(120,113,108,0.2)' }}>
              <Brain size={32} className="mx-auto mb-2" style={{ color: '#A8A29E' }} />
              <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>
                No providers configured. Add API keys first.
              </p>
              <button onClick={() => setView('providers')} className={`mt-3 ${S.btn('primary', 'sm')}`}>
                <Plus size={11} />
                Add Provider
              </button>
            </div>
          )}

          {providers.length > 0 && tasks.map((task) => {
            const currentRoute = routes.find((r) => r.routeName === task.id);
            const currentProvider = currentRoute?.primaryProviderId;

            return (
              <div key={task.id} className="rounded-xl p-4 flex items-center gap-4"
                   style={{ backgroundColor: 'var(--neu-bg,#EDE9E1)', boxShadow: 'var(--neu-raised,3px 3px 8px #CAC5BC, -2px -2px 6px #FDFAF5)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                    {task.label}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>
                    {task.description}
                  </div>
                </div>
                <select
                  value={currentProvider || ''}
                  onChange={(e) => { if (e.target.value) saveRoute(task.id, e.target.value); }}
                  className="px-3 py-1.5 rounded-lg text-xs border outline-none min-w-[160px]"
                  style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, backgroundColor: currentProvider ? 'white' : 'rgba(120,113,108,0.08)', borderColor: 'rgba(120,113,108,0.2)', color: '#1C1917' }}>
                  <option value="">— no route —</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DATABASE
// ══════════════════════════════════════════════════════════════════════════════

function DatabaseTab() {
  const [data, setData] = useState<{
    overallHealth: string;
    dbConnected: boolean;
    dbLatencyMs: number | null;
    tables: TableHealth[];
    errorCount: number;
    checkedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ message: string; instructions?: string[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/db-status');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runMigration = async () => {
    setMigrating(true);
    try {
      const res = await fetch('/api/admin/settings/db-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_migration' }),
      });
      setMigrationResult(await res.json());
    } finally {
      setMigrating(false);
    }
  };

  if (loading) return <LoadingCard label="Checking database health..." />;

  const healthColor = data?.overallHealth === 'healthy' ? '#2D5A3D' : data?.overallHealth === 'degraded' ? '#D97706' : '#C8322B';

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <div className="rounded-xl p-5"
           style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised,3px 3px 8px #CAC5BC, -2px -2px 6px #FDFAF5)' }}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 16, color: '#1C1917' }}>
            Database Connection
          </div>
          <button onClick={load} className={S.btn('ghost', 'sm')}><RefreshCw size={11} /></button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 20, color: data?.dbConnected ? '#2D5A3D' : '#C8322B' }}>
              {data?.dbConnected ? 'Online' : 'Offline'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>Status</div>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 20, color: '#1C1917' }}>
              {data?.dbLatencyMs !== null ? `${data?.dbLatencyMs}ms` : '—'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>Latency</div>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 20, color: healthColor }}>
              {data?.overallHealth || '—'}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>Health</div>
          </div>
        </div>
      </div>

      {/* Migration section */}
      <div className="rounded-xl p-5"
           style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-raised,3px 3px 8px #CAC5BC, -2px -2px 6px #FDFAF5)' }}>
        <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 15, color: '#1C1917' }} className="mb-2">
          Database Migrations
        </div>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C', lineHeight: 1.6 }} className="mb-4">
          Migrations run automatically on each Vercel deployment. Use the button below to see migration instructions if you need to run them manually.
        </p>
        <button onClick={runMigration} disabled={migrating} className={S.btn('primary')}>
          {migrating ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
          View Migration Instructions
        </button>

        {migrationResult && (
          <div className="mt-4 rounded-xl p-4 bg-stone-50 border border-stone-200">
            <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#57534E' }} className="mb-2">
              {migrationResult.message}
            </p>
            {migrationResult.instructions && (
              <ul className="space-y-1.5">
                {migrationResult.instructions.map((inst, i) => (
                  <li key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#1C1917', lineHeight: 1.5 }}>
                    {inst}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Table health grid */}
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1 }} className="mb-3">
          Table Health — {data?.tables.length} tables checked
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {data?.tables.map((table) => (
            <div key={table.name} className="rounded-lg px-4 py-3 flex items-center gap-3"
                 style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)' }}>
              <div className={S.statusDot(table.status)} />
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 600, fontSize: 12, color: '#1C1917' }}>{table.label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#78716C' }}>
                  {table.error || (table.count !== null ? `${table.count.toLocaleString()} records` : '—')}
                </div>
              </div>
              <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#78716C' }}>
                {table.count !== null ? table.count.toLocaleString() : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* External tools */}
      <div className="grid sm:grid-cols-2 gap-3">
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
           className="flex items-center gap-3 rounded-xl p-4 transition-all hover:scale-[1.01]"
           style={{ backgroundColor: 'rgba(62,130,100,0.08)', border: '1px solid rgba(62,130,100,0.2)' }}>
          <Server size={20} style={{ color: '#2D5A3D' }} />
          <div>
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>Open Supabase</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>View tables, run SQL, manage data</div>
          </div>
          <ExternalLink size={13} style={{ color: '#78716C', marginLeft: 'auto' }} />
        </a>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
           className="flex items-center gap-3 rounded-xl p-4 transition-all hover:scale-[1.01]"
           style={{ backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
          <Globe size={20} style={{ color: '#1C1917' }} />
          <div>
            <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>Open Vercel</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>Deployments, env vars, functions</div>
          </div>
          <ExternalLink size={13} style={{ color: '#78716C', marginLeft: 'auto' }} />
        </a>
      </div>
    </div>
  );
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
      color: '#D97706',
      vars: [
        { key: 'GROK_API_KEY', hint: 'xAI Grok — primary content generation model' },
        { key: 'ENCRYPTION_KEY', hint: 'AES-256 key for encrypting stored API keys' },
      ],
    },
    {
      label: 'SEO & Indexing',
      color: '#4A7BA8',
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
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4"
           style={{ backgroundColor: 'rgba(74,123,168,0.08)', border: '1px solid rgba(74,123,168,0.2)' }}>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#57534E', lineHeight: 1.7 }}>
          Environment variables are configured in <strong>Vercel → Project → Settings → Environment Variables</strong>.
          They cannot be edited here for security reasons. This list tells you what each variable does.
        </p>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
           className={`inline-flex items-center gap-1.5 mt-3 ${S.btn('primary', 'sm')}`}>
          <ExternalLink size={11} />
          Open Vercel Environment Variables
        </a>
      </div>

      {ENV_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: group.color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }} className="mb-2">
            {group.label}
          </div>
          <div className="space-y-1.5">
            {group.vars.map(({ key, hint }) => (
              <div key={key} className="rounded-lg px-4 py-3 flex items-start gap-3"
                   style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)' }}>
                <Key size={12} style={{ color: group.color, marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: '#1C1917' }}>{key}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C', lineHeight: 1.5 }}>{hint}</div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(key)}
                        className="p-1 rounded hover:bg-stone-200 transition-colors flex-shrink-0"
                        title="Copy variable name">
                  <Copy size={11} style={{ color: '#A8A29E' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center">
        <a href="/admin/variable-vault" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C', textDecoration: 'underline' }}>
          View full Variable Vault (per-site variables) →
        </a>
      </div>
    </div>
  );
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
  ];

  return (
    <div className="space-y-5">
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: 1 }} className="mb-3">
          Quick Access
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {QUICK_LINKS.map(({ label, href, icon: Icon, desc }) => (
            <a key={href} href={href}
               className="flex items-center gap-3 rounded-xl p-4 transition-all hover:scale-[1.01]"
               style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat,1px 1px 3px #CAC5BC, -1px -1px 3px #FDFAF5)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: 'rgba(200,50,43,0.08)' }}>
                <Icon size={14} style={{ color: '#C8322B' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>{label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#78716C' }}>{desc}</div>
              </div>
              <ChevronRight size={13} style={{ color: '#A8A29E', flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared: Loading card ──────────────────────────────────────────────────────

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="text-center py-16 rounded-2xl"
         style={{ backgroundColor: 'rgba(120,113,108,0.04)' }}>
      <Loader2 size={28} className="mx-auto mb-3 animate-spin" style={{ color: '#78716C' }} />
      <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#78716C' }}>{label}</p>
    </div>
  );
}

// ── Export with Suspense (required for useSearchParams) ──────────────────────

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingCard label="Loading settings..." />}>
      <SettingsPageInner />
    </Suspense>
  );
}
