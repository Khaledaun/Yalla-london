/**
 * Cloudflare API Client
 *
 * Provides read/write access to Cloudflare zone settings, DNS, cache,
 * analytics, page rules, and more for SEO management.
 *
 * Required env vars:
 *   CLOUDFLARE_API_TOKEN - API token with zone read/edit permissions
 *   CLOUDFLARE_ZONE_ID   - Zone ID (found on Cloudflare dashboard overview)
 */

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
}

// ============================================
// TYPES
// ============================================

export interface CFZoneDetails {
  id: string;
  name: string;
  status: string;
  nameServers: string[];
  plan: string;
  ssl: string;
  developmentMode: boolean;
}

export interface CFDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

export interface CFAnalytics {
  requests: { all: number; cached: number; uncached: number };
  bandwidth: { all: number; cached: number; uncached: number };
  threats: number;
  pageViews: number;
  uniqueVisitors: number;
}

export interface CFCacheSettings {
  cacheLevel: string;
  browserCacheTTL: number;
  alwaysOnline: string;
  developmentMode: string;
  minify: { js: string; css: string; html: string };
}

export interface CFSecuritySettings {
  ssl: string;
  alwaysUseHttps: string;
  minTlsVersion: string;
  automaticHttpsRewrites: string;
  securityLevel: string;
  waf: string;
}

export interface CFPageRule {
  id: string;
  targets: Array<{ constraint: { value: string } }>;
  actions: Array<{ id: string; value: any }>;
  priority: number;
  status: string;
}

export interface CFBotManagement {
  aiBotsProtection: string;
  robotsTxtMode: string;
}

// ============================================
// CLIENT
// ============================================

export class CloudflareClient {
  private config: CloudflareConfig;

  constructor() {
    this.config = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || "",
      zoneId: process.env.CLOUDFLARE_ZONE_ID || "",
    };
  }

  isConfigured(): boolean {
    return !!(this.config.apiToken && this.config.zoneId);
  }

  getStatus(): { configured: boolean; zoneId: string } {
    return {
      configured: this.isConfigured(),
      zoneId: this.config.zoneId ? `${this.config.zoneId.slice(0, 6)}...` : "",
    };
  }

  private async request(
    path: string,
    method: string = "GET",
    body?: Record<string, unknown>,
  ): Promise<any> {
    const url = `${CF_API_BASE}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare API error: HTTP ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // ZONE INFO
  // ============================================

  async getZoneDetails(): Promise<CFZoneDetails | null> {
    if (!this.isConfigured()) return null;
    try {
      const data = await this.request(`/zones/${this.config.zoneId}`);
      const z = data.result;
      return {
        id: z.id,
        name: z.name,
        status: z.status,
        nameServers: z.name_servers || [],
        plan: z.plan?.name || "Unknown",
        ssl: z.ssl?.status || "unknown",
        developmentMode: z.development_mode > 0,
      };
    } catch (error) {
      console.error("Failed to get zone details:", error);
      return null;
    }
  }

  // ============================================
  // DNS RECORDS
  // ============================================

  async getDNSRecords(): Promise<CFDNSRecord[]> {
    if (!this.isConfigured()) return [];
    try {
      const data = await this.request(`/zones/${this.config.zoneId}/dns_records?per_page=100`);
      return (data.result || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        content: r.content,
        proxied: r.proxied,
        ttl: r.ttl,
      }));
    } catch (error) {
      console.error("Failed to get DNS records:", error);
      return [];
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getAnalytics(since: string = "-1440"): Promise<CFAnalytics | null> {
    if (!this.isConfigured()) return null;
    try {
      const data = await this.request(
        `/zones/${this.config.zoneId}/analytics/dashboard?since=${since}&continuous=true`,
      );
      const totals = data.result?.totals;
      if (!totals) return null;
      return {
        requests: {
          all: totals.requests?.all || 0,
          cached: totals.requests?.cached || 0,
          uncached: totals.requests?.uncached || 0,
        },
        bandwidth: {
          all: totals.bandwidth?.all || 0,
          cached: totals.bandwidth?.cached || 0,
          uncached: totals.bandwidth?.uncached || 0,
        },
        threats: totals.threats?.all || 0,
        pageViews: totals.pageviews?.all || 0,
        uniqueVisitors: totals.uniques?.all || 0,
      };
    } catch (error) {
      console.error("Failed to get analytics:", error);
      return null;
    }
  }

  // ============================================
  // ZONE SETTINGS (cache, SSL, security, etc.)
  // ============================================

  async getAllSettings(): Promise<Record<string, any>> {
    if (!this.isConfigured()) return {};
    try {
      const data = await this.request(`/zones/${this.config.zoneId}/settings`);
      const settings: Record<string, any> = {};
      for (const s of data.result || []) {
        settings[s.id] = s.value;
      }
      return settings;
    } catch (error) {
      console.error("Failed to get zone settings:", error);
      return {};
    }
  }

  async getCacheSettings(): Promise<CFCacheSettings | null> {
    if (!this.isConfigured()) return null;
    try {
      const settings = await this.getAllSettings();
      return {
        cacheLevel: settings.cache_level || "unknown",
        browserCacheTTL: settings.browser_cache_ttl || 0,
        alwaysOnline: settings.always_online || "off",
        developmentMode: settings.development_mode || "off",
        minify: settings.minify || { js: "off", css: "off", html: "off" },
      };
    } catch (error) {
      console.error("Failed to get cache settings:", error);
      return null;
    }
  }

  async getSecuritySettings(): Promise<CFSecuritySettings | null> {
    if (!this.isConfigured()) return null;
    try {
      const settings = await this.getAllSettings();
      return {
        ssl: settings.ssl || "unknown",
        alwaysUseHttps: settings.always_use_https || "off",
        minTlsVersion: settings.min_tls_version || "unknown",
        automaticHttpsRewrites: settings.automatic_https_rewrites || "off",
        securityLevel: settings.security_level || "unknown",
        waf: settings.waf || "off",
      };
    } catch (error) {
      console.error("Failed to get security settings:", error);
      return null;
    }
  }

  // ============================================
  // PAGE RULES
  // ============================================

  async getPageRules(): Promise<CFPageRule[]> {
    if (!this.isConfigured()) return [];
    try {
      const data = await this.request(`/zones/${this.config.zoneId}/pagerules`);
      return (data.result || []).map((r: any) => ({
        id: r.id,
        targets: r.targets || [],
        actions: r.actions || [],
        priority: r.priority,
        status: r.status,
      }));
    } catch (error) {
      console.error("Failed to get page rules:", error);
      return [];
    }
  }

  async createPageRule(
    urlPattern: string,
    actions: Array<{ id: string; value: any }>,
    status: string = "active",
  ): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.request(`/zones/${this.config.zoneId}/pagerules`, "POST", {
        targets: [{ target: "url", constraint: { operator: "matches", value: urlPattern } }],
        actions,
        status,
      });
      return true;
    } catch (error) {
      console.error("Failed to create page rule:", error);
      return false;
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  async purgeEverything(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.request(`/zones/${this.config.zoneId}/purge_cache`, "POST", {
        purge_everything: true,
      });
      return true;
    } catch (error) {
      console.error("Failed to purge cache:", error);
      return false;
    }
  }

  async purgeURLs(urls: string[]): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      // CF allows max 30 URLs per purge request
      for (let i = 0; i < urls.length; i += 30) {
        const batch = urls.slice(i, i + 30);
        await this.request(`/zones/${this.config.zoneId}/purge_cache`, "POST", {
          files: batch,
        });
        if (i + 30 < urls.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to purge URLs:", error);
      return false;
    }
  }

  // ============================================
  // SETTINGS UPDATES
  // ============================================

  async updateSetting(settingId: string, value: any): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.request(`/zones/${this.config.zoneId}/settings/${settingId}`, "PATCH", { value });
      return true;
    } catch (error) {
      console.error(`Failed to update setting ${settingId}:`, error);
      return false;
    }
  }

  async setBrowserCacheTTL(seconds: number): Promise<boolean> {
    return this.updateSetting("browser_cache_ttl", seconds);
  }

  async setCacheLevel(level: "aggressive" | "basic" | "simplified"): Promise<boolean> {
    return this.updateSetting("cache_level", level);
  }

  async setAlwaysUseHttps(on: boolean): Promise<boolean> {
    return this.updateSetting("always_use_https", on ? "on" : "off");
  }

  async setMinify(options: { js: string; css: string; html: string }): Promise<boolean> {
    return this.updateSetting("minify", options);
  }

  async setSSL(mode: "off" | "flexible" | "full" | "strict"): Promise<boolean> {
    return this.updateSetting("ssl", mode);
  }

  // ============================================
  // BULK REDIRECTS (for fixing 404s)
  // ============================================

  async getRedirectLists(): Promise<any[]> {
    if (!this.isConfigured()) return [];
    try {
      // Account-level lists
      const accountId = await this.getAccountId();
      if (!accountId) return [];
      const data = await this.request(`/accounts/${accountId}/rules/lists?kind=redirect`);
      return data.result || [];
    } catch (error) {
      console.error("Failed to get redirect lists:", error);
      return [];
    }
  }

  private async getAccountId(): Promise<string | null> {
    try {
      const data = await this.request(`/zones/${this.config.zoneId}`);
      return data.result?.account?.id || null;
    } catch {
      return null;
    }
  }

  // ============================================
  // CRAWL HINTS / BOT MANAGEMENT
  // ============================================

  async getBotManagement(): Promise<CFBotManagement | null> {
    if (!this.isConfigured()) return null;
    try {
      const settings = await this.getAllSettings();
      return {
        aiBotsProtection: settings.ai_bots_protection || "unknown",
        robotsTxtMode: settings.robots_txt_mode || "unknown",
      };
    } catch (error) {
      console.error("Failed to get bot management:", error);
      return null;
    }
  }

  // ============================================
  // COMPREHENSIVE AUDIT
  // ============================================

  async runAudit(): Promise<{
    zone: CFZoneDetails | null;
    dns: CFDNSRecord[];
    analytics: CFAnalytics | null;
    cache: CFCacheSettings | null;
    security: CFSecuritySettings | null;
    pageRules: CFPageRule[];
    botManagement: CFBotManagement | null;
    issues: string[];
    recommendations: string[];
  }> {
    const [zone, dns, analytics, cache, security, pageRules, botManagement] =
      await Promise.all([
        this.getZoneDetails(),
        this.getDNSRecords(),
        this.getAnalytics(),
        this.getCacheSettings(),
        this.getSecuritySettings(),
        this.getPageRules(),
        this.getBotManagement(),
      ]);

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check cache performance
    if (analytics) {
      const cacheRate = analytics.requests.all > 0
        ? (analytics.requests.cached / analytics.requests.all) * 100
        : 0;
      if (cacheRate < 30) {
        issues.push(
          `Cache hit rate is ${cacheRate.toFixed(1)}% (should be >50%). Most requests hit origin server.`
        );
        recommendations.push(
          "Set browser cache TTL to at least 4 hours (14400s) and cache level to 'aggressive'"
        );
      }
    }

    // Check cache settings
    if (cache) {
      if (cache.browserCacheTTL < 14400) {
        issues.push(
          `Browser cache TTL is ${cache.browserCacheTTL}s (${Math.round(cache.browserCacheTTL / 3600)}h). Recommended: 4+ hours for static assets.`
        );
      }
      if (cache.developmentMode === "on") {
        issues.push("Development mode is ON — caching is completely disabled");
      }
      if (cache.minify.js === "off" || cache.minify.css === "off" || cache.minify.html === "off") {
        recommendations.push("Enable Cloudflare minification for JS, CSS, and HTML");
      }
    }

    // Check security
    if (security) {
      if (security.ssl !== "full" && security.ssl !== "strict") {
        issues.push(
          `SSL mode is "${security.ssl}" — should be "full" or "strict" for proper HTTPS`
        );
      }
      if (security.alwaysUseHttps !== "on") {
        issues.push("Always Use HTTPS is OFF — HTTP requests won't redirect to HTTPS");
        recommendations.push("Enable 'Always Use HTTPS' to force HTTPS redirects");
      }
      if (security.automaticHttpsRewrites !== "on") {
        recommendations.push("Enable 'Automatic HTTPS Rewrites' to fix mixed content");
      }
    }

    // Check DNS
    const wwwRecord = dns.find(
      (r) => r.type === "CNAME" && r.name.startsWith("www.")
    );
    const rootRecord = dns.find(
      (r) => (r.type === "A" || r.type === "CNAME") && !r.name.startsWith("www.")
    );
    if (!wwwRecord) {
      issues.push("No www CNAME record found — www.yalla-london.com may not resolve");
    }
    if (rootRecord && !rootRecord.proxied) {
      recommendations.push("Root domain DNS record is not proxied through Cloudflare — enable proxy for CDN benefits");
    }

    // Check page rules
    if (pageRules.length === 0) {
      recommendations.push(
        "No page rules configured. Consider adding cache-everything rules for static pages"
      );
    }

    // Bot management
    if (botManagement?.aiBotsProtection === "block") {
      issues.push(
        "AI bot protection is set to BLOCK — this prevents AI crawlers (ChatGPT, Perplexity, etc.) from indexing your content for AIO"
      );
      recommendations.push("Set AI crawl control to 'Allow' for AIO visibility");
    }

    return {
      zone,
      dns,
      analytics,
      cache,
      security,
      pageRules,
      botManagement,
      issues,
      recommendations,
    };
  }
}

export const cloudflare = new CloudflareClient();
