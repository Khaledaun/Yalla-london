"use client";
/**
 * New Website Builder — /admin/cockpit/new-site
 *
 * 10-step wizard to launch a new site without terminal access.
 * Includes research upload, plan generation, and post-build diagnostics.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SiteConfig {
  siteId: string;
  name: string;
  tagline: string;
  domain: string;
  siteType: "travel_blog" | "yacht_charter" | "other";
  primaryLanguage: "en" | "ar";
  secondaryLanguage: "en" | "ar" | "none";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  topics: string[];
  affiliates: string[];
  contentVelocity: 1 | 2 | 3;
  researchNotes: string;
  targetKeywords: string[];
  automations: string[];
}

interface ValidationResult {
  available: boolean;
  errors: string[];
  suggestions: string[];
}

interface BuildResult {
  success: boolean;
  error?: string;
  steps: Array<{ name: string; status: "ok" | "failed" | "skipped" }>;
  topicsCreated: number;
  nextSteps: string[];
}

interface PlanStep {
  title: string;
  description: string;
  category: string;
  priority: string;
  actionLabel?: string;
}

interface DevelopmentPlan {
  siteId: string;
  siteName: string;
  markdown: string;
  steps: PlanStep[];
}

interface DiagnosticResult {
  id: string;
  section: string;
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  explanation: string;
}

const TOPIC_OPTIONS = [
  "Hotels & Resorts", "Restaurants & Dining", "Experiences & Activities",
  "Neighborhoods Guide", "Shopping & Markets", "Transport & Getting Around",
  "Family Travel", "Luxury Experiences", "Budget Tips", "Cultural Heritage",
  "Island Hopping", "Halal Food & Dining", "Water Sports", "Yacht Charters",
];

const AFFILIATE_OPTIONS = [
  "Booking.com", "HalalBooking", "Agoda", "GetYourGuide",
  "Viator", "Klook", "Boatbookings", "Expedia", "Hotels.com", "Airbnb",
];

const AUTOMATION_OPTIONS = [
  { id: "content_gen", label: "Content Generation", desc: "AI generates articles from topics automatically" },
  { id: "seo_agent", label: "SEO Agent", desc: "Auto-fixes meta tags, adds internal links, submits to Google" },
  { id: "affiliate_injection", label: "Affiliate Links", desc: "Inserts booking/affiliate links into published content" },
  { id: "etsy_sync", label: "Etsy Integration", desc: "Syncs products from your Etsy shop for commerce" },
  { id: "social_posting", label: "Social Media", desc: "Repurposes articles as social media posts" },
  { id: "analytics", label: "Analytics Sync", desc: "Pulls GA4 and Search Console data into the dashboard" },
];

const COLOR_PRESETS = [
  { name: "Navy + Gold", primary: "#1E3A5F", secondary: "#C5A55A", accent: "#2196F3" },
  { name: "Emerald + Amber", primary: "#059669", secondary: "#F59E0B", accent: "#06B6D4" },
  { name: "Turquoise + Coral", primary: "#00B8D9", secondary: "#FF6B6B", accent: "#00E0D0" },
  { name: "Burgundy + Copper", primary: "#6B1D2E", secondary: "#B87333", accent: "#D4A76A" },
  { name: "Navy + Aegean", primary: "#0B1F3F", secondary: "#C5A55A", accent: "#1B6B93" },
  { name: "Mediterranean", primary: "#1B4F72", secondary: "#D4A76A", accent: "#17A589" },
];

const STEP_LABELS = [
  "Site Type",
  "Brand Identity",
  "Visual Identity",
  "Domain & Technical",
  "Research & Niche",
  "Content & Automation",
  "Development Plan",
  "Build",
  "Post-Build Check",
  "Launch Ready",
];

export default function NewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Partial<SiteConfig>>({
    siteType: "travel_blog",
    primaryLanguage: "en",
    secondaryLanguage: "ar",
    primaryColor: "#0EA5E9",
    secondaryColor: "#F59E0B",
    accentColor: "#06B6D4",
    topics: [],
    affiliates: ["Booking.com", "GetYourGuide"],
    contentVelocity: 1,
    researchNotes: "",
    targetKeywords: [],
    automations: ["content_gen", "seo_agent", "affiliate_injection", "analytics"],
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [planCopied, setPlanCopied] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[] | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const update = (key: keyof SiteConfig, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const toggleItem = (key: "topics" | "affiliates" | "automations", item: string, maxItems?: number) => {
    const current = (config[key] as string[]) ?? [];
    if (current.includes(item)) {
      update(key, current.filter((x) => x !== item));
    } else {
      update(key, maxItems ? [...current, item].slice(0, maxItems) : [...current, item]);
    }
  };

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    const kws = (config.targetKeywords ?? []);
    if (kws.length < 10) {
      update("targetKeywords", [...kws, keywordInput.trim()]);
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    update("targetKeywords", (config.targetKeywords ?? []).filter((k) => k !== kw));
  };

  const validateDomain = async () => {
    if (!config.siteId || !config.domain) return;
    setValidating(true);
    setValidation(null);
    try {
      const res = await fetch(`/api/admin/new-site?siteId=${config.siteId}&domain=${config.domain}`);
      const json = await res.json();
      setValidation(json);
    } catch (err) {
      console.warn("[new-site] Domain validation failed:", err instanceof Error ? err.message : String(err));
      setValidation({ available: false, errors: ["Network error"], suggestions: [] });
    } finally {
      setValidating(false);
    }
  };

  const generatePlan = async () => {
    setPlanLoading(true);
    setPlan(null);
    try {
      const res = await fetch("/api/admin/site-builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, saveTasks: false }),
      });
      const json = await res.json();
      setPlan(json.plan);
    } catch (err) {
      console.warn("[new-site] Plan generation failed:", err instanceof Error ? err.message : String(err));
    } finally {
      setPlanLoading(false);
    }
  };

  const savePlanTasks = async () => {
    if (!plan) return;
    try {
      const res = await fetch("/api/admin/site-builder/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, saveTasks: true }),
      });
      const json = await res.json();
      if (json.tasksCreated > 0) setPlanSaved(true);
    } catch (err) {
      console.warn("[new-site] Save plan tasks failed:", err instanceof Error ? err.message : String(err));
    }
  };

  const copyPlanForClaude = () => {
    if (!plan) return;
    navigator.clipboard.writeText(plan.markdown).then(() => {
      setPlanCopied(true);
      setTimeout(() => setPlanCopied(false), 3000);
    });
  };

  const buildSite = async () => {
    setBuilding(true);
    try {
      const res = await fetch("/api/admin/new-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      setBuildResult(json);
      setStep(8);
    } catch (e) {
      setBuildResult({ success: false, error: e instanceof Error ? e.message : "Error", steps: [], topicsCreated: 0, nextSteps: [] });
      setStep(8);
    } finally {
      setBuilding(false);
    }
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagnostics(null);
    try {
      const res = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "quick", siteId: config.siteId }),
      });
      const json = await res.json();
      setDiagnostics(json.results ?? []);
    } catch (err) {
      console.warn("[new-site] Diagnostics failed:", err instanceof Error ? err.message : String(err));
      setDiagnostics([]);
    } finally {
      setDiagLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!config.siteType;
    if (step === 2) return !!(config.name && config.tagline && config.primaryLanguage);
    if (step === 3) return !!(config.primaryColor && config.secondaryColor);
    if (step === 4) return !!(config.siteId && config.domain && validation?.available);
    if (step === 5) return true; // Research is optional
    if (step === 6) return (config.topics?.length ?? 0) > 0;
    if (step === 7) return !!plan; // Must generate plan
    return true;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/admin/cockpit")} className="text-zinc-500 hover:text-zinc-300 text-sm">← Cockpit</button>
          <h1 className="text-base font-bold text-white">New Website Builder</h1>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20">
        {/* Step indicator */}
        <div className="flex items-center gap-0.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-0.5 shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer ${
                  i + 1 === step ? "bg-blue-600 text-white" :
                  i + 1 < step ? "bg-emerald-600 text-white" :
                  "bg-zinc-800 text-zinc-500"
                }`}
                onClick={() => i + 1 < step && setStep(i + 1)}
                title={label}
              >
                {i + 1 < step ? "✓" : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-3 h-0.5 ${i + 1 < step ? "bg-emerald-600" : "bg-zinc-800"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-white mb-1">{STEP_LABELS[step - 1]}</h2>

          {/* Step 1: Site Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">What kind of site are you building?</p>
              {[
                { type: "travel_blog", icon: "✈️", label: "Travel Blog", desc: "Content + affiliate monetization (like Yalla London)" },
                { type: "yacht_charter", icon: "⛵", label: "Yacht Charter Platform", desc: "Fleet + bookings (like Zenitha Yachts)" },
                { type: "other", icon: "🌐", label: "Custom / Other", desc: "General purpose website" },
              ].map(({ type, icon, label, desc }) => (
                <button
                  key={type}
                  onClick={() => update("siteType", type)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                    config.siteType === type ? "bg-blue-900/30 border-blue-600" : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-medium text-zinc-100">{label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Brand Identity */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Site Name *</label>
                <input
                  type="text"
                  value={config.name ?? ""}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Arabaldives"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Tagline *</label>
                <input
                  type="text"
                  value={config.tagline ?? ""}
                  onChange={(e) => update("tagline", e.target.value)}
                  placeholder="e.g. The Arab Traveler's Maldives Guide"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Primary Language</label>
                  <select
                    value={config.primaryLanguage ?? "en"}
                    onChange={(e) => update("primaryLanguage", e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Secondary Language</label>
                  <select
                    value={config.secondaryLanguage ?? "ar"}
                    onChange={(e) => update("secondaryLanguage", e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  >
                    <option value="ar">Arabic</option>
                    <option value="en">English</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Visual Identity */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 mb-1">Pick a preset or customize:</p>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      update("primaryColor", preset.primary);
                      update("secondaryColor", preset.secondary);
                      update("accentColor", preset.accent);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 text-left"
                  >
                    <div className="flex gap-0.5 shrink-0">
                      <div className="w-4 h-4 rounded-full" style={{ background: preset.primary }} />
                      <div className="w-4 h-4 rounded-full" style={{ background: preset.secondary }} />
                      <div className="w-4 h-4 rounded-full" style={{ background: preset.accent }} />
                    </div>
                    <span className="text-xs text-zinc-300">{preset.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-zinc-800 pt-3 space-y-3">
                {[
                  { key: "primaryColor", label: "Primary Color" },
                  { key: "secondaryColor", label: "Secondary Color" },
                  { key: "accentColor", label: "Accent Color" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={(config[key as keyof SiteConfig] as string) ?? "#000000"}
                      onChange={(e) => update(key as keyof SiteConfig, e.target.value)}
                      className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
                    />
                    <div>
                      <p className="text-sm text-zinc-300">{label}</p>
                      <p className="text-xs font-mono text-zinc-500">{(config[key as keyof SiteConfig] as string) ?? "#000000"}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Preview */}
              <div className="p-4 rounded-xl border border-zinc-700" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` }}>
                <p className="font-bold text-white text-sm">{config.name || "Your Site Name"}</p>
                <p className="text-white/80 text-xs mt-0.5">{config.tagline || "Your tagline"}</p>
              </div>
            </div>
          )}

          {/* Step 4: Domain & Technical */}
          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Domain *</label>
                <input
                  type="text"
                  value={config.domain ?? ""}
                  onChange={(e) => { update("domain", e.target.value); setValidation(null); }}
                  placeholder="e.g. arabaldives.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Site ID * (lowercase, hyphens only)</label>
                <input
                  type="text"
                  value={config.siteId ?? ""}
                  onChange={(e) => { update("siteId", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setValidation(null); }}
                  placeholder="e.g. arabaldives"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                />
              </div>
              <button
                onClick={validateDomain}
                disabled={validating || !config.siteId || !config.domain}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm border border-zinc-700"
              >
                {validating ? "Checking…" : "Check Availability"}
              </button>
              {validation && (
                <div className={`p-3 rounded-xl border text-sm ${validation.available ? "bg-emerald-950/20 border-emerald-800" : "bg-red-950/20 border-red-800"}`}>
                  {validation.available ? (
                    <p className="text-emerald-300">Available! Ready to use.</p>
                  ) : (
                    <>
                      <p className="text-red-300">Not available:</p>
                      {validation.errors.map((e, i) => <p key={i} className="text-zinc-400 text-xs mt-0.5">{e}</p>)}
                      {validation.suggestions.length > 0 && (
                        <p className="text-zinc-400 text-xs mt-1">Suggestions: {validation.suggestions.join(", ")}</p>
                      )}
                    </>
                  )}
                </div>
              )}
              {validation?.available && (
                <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700 text-xs text-zinc-400">
                  <p className="font-medium text-zinc-300 mb-1">DNS Setup (after creation):</p>
                  <p>Add CNAME: <span className="font-mono text-zinc-200">{config.domain}</span> → <span className="font-mono text-zinc-200">cname.vercel-dns.com</span></p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Research & Niche */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">Paste any niche research, market analysis, or notes for the AI to use when generating your development plan.</p>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Research Notes (optional)</label>
                <textarea
                  value={config.researchNotes ?? ""}
                  onChange={(e) => update("researchNotes", e.target.value)}
                  placeholder="Paste niche research, competitor analysis, market data, or free-text notes here..."
                  rows={8}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-y"
                />
                <p className="text-xs text-zinc-600 mt-1">{(config.researchNotes?.length ?? 0).toLocaleString()} characters</p>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Target Keywords (up to 10)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder="e.g. halal hotels maldives"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  />
                  <button
                    onClick={addKeyword}
                    disabled={(config.targetKeywords?.length ?? 0) >= 10}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {(config.targetKeywords?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {config.targetKeywords?.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300"
                      >
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="text-zinc-500 hover:text-zinc-300">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Content & Automation */}
          {step === 6 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-400 mb-2">Primary Topics (pick up to 5)</p>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleItem("topics", t, 5)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        config.topics?.includes(t)
                          ? "bg-blue-900/50 text-blue-300 border-blue-700"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {config.topics?.includes(t) ? "✓ " : ""}{t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-1">{config.topics?.length ?? 0}/5 selected</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-2">Affiliate Partners</p>
                <div className="flex flex-wrap gap-1.5">
                  {AFFILIATE_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleItem("affiliates", a)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        config.affiliates?.includes(a)
                          ? "bg-amber-900/50 text-amber-300 border-amber-700"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      {config.affiliates?.includes(a) ? "✓ " : ""}{a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-2">Content Velocity</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((v) => (
                    <button
                      key={v}
                      onClick={() => update("contentVelocity", v)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                        config.contentVelocity === v ? "bg-blue-900/50 text-blue-300 border-blue-700" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {v}/day
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-400 mb-2">Automations</p>
                <div className="space-y-2">
                  {AUTOMATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => toggleItem("automations", opt.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        config.automations?.includes(opt.id)
                          ? "bg-emerald-900/20 border-emerald-700"
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        config.automations?.includes(opt.id)
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-zinc-600"
                      }`}>
                        {config.automations?.includes(opt.id) && "✓"}
                      </div>
                      <div>
                        <p className="text-sm text-zinc-200">{opt.label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Development Plan */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Generate a development plan based on your configuration. You can copy it for Claude Code or save tasks to the database.
              </p>
              {!plan && (
                <button
                  onClick={generatePlan}
                  disabled={planLoading}
                  className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {planLoading ? "Generating plan…" : "Generate Development Plan"}
                </button>
              )}
              {plan && (
                <>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">{plan.markdown}</pre>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {plan.steps.length} steps · {plan.steps.filter((s) => s.priority === "critical").length} critical
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyPlanForClaude}
                      className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-700"
                    >
                      {planCopied ? "Copied!" : "Copy for Claude Code"}
                    </button>
                    <button
                      onClick={savePlanTasks}
                      disabled={planSaved}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium"
                    >
                      {planSaved ? `Saved ${plan.steps.length} tasks` : "Save Tasks to DB"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 8: Build */}
          {step === 8 && (
            <div className="space-y-3">
              {building && <p className="text-sm text-zinc-400 text-center py-4">Building your site… this takes about 30 seconds.</p>}
              {!buildResult && !building && (
                <>
                  <p className="text-sm text-zinc-400 mb-3">AI will generate for <strong className="text-zinc-200">{config.name}</strong>:</p>
                  {[
                    `30 topic proposals (${config.primaryLanguage === "ar" && config.secondaryLanguage === "en" ? "AR + EN" : config.primaryLanguage === "ar" ? "AR only" : config.secondaryLanguage === "ar" ? "EN + AR" : config.secondaryLanguage === "none" ? "EN only" : "EN + bilingual"})`,
                    "3 seed articles ready in reservoir",
                    "Brand kit (logo SVG, OG image, email header)",
                    "Homepage structure seeded",
                    "Sitemap and robots.txt configured",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-emerald-400">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                  <button
                    onClick={buildSite}
                    disabled={building}
                    className={`w-full mt-4 py-3 rounded-lg text-white text-sm font-medium ${building ? 'bg-zinc-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    {building ? 'Building…' : 'Start Initial Content Generation'}
                  </button>
                </>
              )}
              {buildResult && (
                <>
                  <p className={`font-semibold text-sm ${buildResult.success ? "text-emerald-400" : "text-red-400"}`}>
                    {buildResult.success ? "Site created successfully!" : "Build failed"}
                  </p>
                  {buildResult.error && <p className="text-xs text-red-400">{buildResult.error}</p>}
                  <div className="space-y-1.5">
                    {buildResult.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={s.status === "ok" ? "text-emerald-400" : s.status === "failed" ? "text-red-400" : "text-zinc-500"}>
                          {s.status === "ok" ? "✓" : s.status === "failed" ? "✗" : "—"}
                        </span>
                        <span className="text-zinc-300">{s.name}</span>
                      </div>
                    ))}
                  </div>
                  {buildResult.topicsCreated > 0 && (
                    <p className="text-xs text-zinc-400">{buildResult.topicsCreated} topics created</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 9: Post-Build Diagnostics */}
          {step === 9 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Run a quick diagnostic to verify your new site is configured correctly.
              </p>
              <button
                onClick={runDiagnostics}
                disabled={diagLoading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                {diagLoading ? "Running diagnostics…" : "Run System Check"}
              </button>
              {diagnostics && (
                <div className="space-y-1.5">
                  <div className="flex gap-3 mb-2 text-xs">
                    <span className="text-emerald-400">{diagnostics.filter((d) => d.status === "pass").length} passed</span>
                    <span className="text-amber-400">{diagnostics.filter((d) => d.status === "warn").length} warnings</span>
                    <span className="text-red-400">{diagnostics.filter((d) => d.status === "fail").length} failed</span>
                  </div>
                  {diagnostics.map((d) => (
                    <div
                      key={d.id}
                      className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                        d.status === "pass" ? "bg-emerald-950/20" :
                        d.status === "warn" ? "bg-amber-950/20" :
                        "bg-red-950/20"
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">{d.status === "pass" ? "✅" : d.status === "warn" ? "⚠️" : "❌"}</span>
                      <div>
                        <span className="text-zinc-200 font-medium">{d.name}</span>
                        <span className="text-zinc-400 ml-1">— {d.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 10: Launch Ready */}
          {step === 10 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Your site <strong className="text-zinc-200">{config.name}</strong> is set up! Here&apos;s what to do next:
              </p>
              <div className="space-y-2">
                {[
                  { label: "Deploy code", desc: "Push to git — Vercel auto-deploys", done: true },
                  { label: "Add domain to Vercel", desc: `Add ${config.domain} in Vercel Settings → Domains`, done: false },
                  { label: "Point DNS", desc: `CNAME ${config.domain} → cname.vercel-dns.com`, done: false },
                  { label: "Add env vars", desc: "GA4, GSC, IndexNow keys in Vercel env vars", done: false },
                  { label: "Run content builder", desc: "Trigger first content generation from Cockpit", done: !!buildResult?.success },
                  { label: "Submit to Google", desc: "Run SEO agent to submit pages to IndexNow", done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 ${item.done ? "text-emerald-400" : "text-zinc-600"}`}>
                      {item.done ? "✓" : "○"}
                    </span>
                    <div>
                      <span className={item.done ? "text-zinc-400 line-through" : "text-zinc-200"}>{item.label}</span>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => router.push("/admin/cockpit")}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                >
                  Go to Cockpit
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setConfig({ siteType: "travel_blog", primaryLanguage: "en", secondaryLanguage: "ar", primaryColor: "#0EA5E9", secondaryColor: "#F59E0B", accentColor: "#06B6D4", topics: [], affiliates: ["Booking.com"], contentVelocity: 1, researchNotes: "", targetKeywords: [], automations: ["content_gen", "seo_agent", "affiliate_injection", "analytics"] });
                    setBuildResult(null);
                    setPlan(null);
                    setDiagnostics(null);
                    setValidation(null);
                  }}
                  className="px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-700"
                >
                  Build Another
                </button>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 8 && (
            <div className="mt-6 flex gap-2">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-700"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                Continue →
              </button>
            </div>
          )}
          {(step === 8 || step === 9) && buildResult && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                {step === 8 ? "Run Diagnostics →" : "Finish →"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
