/**
 * Admin Yacht Sync API
 * POST: Trigger fleet sync from external sources or manual refresh
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── POST: Trigger sync ─────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const siteId = body.siteId || getDefaultSiteId()
    // Accept 'manual' as an alias for 'manual_refresh' (used by test-connections and admin UI)
    const rawSource = body.source || 'manual_refresh'
    const source = rawSource === 'manual' ? 'manual_refresh' : rawSource

    const now = new Date().toISOString()

    // ── Manual Refresh ──────────────────────────────────
    // Re-validate existing fleet data, count stats
    if (source === 'manual_refresh') {
      const [totalCount, activeCount, draftCount, missingSlug] = await Promise.all([
        prisma.yacht.count({ where: { siteId } }),
        prisma.yacht.count({ where: { siteId, status: 'active' } }),
        prisma.yacht.count({ where: { siteId, status: 'draft' } }),
        prisma.yacht.count({ where: { siteId, slug: '' } }),
      ])

      // Fix any yachts with empty slugs (batched to avoid N+1 timeouts)
      let slugsFixed = 0
      if (missingSlug > 0) {
        const yachtsWithoutSlug = await prisma.yacht.findMany({
          where: { siteId, slug: '' },
          select: { id: true, name: true },
          take: 100, // cap to prevent unbounded query
        })

        // Batch all slug updates in a single transaction
        const slugUpdates = yachtsWithoutSlug
          .map((yacht) => {
            const slug = yacht.name
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
            return slug ? { id: yacht.id, slug } : null
          })
          .filter(Boolean) as Array<{ id: string; slug: string }>

        if (slugUpdates.length > 0) {
          await prisma.$transaction(
            slugUpdates.map((u) =>
              prisma.yacht.update({
                where: { id: u.id },
                data: { slug: u.slug, lastSyncedAt: new Date() },
              })
            )
          )
          slugsFixed = slugUpdates.length
        }
      }

      // Mark all yachts as synced
      await prisma.yacht.updateMany({
        where: { siteId },
        data: { lastSyncedAt: new Date() },
      })

      return NextResponse.json({
        result: {
          source: 'Manual Refresh',
          status: 'success',
          message: `Fleet refresh complete. ${totalCount} yachts total (${activeCount} active, ${draftCount} drafts).${slugsFixed > 0 ? ` Fixed ${slugsFixed} missing slugs.` : ''}`,
          added: 0,
          updated: totalCount,
          errors: 0,
          timestamp: now,
        },
      })
    }

    // ── External Sources (NauSYS, MMK, Charter Index) ───
    // These require API credentials configured in environment variables.
    // When credentials are not set, return a helpful message.

    const sourceConfigs: Record<string, { name: string; envKey: string }> = {
      nausys: { name: 'NauSYS', envKey: 'NAUSYS_API_KEY' },
      mmk: { name: 'MMK Systems', envKey: 'MMK_API_KEY' },
      charter_index: { name: 'Charter Index', envKey: 'CHARTER_INDEX_API_KEY' },
    }

    const sourceConfig = sourceConfigs[source]
    if (!sourceConfig) {
      return NextResponse.json(
        { error: `Unknown sync source: ${source}` },
        { status: 400 }
      )
    }

    const apiKey = process.env[sourceConfig.envKey]
    if (!apiKey) {
      return NextResponse.json({
        result: {
          source: sourceConfig.name,
          status: 'skipped',
          message: `${sourceConfig.name} is not configured. Add ${sourceConfig.envKey} to your environment variables to enable this integration.`,
          added: 0,
          updated: 0,
          errors: 0,
          timestamp: now,
        },
      })
    }

    // Placeholder for actual API integration
    // When API keys are configured, this is where we'd call the external APIs
    return NextResponse.json({
      result: {
        source: sourceConfig.name,
        status: 'skipped',
        message: `${sourceConfig.name} integration is configured but the import adapter is not yet implemented. Contact development team.`,
        added: 0,
        updated: 0,
        errors: 0,
        timestamp: now,
      },
    })
  } catch (error) {
    console.error('[admin-yachts] POST sync error:', error)
    return NextResponse.json(
      { error: 'Sync operation failed' },
      { status: 500 }
    )
  }
})
