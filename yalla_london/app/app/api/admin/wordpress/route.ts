export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  WordPressClient,
  createWPClient,
  type WPCredentials,
} from "@/lib/integrations/wordpress";

/**
 * GET /api/admin/wordpress
 *
 * List connected WordPress sites or manage a specific site.
 *
 * Query params:
 *   ?siteId=my-wp-site         — target WP site
 *   ?action=posts|pages|media|categories|tags|users|settings
 *   ?page=1&per_page=10        — pagination
 *   ?status=publish|draft       — filter by status
 *   ?search=keyword             — search
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get("siteId");
  const action = searchParams.get("action") || "test";

  if (!siteId) {
    return NextResponse.json(
      { error: "siteId is required" },
      { status: 400 },
    );
  }

  const client = createWPClient(siteId);
  if (!client) {
    return NextResponse.json(
      {
        error: `No WordPress credentials found for site "${siteId}". Set WP_${siteId.toUpperCase().replace(/-/g, "_")}_API_URL, _USERNAME, _APP_PASSWORD env vars.`,
      },
      { status: 404 },
    );
  }

  try {
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "20");
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    switch (action) {
      case "test": {
        const result = await client.testConnection();
        return NextResponse.json({ success: true, ...result });
      }

      case "posts": {
        const result = await client.getPosts({ page, per_page: perPage, status, search });
        return NextResponse.json({ success: true, ...result });
      }

      case "pages": {
        const result = await client.getPages({ page, per_page: perPage, status, search });
        return NextResponse.json({ success: true, ...result });
      }

      case "media": {
        const result = await client.getMedia({ page, per_page: perPage, search });
        return NextResponse.json({ success: true, ...result });
      }

      case "categories": {
        const cats = await client.getCategories();
        return NextResponse.json({ success: true, categories: cats });
      }

      case "tags": {
        const tags = await client.getTags();
        return NextResponse.json({ success: true, tags });
      }

      case "users": {
        const users = await client.getUsers();
        return NextResponse.json({ success: true, users });
      }

      case "settings": {
        const settings = await client.getSettings();
        return NextResponse.json({ success: true, settings });
      }

      case "plugins": {
        const plugins = await client.getPlugins();
        return NextResponse.json({ success: true, plugins });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "WordPress API call failed",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/wordpress
 *
 * Create content on a WordPress site.
 *
 * Body: { siteId, action, data }
 *   action: "create-post" | "update-post" | "delete-post" |
 *           "create-page" | "update-page" | "delete-page" |
 *           "create-category" | "create-tag" |
 *           "upload-media" | "delete-media" |
 *           "update-settings" |
 *           "test-connection"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, action, data } = body;

    if (!siteId || !action) {
      return NextResponse.json(
        { error: "siteId and action are required" },
        { status: 400 },
      );
    }

    // Support ad-hoc credentials for testing
    let client: WordPressClient | null;
    if (data?.apiUrl && data?.username && data?.appPassword) {
      client = new WordPressClient({
        apiUrl: data.apiUrl,
        username: data.username,
        appPassword: data.appPassword,
      });
    } else {
      client = createWPClient(siteId);
    }

    if (!client) {
      return NextResponse.json(
        { error: `No WordPress credentials for "${siteId}"` },
        { status: 404 },
      );
    }

    switch (action) {
      case "test-connection": {
        const result = await client.testConnection();
        return NextResponse.json({ success: true, ...result });
      }

      case "create-post": {
        const post = await client.createPost(data);
        return NextResponse.json({ success: true, post }, { status: 201 });
      }

      case "update-post": {
        const post = await client.updatePost(data.id, data);
        return NextResponse.json({ success: true, post });
      }

      case "delete-post": {
        await client.deletePost(data.id, data.force);
        return NextResponse.json({ success: true, deleted: data.id });
      }

      case "create-page": {
        const page = await client.createPage(data);
        return NextResponse.json({ success: true, page }, { status: 201 });
      }

      case "update-page": {
        const page = await client.updatePage(data.id, data);
        return NextResponse.json({ success: true, page });
      }

      case "delete-page": {
        await client.deletePage(data.id, data.force);
        return NextResponse.json({ success: true, deleted: data.id });
      }

      case "create-category": {
        const cat = await client.createCategory(data);
        return NextResponse.json({ success: true, category: cat }, { status: 201 });
      }

      case "create-tag": {
        const tag = await client.createTag(data);
        return NextResponse.json({ success: true, tag }, { status: 201 });
      }

      case "update-settings": {
        const settings = await client.updateSettings(data);
        return NextResponse.json({ success: true, settings });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Operation failed",
      },
      { status: 500 },
    );
  }
}
