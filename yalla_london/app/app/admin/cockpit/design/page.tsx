"use client";
/**
 * Design Studio — /admin/cockpit/design
 *
 * Full creative suite for all design needs, connected to every site.
 * Wraps the existing design-studio canvas + adds:
 *  - Multi-site selector
 *  - AI image generation panel
 *  - Direct publish actions (OG image, hero, email header, social)
 *  - Brand kit manager
 *  - Bulk generation trigger
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BrandProfile {
  siteId: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  logoUrl: string | null;
}

interface Design {
  id: string;
  name: string;
  type: string;
  siteId: string;
  createdAt: string;
  thumbnailUrl: string | null;
  publishedTo: string | null;
}

interface DesignStudioData {
  designs: Design[];
  brand: BrandProfile | null;
  templates: Array<{ id: string; name: string; type: string; thumbnail: string | null }>;
  siteId: string;
  siteName: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DESIGN_TYPES = [
  { type: "og_image", label: "OG Image", size: "1200×630", icon: "🖼" },
  { type: "article_hero", label: "Article Hero", size: "1200×400", icon: "📰" },
  { type: "instagram_post", label: "Instagram Post", size: "1080×1080", icon: "📷" },
  { type: "email_header", label: "Email Header", size: "600×200", icon: "📧" },
  { type: "social_banner", label: "Social Banner", size: "1500×500", icon: "🐦" },
];

export default function DesignStudioPage() {
  const router = useRouter();
  const [data, setData] = useState<DesignStudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [activeSection, setActiveSection] = useState<"gallery" | "brand" | "ai-gen" | "bulk">("gallery");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<Record<string, string>>({});

  // Fetch sites from cockpit
  useEffect(() => {
    fetch("/api/admin/cockpit")
      .then((r) => r.json())
      .then((json) => {
        const s = (json.sites ?? []).map((site: { id: string; name: string }) => ({ id: site.id, name: site.name }));
        setSites(s);
        if (s.length > 0 && !siteId) setSiteId(s[0].id);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    fetch(`/api/admin/design-studio?siteId=${siteId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [siteId]);

  const generateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/admin/design-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_ai", prompt: aiPrompt, siteId }),
      });
      const json = await res.json();
      setAiResult(json.imageUrl ? `✅ Generated! URL: ${json.imageUrl}` : `❌ ${json.error ?? "No image returned"}`);
    } catch (e) {
      setAiResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const bulkGenerate = async (type: string) => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/design-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_generate", type, siteId }),
      });
      const json = await res.json();
      setBulkResult(json.queued !== undefined ? `✅ Queued ${json.queued} images for generation` : `❌ ${json.error ?? "Failed"}`);
    } catch (e) {
      setBulkResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const publishDesign = async (designId: string, target: string) => {
    setPublishLoading(`${designId}-${target}`);
    try {
      const res = await fetch("/api/admin/design-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", designId, target, siteId }),
      });
      const json = await res.json();
      setPublishResult((prev) => ({
        ...prev,
        [`${designId}-${target}`]: json.success !== false ? "✅ Published" : `❌ ${json.error}`,
      }));
    } catch (e) {
      setPublishResult((prev) => ({ ...prev, [`${designId}-${target}`]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
    } finally {
      setPublishLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/cockpit")} className="text-zinc-500 hover:text-zinc-300 text-sm">← Cockpit</button>
            <h1 className="text-base font-bold text-white">🎨 Design Studio</h1>
            {sites.length > 0 && (
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300"
              >
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <button
            onClick={() => router.push("/admin/design-studio")}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
          >
            Open Canvas Editor →
          </button>
        </div>
        {/* Section tabs */}
        <div className="max-w-screen-xl mx-auto mt-2 flex gap-1">
          {(["gallery", "brand", "ai-gen", "bulk"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${activeSection === s ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {s === "ai-gen" ? "AI Generate" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 py-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-48"><p className="text-zinc-500 text-sm">Loading designs…</p></div>
        ) : (
          <>
            {/* Quick Create */}
            {activeSection === "gallery" && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Quick Create</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {DESIGN_TYPES.map((dt) => (
                      <button
                        key={dt.type}
                        onClick={() => router.push(`/admin/design-studio?type=${dt.type}&siteId=${siteId}`)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                      >
                        <span className="text-2xl">{dt.icon}</span>
                        <span className="text-xs text-zinc-300 font-medium">{dt.label}</span>
                        <span className="text-xs text-zinc-600">{dt.size}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent designs gallery */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                    Recent Designs ({data?.designs.length ?? 0})
                  </h3>
                  {!data?.designs.length ? (
                    <p className="text-zinc-500 text-sm text-center py-6">No designs yet. Create one above.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data.designs.map((design) => (
                        <div key={design.id} className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                          <div className="aspect-video bg-zinc-700 flex items-center justify-center">
                            {design.thumbnailUrl ? (
                              <img src={design.thumbnailUrl} alt={design.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-zinc-600 text-3xl">🖼</span>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium text-zinc-200 truncate">{design.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{design.type} · {timeAgo(design.createdAt)}</p>
                            {design.publishedTo && (
                              <p className="text-xs text-emerald-400 mt-0.5">✅ Published to {design.publishedTo}</p>
                            )}
                            <div className="mt-2 flex gap-1 flex-wrap">
                              <button
                                onClick={() => router.push(`/admin/design-studio?id=${design.id}`)}
                                className="px-2 py-0.5 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                              >Edit</button>
                              {design.type === "og_image" && (
                                <button
                                  onClick={() => publishDesign(design.id, "og_image")}
                                  disabled={publishLoading === `${design.id}-og_image`}
                                  className="px-2 py-0.5 rounded text-xs bg-blue-900/50 hover:bg-blue-900 text-blue-300"
                                >
                                  {publishLoading === `${design.id}-og_image` ? "…" : "Set as OG"}
                                </button>
                              )}
                              {design.type === "article_hero" && (
                                <button
                                  onClick={() => publishDesign(design.id, "featured_image")}
                                  disabled={publishLoading === `${design.id}-featured_image`}
                                  className="px-2 py-0.5 rounded text-xs bg-blue-900/50 hover:bg-blue-900 text-blue-300"
                                >
                                  {publishLoading === `${design.id}-featured_image` ? "…" : "Set as Hero"}
                                </button>
                              )}
                            </div>
                            {publishResult[`${design.id}-og_image`] && (
                              <p className="text-xs mt-1 text-emerald-400">{publishResult[`${design.id}-og_image`]}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Brand Kit */}
            {activeSection === "brand" && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Brand Kit — {data?.siteName}</h3>
                  {data?.brand ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Colors</p>
                        <div className="flex gap-3">
                          {[
                            { label: "Primary", color: data.brand.primaryColor },
                            { label: "Secondary", color: data.brand.secondaryColor },
                            { label: "Accent", color: data.brand.accentColor },
                          ].map(({ label, color }) => (
                            <div key={label} className="flex flex-col items-center gap-1">
                              <div className="w-10 h-10 rounded-lg border border-zinc-700" style={{ backgroundColor: color }} />
                              <p className="text-xs text-zinc-500">{label}</p>
                              <p className="text-xs font-mono text-zinc-400">{color}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Typography</p>
                        <p className="text-sm text-zinc-300">Heading: <span className="font-semibold">{data.brand.headingFont}</span></p>
                        <p className="text-sm text-zinc-300 mt-0.5">Body: <span>{data.brand.bodyFont}</span></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">Brand profile not configured. Update config/sites.ts to set brand colors.</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`/api/admin/brand-kit?siteId=${siteId}`}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700"
                    >
                      📦 Download Brand Kit ZIP
                    </a>
                    <button
                      onClick={() => router.push(`/admin/design?siteId=${siteId}`)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700"
                    >
                      🎨 Open Design Hub
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Generation */}
            {activeSection === "ai-gen" && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">AI Image Generation</h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    Requires OPENAI_API_KEY (DALL-E 3) or STABILITY_API_KEY (Stability AI) to be configured.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate…"
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                  />
                  <button
                    onClick={generateAI}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="mt-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    {aiLoading ? "Generating…" : "✨ Generate Image"}
                  </button>
                  {aiResult && (
                    <p className={`mt-2 text-xs rounded px-2 py-1 ${aiResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
                      {aiResult}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Generation */}
            {activeSection === "bulk" && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Bulk Generation</h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    Generate images for all articles that don't have one yet.
                  </p>
                  <div className="space-y-2">
                    {[
                      { type: "og_image", label: "Generate OG images for all articles without one" },
                      { type: "article_hero", label: "Generate hero images for all articles" },
                      { type: "social_post", label: "Generate social post images for all articles" },
                    ].map(({ type, label }) => (
                      <div key={type} className="flex items-center justify-between gap-2 p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                        <p className="text-sm text-zinc-300">{label}</p>
                        <button
                          onClick={() => bulkGenerate(type)}
                          disabled={bulkLoading}
                          className="px-3 py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-900/70 text-amber-300 text-xs font-medium border border-amber-800 disabled:opacity-50 shrink-0"
                        >
                          {bulkLoading ? "Queuing…" : "Run →"}
                        </button>
                      </div>
                    ))}
                  </div>
                  {bulkResult && (
                    <p className={`mt-3 text-xs rounded px-2 py-1 ${bulkResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
                      {bulkResult}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
