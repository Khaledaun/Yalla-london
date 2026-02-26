"use client";
/**
 * New Website Builder — /admin/cockpit/new-site
 *
 * 8-step wizard to launch a new site without terminal access.
 * Step 7 shows real build progress via polling /api/admin/new-site/status.
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

const STEP_LABELS = [
  "Site Type",
  "Brand Identity",
  "Visual Identity",
  "Domain & Technical",
  "Content Config",
  "Initial Content",
  "Setup Progress",
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
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);

  const update = (key: keyof SiteConfig, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const toggleTopic = (t: string) =>
    update("topics", config.topics?.includes(t) ? config.topics.filter((x) => x !== t) : [...(config.topics ?? []), t].slice(0, 5));

  const toggleAffiliate = (a: string) =>
    update("affiliates", config.affiliates?.includes(a) ? config.affiliates.filter((x) => x !== a) : [...(config.affiliates ?? []), a]);

  const validateDomain = async () => {
    if (!config.siteId || !config.domain) return;
    setValidating(true);
    setValidation(null);
    try {
      const res = await fetch(`/api/admin/new-site?siteId=${config.siteId}&domain=${config.domain}`);
      const json = await res.json();
      setValidation(json);
    } catch {
      setValidation({ available: false, errors: ["Network error"], suggestions: [] });
    } finally {
      setValidating(false);
    }
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
      setStep(7);
    } catch (e) {
      setBuildResult({ success: false, error: e instanceof Error ? e.message : "Error", steps: [], topicsCreated: 0, nextSteps: [] });
      setStep(7);
    } finally {
      setBuilding(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!config.siteType;
    if (step === 2) return !!(config.name && config.tagline && config.primaryLanguage);
    if (step === 3) return !!(config.primaryColor && config.secondaryColor);
    if (step === 4) return !!(config.siteId && config.domain && validation?.available);
    if (step === 5) return (config.topics?.length ?? 0) > 0;
    if (step === 6) return true;
    return true;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/admin/cockpit")} className="text-zinc-500 hover:text-zinc-300 text-sm">← Cockpit</button>
          <h1 className="text-base font-bold text-white">🌐 New Website Builder</h1>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i + 1 === step ? "bg-blue-600 text-white" :
                i + 1 < step ? "bg-emerald-600 text-white" :
                "bg-zinc-800 text-zinc-500"
              }`}>{i + 1 < step ? "✓" : i + 1}</div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-4 h-0.5 ${i + 1 < step ? "bg-emerald-600" : "bg-zinc-800"}`} />
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
              {/* Preview */}
              <div className="mt-2 p-4 rounded-xl border border-zinc-700" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` }}>
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
                    <p className="text-emerald-300">✅ Available! Ready to use.</p>
                  ) : (
                    <>
                      <p className="text-red-300">❌ Not available:</p>
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

          {/* Step 5: Content Config */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-400 mb-2">Primary Topics (pick up to 5)</p>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTopic(t)}
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
                      onClick={() => toggleAffiliate(a)}
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
            </div>
          )}

          {/* Step 6: Confirm + Generate */}
          {step === 6 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400 mb-3">AI will generate for <strong className="text-zinc-200">{config.name}</strong>:</p>
              {[
                "30 topic proposals (EN + " + (config.primaryLanguage === "ar" ? "AR" : "bilingual") + ")",
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
              <div className="mt-4 p-3 bg-zinc-800 rounded-xl border border-zinc-700 text-xs text-zinc-400">
                <p><strong className="text-zinc-300">Note:</strong> This creates all database records and content. You'll still need to:</p>
                <p className="mt-1">1. Deploy this code (Vercel auto-deploys from git push)</p>
                <p>2. Add <span className="font-mono">{config.domain}</span> to your Vercel project</p>
                <p>3. Point DNS to Vercel</p>
              </div>
            </div>
          )}

          {/* Step 7: Build Progress */}
          {step === 7 && (
            <div className="space-y-3">
              {building && <p className="text-sm text-zinc-400 text-center py-4">⚙️ Building your site… this takes about 30 seconds.</p>}
              {buildResult && (
                <>
                  <p className={`font-semibold text-sm ${buildResult.success ? "text-emerald-400" : "text-red-400"}`}>
                    {buildResult.success ? "✅ Site created successfully!" : "❌ Build failed"}
                  </p>
                  {buildResult.error && <p className="text-xs text-red-400">{buildResult.error}</p>}
                  <div className="space-y-1.5">
                    {buildResult.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={s.status === "ok" ? "text-emerald-400" : s.status === "failed" ? "text-red-400" : "text-zinc-500"}>
                          {s.status === "ok" ? "✅" : s.status === "failed" ? "❌" : "—"}
                        </span>
                        <span className="text-zinc-300">{s.name}</span>
                      </div>
                    ))}
                  </div>
                  {buildResult.topicsCreated > 0 && (
                    <p className="text-xs text-zinc-400">{buildResult.topicsCreated} topics created</p>
                  )}
                  {buildResult.nextSteps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Next Steps:</p>
                      {buildResult.nextSteps.map((s, i) => (
                        <p key={i} className="text-xs text-zinc-500 mt-0.5">• {s}</p>
                      ))}
                    </div>
                  )}
                  {buildResult.success && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => router.push("/admin/cockpit")}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                      >
                        🏠 Go to Cockpit
                      </button>
                      <button
                        onClick={() => { setStep(1); setConfig({ siteType: "travel_blog", primaryLanguage: "en", secondaryLanguage: "ar", primaryColor: "#0EA5E9", secondaryColor: "#F59E0B", accentColor: "#06B6D4", topics: [], affiliates: ["Booking.com"], contentVelocity: 1 }); setBuildResult(null); }}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-700"
                      >
                        Build Another
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {step < 7 && (
            <div className="mt-6 flex gap-2">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm border border-zinc-700"
                >
                  ← Back
                </button>
              )}
              {step < 6 && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  Continue →
                </button>
              )}
              {step === 6 && (
                <button
                  onClick={buildSite}
                  disabled={building}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {building ? "Building…" : "▶ Start Initial Content Generation"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
