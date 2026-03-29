"use client";

import { useState } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminButton,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
  AdminKPICard,
} from "@/components/admin/admin-ui";
import {
  Globe,
  Plug,
  FileText,
  Image as ImageIcon,
  Tags,
  Users,
  Search as SearchIcon,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Palette,
  PenTool,
  Eye,
  BookOpen,
  Zap,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────

interface AuditResult {
  meta: { siteUrl: string; siteName: string; auditDate: string; auditDuration: string };
  overview: Record<string, unknown>;
  content: Record<string, unknown>;
  structure: Record<string, unknown>;
  seo: Record<string, unknown>;
  design: Record<string, unknown>;
  media: Record<string, unknown>;
  writing: Record<string, unknown>;
  languages: Record<string, unknown>;
  technical: Record<string, unknown>;
  recommendations: string[];
  siteProfile: {
    siteName: string;
    niche: string;
    subNiches: string[];
    tone: string;
    writingStyle: string;
    systemPrompt: string;
    contentGuidelines: string;
    seoGuidelines: string;
    languages: string[];
    colorPalette: Record<string, string>;
    fonts: { heading: string; body: string };
  };
}

// ─── Main Page ───────────────────────────────────────────────────

export default function WordPressPage() {
  const [activeTab, setActiveTab] = useState("connect");

  // Connection state
  const [apiUrl, setApiUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [siteId, setSiteId] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ siteName: string; siteUrl: string } | null>(null);

  // Audit state
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);

  // Content state
  const [posts, setPosts] = useState<unknown[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // ─── Connection ────────────────────────────────────────────────

  const testConnection = async () => {
    if (!apiUrl || !username || !appPassword) {
      toast.error("Fill in all credential fields");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/admin/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: siteId || "test",
          action: "test-connection",
          data: { apiUrl, username, appPassword },
        }),
      });
      if (!res.ok) {
        toast.error(`Connection failed: HTTP ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => ({ connected: false, error: "Non-JSON response" }));

      if (data.connected) {
        setConnected(true);
        setConnectionInfo({ siteName: data.siteName, siteUrl: data.siteUrl });
        toast.success(`Connected to ${data.siteName}`);

        // Auto-generate siteId from site name if not set
        if (!siteId) {
          setSiteId(
            data.siteName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          );
        }
      } else {
        setConnected(false);
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setConnecting(false);
    }
  };

  // ─── Audit ─────────────────────────────────────────────────────

  const runAudit = async () => {
    if (!connected) {
      toast.error("Connect to a WordPress site first");
      return;
    }

    setAuditing(true);
    try {
      const res = await fetch("/api/admin/wordpress/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl, username, appPassword, siteId }),
      });
      const data = await res.json();

      if (data.success) {
        setAudit(data.audit);
        setActiveTab("audit");
        toast.success(`Audit completed in ${data.audit.meta.auditDuration}`);
      } else {
        toast.error(data.error || "Audit failed");
      }
    } catch {
      toast.error("Audit failed — network error");
    } finally {
      setAuditing(false);
    }
  };

  // ─── Content Management ────────────────────────────────────────

  const loadPosts = async (page = 1) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(
        `/api/admin/wordpress?siteId=${siteId}&action=posts&page=${page}&per_page=20`,
      );
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="WordPress Manager"
        subtitle="Connect, audit, and manage WordPress websites via REST API"
        action={
          connected && connectionInfo ? (
            <AdminStatusBadge status="success" label={connectionInfo.siteName} />
          ) : undefined
        }
      />

      <AdminTabs
        tabs={[
          { id: "connect", label: "Connect" },
          { id: "audit", label: "Audit Report" },
          { id: "profile", label: "Site Profile" },
          { id: "content", label: "Content" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-4">
        {/* ─── Connect Tab ──────────────────────────────────────────── */}
        {activeTab === "connect" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AdminCard>
              <div className="flex items-center gap-2 mb-4">
                <Plug className="w-4 h-4" style={{ color: "#3B7EA1" }} />
                <AdminSectionLabel>WordPress Credentials</AdminSectionLabel>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                    Site ID (for this system)
                  </label>
                  <input
                    className="admin-input"
                    placeholder="my-wordpress-site"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                  />
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 2 }}>
                    Unique identifier used in env vars and config
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                    WordPress REST API URL
                  </label>
                  <input
                    className="admin-input"
                    placeholder="https://example.com/wp-json/wp/v2"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                    Username
                  </label>
                  <input
                    className="admin-input"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#78716C" }}>
                    Application Password
                  </label>
                  <input
                    className="admin-input"
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                  />
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E", marginTop: 2 }}>
                    Generate at WordPress Dashboard &gt; Users &gt; Profile &gt; Application Passwords
                  </p>
                </div>

                <div className="flex gap-2">
                  <AdminButton onClick={testConnection} loading={connecting}>
                    <Plug className="w-3.5 h-3.5" />
                    Test Connection
                  </AdminButton>
                  {connected && (
                    <AdminButton variant="primary" onClick={runAudit} loading={auditing}>
                      <SearchIcon className="w-3.5 h-3.5" />
                      {auditing ? "Auditing..." : "Run Full Audit"}
                    </AdminButton>
                  )}
                </div>

                {connected && connectionInfo && (
                  <div
                    className="p-3 rounded-lg flex items-center gap-2"
                    style={{ backgroundColor: "rgba(45,90,61,0.06)", border: "1px solid rgba(45,90,61,0.2)" }}
                  >
                    <CheckCircle className="w-4 h-4" style={{ color: "#2D5A3D" }} />
                    <div>
                      <span style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 600, color: "#2D5A3D" }}>
                        Connected
                      </span>
                      <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#2D5A3D", opacity: 0.8 }}>
                        {connectionInfo.siteName} — {connectionInfo.siteUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AdminCard>

            <AdminCard>
              <AdminSectionLabel>How It Works</AdminSectionLabel>
              <div className="space-y-3 mt-3">
                {[
                  { step: "1", text: "Connect your WordPress site using REST API credentials" },
                  { step: "2", text: "Automatic audit analyzes content, design, SEO, writing style, languages, structure, and media assets" },
                  { step: "3", text: "AI generates a Site Profile with system prompt, content guidelines, and SEO rules matched to your site's voice" },
                  { step: "4", text: "Manage content directly — create/edit posts, upload media, and publish from this dashboard" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: "#C8322B",
                        fontFamily: "var(--font-display)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#FAF8F4",
                      }}
                    >
                      {item.step}
                    </span>
                    <p style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#44403C", lineHeight: 1.5 }}>
                      {item.text}
                    </p>
                  </div>
                ))}

                <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(214,208,196,0.5)" }}>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E" }}>
                    <strong style={{ color: "#78716C" }}>Required WordPress setup:</strong> WP 5.6+, Application Passwords
                    enabled, REST API accessible. For SEO data: Yoast SEO or RankMath plugin.
                  </p>
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* ─── Audit Report Tab ─────────────────────────────────────── */}
        {activeTab === "audit" && (
          <>
            {audit ? (
              <AuditReportView audit={audit} />
            ) : (
              <AdminEmptyState
                icon={BarChart3}
                title="No Audit Available"
                description="Connect to a WordPress site and run an audit first."
                action={
                  <AdminButton variant="primary" onClick={() => setActiveTab("connect")}>
                    Go to Connect
                  </AdminButton>
                }
              />
            )}
          </>
        )}

        {/* ─── Site Profile Tab ─────────────────────────────────────── */}
        {activeTab === "profile" && (
          <>
            {audit ? (
              <SiteProfileView profile={audit.siteProfile} recommendations={audit.recommendations} />
            ) : (
              <AdminEmptyState
                icon={BookOpen}
                title="No Profile Available"
                description="Run an audit to generate a site profile."
                action={
                  <AdminButton variant="primary" onClick={() => setActiveTab("connect")}>
                    Go to Connect
                  </AdminButton>
                }
              />
            )}
          </>
        )}

        {/* ─── Content Tab ──────────────────────────────────────────── */}
        {activeTab === "content" && (
          <ContentManager
            siteId={siteId}
            connected={connected}
            posts={posts}
            loading={loadingPosts}
            onLoadPosts={loadPosts}
          />
        )}
      </div>
    </div>
  );
}

// ─── Audit Report View ───────────────────────────────────────────

function AuditReportView({ audit }: { audit: AuditResult }) {
  const ov = audit.overview as Record<string, unknown>;
  const content = audit.content as Record<string, unknown>;
  const seo = audit.seo as Record<string, unknown>;
  const design = audit.design as Record<string, unknown>;
  const writing = audit.writing as Record<string, unknown>;
  const langs = audit.languages as Record<string, unknown>;
  const tech = audit.technical as Record<string, unknown>;

  return (
    <div className="space-y-4">
      {/* Meta Bar */}
      <AdminCard>
        <div className="flex items-center justify-between">
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>
              {audit.meta.siteName}
            </span>
            <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginLeft: 8 }}>
              {audit.meta.siteUrl}
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E" }}>
            Audited {new Date(audit.meta.auditDate).toLocaleString()} ({audit.meta.auditDuration})
          </span>
        </div>
      </AdminCard>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Posts", value: ov.totalPosts, color: "#C8322B" },
          { label: "Pages", value: ov.totalPages, color: "#3B7EA1" },
          { label: "Media", value: ov.totalMedia, color: "#C49A2A" },
          { label: "Categories", value: ov.totalCategories, color: "#2D5A3D" },
          { label: "Tags", value: ov.totalTags, color: "#78716C" },
          { label: "Users", value: ov.totalUsers, color: "#3B7EA1" },
        ].map((stat) => (
          <AdminKPICard
            key={stat.label}
            value={String(stat.value ?? 0)}
            label={stat.label}
            color={stat.color}
          />
        ))}
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Content */}
        <AdminCard accent accentColor="red">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4" style={{ color: "#C8322B" }} />
            <AdminSectionLabel>Content Analysis</AdminSectionLabel>
          </div>
          <div className="space-y-2">
            {[
              { label: "Niche", value: String(content.niche) },
              { label: "Sub-niches", value: (content.subNiches as string[] || []).join(", ") },
              { label: "Avg word count", value: `${String(content.avgWordCount)} (${String(content.avgReadingTime)} read)` },
              { label: "Publish frequency", value: String(ov.publishFrequency) },
            ].map((item) => (
              <div key={item.label} className="flex justify-between">
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{item.value}</span>
              </div>
            ))}
            <div className="flex gap-1 flex-wrap mt-2">
              {Object.entries(content.contentPatterns as Record<string, boolean> || {})
                .filter(([, v]) => v)
                .map(([k]) => (
                  <AdminStatusBadge key={k} status="active" label={k.replace("uses", "")} />
                ))}
            </div>
          </div>
        </AdminCard>

        {/* SEO */}
        <AdminCard accent accentColor="blue">
          <div className="flex items-center gap-2 mb-3">
            <SearchIcon className="w-4 h-4" style={{ color: "#3B7EA1" }} />
            <AdminSectionLabel>SEO Analysis</AdminSectionLabel>
          </div>
          <div className="space-y-2">
            {[
              { label: "SEO Plugin", value: String(seo.seoPlugin) || "None" },
              { label: "Meta titles set", value: `${String(seo.postsWithMetaTitle)} / ${String(ov.totalPosts)}` },
              { label: "Meta descriptions", value: `${String(seo.postsWithMetaDesc)} / ${String(ov.totalPosts)}` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between">
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{item.value}</span>
              </div>
            ))}
            <div className="flex gap-1 flex-wrap mt-2">
              {seo.schemaMarkup && <AdminStatusBadge status="success" label="Schema" />}
              {seo.ogTags && <AdminStatusBadge status="success" label="OG Tags" />}
              {seo.hasSitemap && <AdminStatusBadge status="success" label="Sitemap" />}
              {seo.canonicalUrls && <AdminStatusBadge status="success" label="Canonical" />}
            </div>
          </div>
        </AdminCard>

        {/* Writing Style */}
        <AdminCard accent accentColor="gold">
          <div className="flex items-center gap-2 mb-3">
            <PenTool className="w-4 h-4" style={{ color: "#C49A2A" }} />
            <AdminSectionLabel>Writing Style</AdminSectionLabel>
          </div>
          <div className="space-y-2">
            {[
              { label: "Tone", value: String(writing.tone) },
              { label: "Perspective", value: String(writing.perspective) },
              { label: "Readability", value: `${String(writing.readabilityScore)}/100` },
              { label: "Avg sentence", value: `${String(writing.avgSentenceLength)} words` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between">
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{item.value}</span>
              </div>
            ))}
            <div className="flex gap-1 flex-wrap mt-2">
              {(writing.writingPatterns as string[] || []).map((p, i) => (
                <AdminStatusBadge key={i} status="pending" label={p} />
              ))}
            </div>
          </div>
        </AdminCard>

        {/* Design & Technical */}
        <AdminCard accent accentColor="green">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" style={{ color: "#2D5A3D" }} />
            <AdminSectionLabel>Design & Technical</AdminSectionLabel>
          </div>
          <div className="space-y-2">
            {[
              { label: "Theme", value: `${String(design.theme)} v${String(design.themeVersion)}` },
              { label: "Page Builder", value: String(design.pageBuilder) || "None" },
              { label: "Plugins", value: `${((tech.activePlugins as unknown[]) || []).length} active` },
              { label: "Languages", value: (langs.detectedLanguages as string[] || []).join(", ") },
            ].map((item) => (
              <div key={item.label} className="flex justify-between">
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{item.value}</span>
              </div>
            ))}
            {langs.multilingualPlugin && (
              <div className="flex justify-between">
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>Multilingual</span>
                <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{String(langs.multilingualPlugin)}</span>
              </div>
            )}
            {langs.hasArabicContent && <AdminStatusBadge status="active" label="Arabic Content" />}
          </div>
        </AdminCard>
      </div>

      {/* Recommendations */}
      {audit.recommendations.length > 0 && (
        <AdminCard>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: "#C49A2A" }} />
            <AdminSectionLabel>Recommendations</AdminSectionLabel>
          </div>
          <ul className="space-y-2">
            {audit.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#C49A2A" }} />
                <span style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#44403C", lineHeight: 1.5 }}>
                  {rec}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}
    </div>
  );
}

// ─── Site Profile View ───────────────────────────────────────────

function SiteProfileView({
  profile,
  recommendations,
}: {
  profile: AuditResult["siteProfile"];
  recommendations: string[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <AdminCard>
        <AdminSectionLabel>
          AI-Generated Site Profile for &quot;{profile.siteName}&quot;
        </AdminSectionLabel>
        <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C", marginBottom: 16 }}>
          This profile is used by the AI content engine to match the site&apos;s voice, style,
          and audience when generating content.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Niche", value: profile.niche },
            { label: "Tone", value: profile.tone },
            { label: "Writing Style", value: profile.writingStyle },
            { label: "Languages", value: profile.languages.join(", ") },
          ].map((item) => (
            <div key={item.label}>
              <span style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#A8A29E" }}>
                {item.label}
              </span>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#1C1917", marginTop: 2 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Colors */}
        <div className="mt-4">
          <span style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#A8A29E" }}>
            Color Palette
          </span>
          <div className="flex gap-2 mt-2">
            {Object.entries(profile.colorPalette).map(([name, hex]) => (
              <div key={name} className="text-center">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: hex, border: "1px solid rgba(214,208,196,0.6)" }} />
                <span style={{ fontFamily: "var(--font-system)", fontSize: 9, color: "#A8A29E" }}>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-niches */}
        <div className="mt-4">
          <span style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "#A8A29E" }}>
            Sub-niches
          </span>
          <div className="flex gap-1 flex-wrap mt-2">
            {profile.subNiches.map((n) => (
              <AdminStatusBadge key={n} status="active" label={n} />
            ))}
          </div>
        </div>
      </AdminCard>

      {/* System Prompt */}
      <AdminCard>
        <div className="flex items-center justify-between mb-3">
          <AdminSectionLabel>System Prompt (for AI Content Generation)</AdminSectionLabel>
          <AdminButton
            size="sm"
            onClick={() => copyToClipboard(profile.systemPrompt, "System Prompt")}
          >
            <Copy className="w-3 h-3" />
            {copied === "System Prompt" ? "Copied!" : "Copy"}
          </AdminButton>
        </div>
        <pre
          className="text-xs p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-auto"
          style={{
            backgroundColor: "#FAF8F4",
            border: "1px solid rgba(214,208,196,0.6)",
            fontFamily: "var(--font-system)",
            fontSize: 11,
            color: "#44403C",
          }}
        >
          {profile.systemPrompt}
        </pre>
      </AdminCard>

      {/* Content Guidelines */}
      <AdminCard>
        <div className="flex items-center justify-between mb-3">
          <AdminSectionLabel>Content Guidelines</AdminSectionLabel>
          <AdminButton
            size="sm"
            onClick={() => copyToClipboard(profile.contentGuidelines, "Content Guidelines")}
          >
            <Copy className="w-3 h-3" />
            {copied === "Content Guidelines" ? "Copied!" : "Copy"}
          </AdminButton>
        </div>
        <pre
          className="text-xs p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-auto"
          style={{
            backgroundColor: "#FAF8F4",
            border: "1px solid rgba(214,208,196,0.6)",
            fontFamily: "var(--font-system)",
            fontSize: 11,
            color: "#44403C",
          }}
        >
          {profile.contentGuidelines}
        </pre>
      </AdminCard>

      {/* SEO Guidelines */}
      <AdminCard>
        <div className="flex items-center justify-between mb-3">
          <AdminSectionLabel>SEO Guidelines</AdminSectionLabel>
          <AdminButton
            size="sm"
            onClick={() => copyToClipboard(profile.seoGuidelines, "SEO Guidelines")}
          >
            <Copy className="w-3 h-3" />
            {copied === "SEO Guidelines" ? "Copied!" : "Copy"}
          </AdminButton>
        </div>
        <pre
          className="text-xs p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-auto"
          style={{
            backgroundColor: "#FAF8F4",
            border: "1px solid rgba(214,208,196,0.6)",
            fontFamily: "var(--font-system)",
            fontSize: 11,
            color: "#44403C",
          }}
        >
          {profile.seoGuidelines}
        </pre>
      </AdminCard>
    </div>
  );
}

// ─── Content Manager ─────────────────────────────────────────────

function ContentManager({
  siteId,
  connected,
  posts,
  loading,
  onLoadPosts,
}: {
  siteId: string;
  connected: boolean;
  posts: unknown[];
  loading: boolean;
  onLoadPosts: (page?: number) => void;
}) {
  if (!connected) {
    return (
      <AdminEmptyState
        icon={Plug}
        title="Not Connected"
        description="Connect to a WordPress site first."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>
          Posts
        </span>
        <AdminButton onClick={() => onLoadPosts()} loading={loading} size="sm">
          <RefreshCw className="w-3 h-3" />
          Load Posts
        </AdminButton>
      </div>

      {posts.length === 0 ? (
        <AdminEmptyState
          icon={FileText}
          title={loading ? "Loading..." : "No Posts Loaded"}
          description={loading ? undefined : "Click 'Load Posts' to fetch content from the WordPress site."}
        />
      ) : (
        <div className="space-y-2">
          {posts.map((p: any) => (
            <AdminCard key={p.id} className="flex items-center gap-3">
              <AdminStatusBadge
                status={p.status === "publish" ? "published" : "draft"}
                label={p.status}
              />
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#1C1917" }} className="truncate">
                  {p.title?.rendered?.replace(/<[^>]*>/g, "") || "Untitled"}
                </p>
                <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#A8A29E" }}>
                  {new Date(p.date).toLocaleDateString()} — {p.link}
                </p>
              </div>
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() => window.open(p.link, "_blank")}
              >
                <Eye className="w-3.5 h-3.5" />
              </AdminButton>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
