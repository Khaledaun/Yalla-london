/**
 * WordPress REST API Client
 *
 * Full CRUD operations for managing WordPress sites via REST API.
 * Supports Application Passwords and JWT auth.
 * Manages: posts, pages, media, categories, tags, users, settings, menus.
 */

// ─── Types ───────────────────────────────────────────────────────

export interface WPCredentials {
  apiUrl: string;      // e.g. "https://example.com/wp-json/wp/v2"
  username: string;
  appPassword: string; // Application Password (WP 5.6+)
}

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  slug: string;
  status: "publish" | "draft" | "pending" | "private" | "future" | "trash";
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  meta: Record<string, unknown>;
  yoast_head_json?: Record<string, unknown>;
  rank_math?: Record<string, unknown>;
}

export interface WPPage {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  parent: number;
  menu_order: number;
  template: string;
  meta: Record<string, unknown>;
}

export interface WPMedia {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  caption: { rendered: string };
  alt_text: string;
  media_type: string;
  mime_type: string;
  source_url: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: Record<string, { width: number; height: number; source_url: string }>;
  };
}

export interface WPCategory {
  id: number;
  count: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
}

export interface WPTag {
  id: number;
  count: number;
  name: string;
  slug: string;
  description: string;
}

export interface WPUser {
  id: number;
  username: string;
  name: string;
  slug: string;
  roles: string[];
  avatar_urls: Record<string, string>;
}

export interface WPSettings {
  title: string;
  description: string;
  url: string;
  language: string;
  timezone_string: string;
  date_format: string;
  posts_per_page: number;
}

export interface WPPlugin {
  plugin: string;
  status: "active" | "inactive";
  name: string;
  version: string;
  description: { rendered: string };
}

export interface WPTheme {
  stylesheet: string;
  name: { rendered: string };
  version: string;
  status: string;
  template: string;
}

// ─── Client ──────────────────────────────────────────────────────

export class WordPressClient {
  private apiUrl: string;
  private authHeader: string;

  constructor(credentials: WPCredentials) {
    this.apiUrl = credentials.apiUrl.replace(/\/$/, "");
    this.authHeader =
      "Basic " +
      Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString("base64");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.apiUrl}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `WP API ${res.status}: ${res.statusText} - ${errorBody.slice(0, 500)}`,
      );
    }

    return res.json();
  }

  private async requestWithHeaders<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ data: T; total: number; totalPages: number }> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.apiUrl}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`WP API ${res.status}: ${errorBody.slice(0, 500)}`);
    }

    return {
      data: await res.json(),
      total: parseInt(res.headers.get("X-WP-Total") || "0"),
      totalPages: parseInt(res.headers.get("X-WP-TotalPages") || "0"),
    };
  }

  // ─── Connection Test ───────────────────────────────────────────

  async testConnection(): Promise<{
    connected: boolean;
    siteName?: string;
    siteUrl?: string;
    wpVersion?: string;
    error?: string;
  }> {
    try {
      // Hit the root WP REST API endpoint
      const rootUrl = this.apiUrl.replace("/wp/v2", "");
      const info = await this.request<{
        name: string;
        url: string;
        description: string;
        namespaces: string[];
      }>(rootUrl);

      return {
        connected: true,
        siteName: info.name,
        siteUrl: info.url,
      };
    } catch (e) {
      return {
        connected: false,
        error: e instanceof Error ? e.message : "Connection failed",
      };
    }
  }

  // ─── Posts ─────────────────────────────────────────────────────

  async getPosts(params: {
    page?: number;
    per_page?: number;
    status?: string;
    categories?: number[];
    tags?: number[];
    search?: string;
    orderby?: string;
    order?: "asc" | "desc";
  } = {}): Promise<{ posts: WPPost[]; total: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.per_page) searchParams.set("per_page", String(params.per_page));
    if (params.status) searchParams.set("status", params.status);
    if (params.categories?.length) searchParams.set("categories", params.categories.join(","));
    if (params.tags?.length) searchParams.set("tags", params.tags.join(","));
    if (params.search) searchParams.set("search", params.search);
    if (params.orderby) searchParams.set("orderby", params.orderby);
    if (params.order) searchParams.set("order", params.order);

    const qs = searchParams.toString();
    const result = await this.requestWithHeaders<WPPost[]>(
      `/posts${qs ? `?${qs}` : ""}`,
    );
    return { posts: result.data, total: result.total, totalPages: result.totalPages };
  }

  async getPost(id: number): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`);
  }

  async createPost(data: {
    title: string;
    content: string;
    status?: string;
    excerpt?: string;
    categories?: number[];
    tags?: number[];
    featured_media?: number;
    slug?: string;
    meta?: Record<string, unknown>;
  }): Promise<WPPost> {
    return this.request<WPPost>("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: number, data: Partial<{
    title: string;
    content: string;
    status: string;
    excerpt: string;
    categories: number[];
    tags: number[];
    featured_media: number;
    slug: string;
    meta: Record<string, unknown>;
  }>): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deletePost(id: number, force = false): Promise<void> {
    await this.request(`/posts/${id}?force=${force}`, { method: "DELETE" });
  }

  // ─── Pages ─────────────────────────────────────────────────────

  async getPages(params: {
    page?: number;
    per_page?: number;
    status?: string;
    parent?: number;
    search?: string;
  } = {}): Promise<{ pages: WPPage[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.per_page) searchParams.set("per_page", String(params.per_page));
    if (params.status) searchParams.set("status", params.status);
    if (params.parent !== undefined) searchParams.set("parent", String(params.parent));
    if (params.search) searchParams.set("search", params.search);

    const qs = searchParams.toString();
    const result = await this.requestWithHeaders<WPPage[]>(
      `/pages${qs ? `?${qs}` : ""}`,
    );
    return { pages: result.data, total: result.total };
  }

  async createPage(data: {
    title: string;
    content: string;
    status?: string;
    parent?: number;
    template?: string;
    slug?: string;
  }): Promise<WPPage> {
    return this.request<WPPage>("/pages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePage(id: number, data: Partial<{
    title: string;
    content: string;
    status: string;
    parent: number;
    slug: string;
  }>): Promise<WPPage> {
    return this.request<WPPage>(`/pages/${id}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deletePage(id: number, force = false): Promise<void> {
    await this.request(`/pages/${id}?force=${force}`, { method: "DELETE" });
  }

  // ─── Media ─────────────────────────────────────────────────────

  async getMedia(params: {
    page?: number;
    per_page?: number;
    media_type?: string;
    search?: string;
  } = {}): Promise<{ media: WPMedia[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.per_page) searchParams.set("per_page", String(params.per_page));
    if (params.media_type) searchParams.set("media_type", params.media_type);
    if (params.search) searchParams.set("search", params.search);

    const qs = searchParams.toString();
    const result = await this.requestWithHeaders<WPMedia[]>(
      `/media${qs ? `?${qs}` : ""}`,
    );
    return { media: result.data, total: result.total };
  }

  async uploadMedia(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    meta?: { title?: string; alt_text?: string; caption?: string },
  ): Promise<WPMedia> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append("file", blob, filename);
    if (meta?.title) formData.append("title", meta.title);
    if (meta?.alt_text) formData.append("alt_text", meta.alt_text);
    if (meta?.caption) formData.append("caption", meta.caption);

    const url = `${this.apiUrl}/media`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: this.authHeader },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WP Media upload failed: ${res.status} - ${err.slice(0, 300)}`);
    }

    return res.json();
  }

  async deleteMedia(id: number, force = true): Promise<void> {
    await this.request(`/media/${id}?force=${force}`, { method: "DELETE" });
  }

  // ─── Categories & Tags ─────────────────────────────────────────

  async getCategories(params: { per_page?: number } = {}): Promise<WPCategory[]> {
    const pp = params.per_page || 100;
    return this.request<WPCategory[]>(`/categories?per_page=${pp}`);
  }

  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    parent?: number;
  }): Promise<WPCategory> {
    return this.request<WPCategory>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTags(params: { per_page?: number } = {}): Promise<WPTag[]> {
    const pp = params.per_page || 100;
    return this.request<WPTag[]>(`/tags?per_page=${pp}`);
  }

  async createTag(data: { name: string; slug?: string; description?: string }): Promise<WPTag> {
    return this.request<WPTag>("/tags", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Users ─────────────────────────────────────────────────────

  async getUsers(params: { per_page?: number; roles?: string } = {}): Promise<WPUser[]> {
    const searchParams = new URLSearchParams();
    if (params.per_page) searchParams.set("per_page", String(params.per_page));
    if (params.roles) searchParams.set("roles", params.roles);
    const qs = searchParams.toString();
    return this.request<WPUser[]>(`/users${qs ? `?${qs}` : ""}`);
  }

  // ─── Settings ──────────────────────────────────────────────────

  async getSettings(): Promise<WPSettings> {
    return this.request<WPSettings>("/settings");
  }

  async updateSettings(data: Partial<WPSettings>): Promise<WPSettings> {
    return this.request<WPSettings>("/settings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Plugins & Themes ──────────────────────────────────────────

  async getPlugins(): Promise<WPPlugin[]> {
    try {
      return await this.request<WPPlugin[]>(
        this.apiUrl.replace("/wp/v2", "/wp/v2/plugins"),
      );
    } catch {
      return []; // Plugin endpoint may require extra permissions
    }
  }

  async getThemes(): Promise<WPTheme[]> {
    try {
      return await this.request<WPTheme[]>(
        this.apiUrl.replace("/wp/v2", "/wp/v2/themes"),
      );
    } catch {
      return [];
    }
  }

  // ─── Yoast / RankMath SEO Meta ─────────────────────────────────

  async getSeoMeta(postId: number): Promise<Record<string, unknown> | null> {
    try {
      const post = await this.getPost(postId);
      return post.yoast_head_json || post.rank_math || post.meta || null;
    } catch {
      return null;
    }
  }

  // ─── Bulk Operations ───────────────────────────────────────────

  async getAllPosts(status = "publish"): Promise<WPPost[]> {
    const allPosts: WPPost[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getPosts({ page, per_page: 100, status });
      allPosts.push(...result.posts);
      hasMore = page < result.totalPages;
      page++;
    }

    return allPosts;
  }

  async getAllPages(status = "publish"): Promise<WPPage[]> {
    const allPages: WPPage[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getPages({ page, per_page: 100, status });
      allPages.push(...result.pages);
      hasMore = allPages.length < result.total;
      page++;
    }

    return allPages;
  }

  async getAllMedia(): Promise<WPMedia[]> {
    const allMedia: WPMedia[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getMedia({ page, per_page: 100 });
      allMedia.push(...result.media);
      hasMore = allMedia.length < result.total;
      page++;
    }

    return allMedia;
  }
}

// ─── Helper: Create client from env vars ─────────────────────────

export function createWPClient(siteId: string): WordPressClient | null {
  const prefix = siteId.toUpperCase().replace(/-/g, "_");

  const apiUrl =
    process.env[`WP_${prefix}_API_URL`] ||
    process.env[`WORDPRESS_${prefix}_API_URL`];
  const username =
    process.env[`WP_${prefix}_USERNAME`] ||
    process.env[`WORDPRESS_${prefix}_USERNAME`];
  const appPassword =
    process.env[`WP_${prefix}_APP_PASSWORD`] ||
    process.env[`WORDPRESS_${prefix}_APP_PASSWORD`];

  if (!apiUrl || !username || !appPassword) return null;

  return new WordPressClient({ apiUrl, username, appPassword });
}
