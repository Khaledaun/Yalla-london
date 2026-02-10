"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  XCircle,
  AlertTriangle,
  BarChart3,
  Palette,
  Type,
  Languages,
  Shield,
  Zap,
  BookOpen,
  PenTool,
  Trash2,
  Eye,
  Plus,
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
      const data = await res.json();

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            WordPress Manager
          </h1>
          <p className="text-muted-foreground">
            Connect, audit, and manage WordPress websites via REST API
          </p>
        </div>
        {connected && connectionInfo && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {connectionInfo.siteName}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connect">
            <Plug className="w-4 h-4 mr-2" />
            Connect
          </TabsTrigger>
          <TabsTrigger value="audit" disabled={!audit}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Audit Report
          </TabsTrigger>
          <TabsTrigger value="profile" disabled={!audit}>
            <BookOpen className="w-4 h-4 mr-2" />
            Site Profile
          </TabsTrigger>
          <TabsTrigger value="content" disabled={!connected}>
            <FileText className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
        </TabsList>

        {/* ─── Connect Tab ──────────────────────────────────────────── */}
        <TabsContent value="connect">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plug className="w-4 h-4" />
                  WordPress Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Site ID (for this system)</Label>
                  <Input
                    placeholder="my-wordpress-site"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique identifier used in env vars and config
                  </p>
                </div>
                <div>
                  <Label>WordPress REST API URL</Label>
                  <Input
                    placeholder="https://example.com/wp-json/wp/v2"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Application Password</Label>
                  <Input
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate at WordPress Dashboard &gt; Users &gt; Profile &gt; Application Passwords
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={testConnection} disabled={connecting}>
                    {connecting ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plug className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  {connected && (
                    <Button onClick={runAudit} disabled={auditing} variant="default">
                      {auditing ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <SearchIcon className="w-4 h-4 mr-2" />
                      )}
                      {auditing ? "Auditing..." : "Run Full Audit"}
                    </Button>
                  )}
                </div>

                {connected && connectionInfo && (
                  <div className="p-3 rounded bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Connected</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      {connectionInfo.siteName} — {connectionInfo.siteUrl}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <Badge className="shrink-0">1</Badge>
                  <p>Connect your WordPress site using REST API credentials</p>
                </div>
                <div className="flex gap-3">
                  <Badge className="shrink-0">2</Badge>
                  <p>
                    <strong>Automatic audit</strong> analyzes content, design, SEO, writing style,
                    languages, structure, and media assets
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="shrink-0">3</Badge>
                  <p>
                    AI generates a <strong>Site Profile</strong> with system prompt, content
                    guidelines, and SEO rules matched to your site's voice
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge className="shrink-0">4</Badge>
                  <p>
                    Manage content directly — create/edit posts, upload media, and publish from
                    this dashboard
                  </p>
                </div>

                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Required WordPress setup:</strong> WP 5.6+, Application Passwords
                    enabled, REST API accessible. For SEO data: Yoast SEO or RankMath plugin.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Audit Report Tab ─────────────────────────────────────── */}
        <TabsContent value="audit">
          {audit && <AuditReportView audit={audit} />}
        </TabsContent>

        {/* ─── Site Profile Tab ─────────────────────────────────────── */}
        <TabsContent value="profile">
          {audit && <SiteProfileView profile={audit.siteProfile} recommendations={audit.recommendations} />}
        </TabsContent>

        {/* ─── Content Tab ──────────────────────────────────────────── */}
        <TabsContent value="content">
          <ContentManager
            siteId={siteId}
            connected={connected}
            posts={posts}
            loading={loadingPosts}
            onLoadPosts={loadPosts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Audit Report View ───────────────────────────────────────────

function AuditReportView({ audit }: { audit: AuditResult }) {
  const ov = audit.overview as Record<string, unknown>;
  const content = audit.content as Record<string, unknown>;
  const seo = audit.seo as Record<string, unknown>;
  const design = audit.design as Record<string, unknown>;
  const media = audit.media as Record<string, unknown>;
  const writing = audit.writing as Record<string, unknown>;
  const langs = audit.languages as Record<string, unknown>;
  const tech = audit.technical as Record<string, unknown>;

  return (
    <div className="space-y-4">
      {/* Meta Bar */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between">
          <div>
            <span className="font-medium">{audit.meta.siteName}</span>
            <span className="text-muted-foreground text-sm ml-2">{audit.meta.siteUrl}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Audited {new Date(audit.meta.auditDate).toLocaleString()} ({audit.meta.auditDuration})
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Posts", value: ov.totalPosts, icon: FileText },
          { label: "Pages", value: ov.totalPages, icon: BookOpen },
          { label: "Media", value: ov.totalMedia, icon: ImageIcon },
          { label: "Categories", value: ov.totalCategories, icon: Tags },
          { label: "Tags", value: ov.totalTags, icon: Tags },
          { label: "Users", value: ov.totalUsers, icon: Users },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-3 pb-2 text-center">
              <stat.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-2xl font-bold">{String(stat.value)}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> Content Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>Niche:</strong> {String(content.niche)}</div>
            <div><strong>Sub-niches:</strong> {(content.subNiches as string[] || []).join(", ")}</div>
            <div><strong>Avg word count:</strong> {String(content.avgWordCount)} ({String(content.avgReadingTime)} read)</div>
            <div><strong>Publish frequency:</strong> {String(ov.publishFrequency)}</div>
            <div className="flex gap-1 flex-wrap mt-2">
              {Object.entries(content.contentPatterns as Record<string, boolean> || {})
                .filter(([, v]) => v)
                .map(([k]) => (
                  <Badge key={k} variant="secondary" className="text-xs">
                    {k.replace("uses", "")}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <SearchIcon className="w-4 h-4" /> SEO Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>SEO Plugin:</strong> {String(seo.seoPlugin) || "None"}</div>
            <div><strong>Meta titles set:</strong> {String(seo.postsWithMetaTitle)} / {String(ov.totalPosts)}</div>
            <div><strong>Meta descriptions:</strong> {String(seo.postsWithMetaDesc)} / {String(ov.totalPosts)}</div>
            <div className="flex gap-2 flex-wrap mt-2">
              {seo.schemaMarkup && <Badge variant="secondary">Schema</Badge>}
              {seo.ogTags && <Badge variant="secondary">OG Tags</Badge>}
              {seo.hasSitemap && <Badge variant="secondary">Sitemap</Badge>}
              {seo.canonicalUrls && <Badge variant="secondary">Canonical</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Writing Style */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Writing Style
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>Tone:</strong> {String(writing.tone)}</div>
            <div><strong>Perspective:</strong> {String(writing.perspective)}</div>
            <div><strong>Readability:</strong> {String(writing.readabilityScore)}/100</div>
            <div><strong>Avg sentence:</strong> {String(writing.avgSentenceLength)} words</div>
            <div className="flex gap-1 flex-wrap mt-2">
              {(writing.writingPatterns as string[] || []).map((p, i) => (
                <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Design & Technical */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="w-4 h-4" /> Design & Technical
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><strong>Theme:</strong> {String(design.theme)} v{String(design.themeVersion)}</div>
            <div><strong>Page Builder:</strong> {String(design.pageBuilder) || "None"}</div>
            <div><strong>Plugins:</strong> {((tech.activePlugins as unknown[]) || []).length} active</div>
            <div><strong>Languages:</strong> {(langs.detectedLanguages as string[] || []).join(", ")}</div>
            {langs.multilingualPlugin && (
              <div><strong>Multilingual:</strong> {String(langs.multilingualPlugin)}</div>
            )}
            {langs.hasArabicContent && <Badge variant="secondary">Arabic Content</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {audit.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" /> Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {audit.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            AI-Generated Site Profile for "{profile.siteName}"
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            This profile is used by the AI content engine to match the site's voice, style,
            and audience when generating content.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-[10px]">Niche</Label>
              <p className="font-medium">{profile.niche}</p>
            </div>
            <div>
              <Label className="text-[10px]">Tone</Label>
              <p className="font-medium">{profile.tone}</p>
            </div>
            <div>
              <Label className="text-[10px]">Writing Style</Label>
              <p className="font-medium">{profile.writingStyle}</p>
            </div>
            <div>
              <Label className="text-[10px]">Languages</Label>
              <p className="font-medium">{profile.languages.join(", ")}</p>
            </div>
          </div>

          {/* Colors */}
          <div>
            <Label className="text-[10px]">Color Palette</Label>
            <div className="flex gap-2 mt-1">
              {Object.entries(profile.colorPalette).map(([name, hex]) => (
                <div key={name} className="text-center">
                  <div className="w-8 h-8 rounded border" style={{ backgroundColor: hex }} />
                  <span className="text-[9px] text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-niches */}
          <div>
            <Label className="text-[10px]">Sub-niches</Label>
            <div className="flex gap-1 flex-wrap mt-1">
              {profile.subNiches.map((n) => (
                <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">System Prompt (for AI Content Generation)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(profile.systemPrompt, "System Prompt")}
            >
              {copied === "System Prompt" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-auto">
            {profile.systemPrompt}
          </pre>
        </CardContent>
      </Card>

      {/* Content Guidelines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Content Guidelines</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(profile.contentGuidelines, "Content Guidelines")}
            >
              {copied === "Content Guidelines" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-auto">
            {profile.contentGuidelines}
          </pre>
        </CardContent>
      </Card>

      {/* SEO Guidelines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">SEO Guidelines</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(profile.seoGuidelines, "SEO Guidelines")}
            >
              {copied === "SEO Guidelines" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-auto">
            {profile.seoGuidelines}
          </pre>
        </CardContent>
      </Card>
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
      <Card>
        <CardContent className="py-12 text-center">
          <Plug className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p>Connect to a WordPress site first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Posts</h3>
        <Button onClick={() => onLoadPosts()} disabled={loading} size="sm">
          {loading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Load Posts
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {loading ? "Loading..." : "Click 'Load Posts' to fetch content from the WordPress site."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <Badge variant={p.status === "publish" ? "default" : "outline"} className="text-xs shrink-0">
                  {p.status}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.title?.rendered?.replace(/<[^>]*>/g, "") || "Untitled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.date).toLocaleDateString()} — {p.link}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(p.link, "_blank")}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
