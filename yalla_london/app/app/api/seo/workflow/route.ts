import { NextRequest, NextResponse } from 'next/server';
import {
  verifyGSCConnection,
  runFullSEOWorkflow,
  runIndexingWorkflow,
  runContentOptimizationWorkflow,
  runSEOResearchWorkflow,
  auditContent,
  verifyAndSubmitForIndexing,
} from '@/lib/seo/seo-workflow-orchestrator';
import { getAllIndexableUrls } from '@/lib/seo/indexing-service';

/**
 * SEO Workflow API
 *
 * Provides comprehensive SEO automation including:
 * - GSC connection verification
 * - Full SEO audit workflow
 * - Indexing verification and submission
 * - Content optimization
 * - SEO research
 *
 * This integrates the zenobi-us/dotfiles research methodology with our SEO infrastructure.
 */

/**
 * GET: Check workflow status and GSC connection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    // Verify GSC connection
    if (action === 'verify-gsc' || action === 'status') {
      const gscStatus = await verifyGSCConnection();
      return NextResponse.json({
        success: gscStatus.authenticated,
        data: gscStatus,
        endpoints: {
          verifyGSC: 'GET /api/seo/workflow?action=verify-gsc',
          runFullAudit: 'POST /api/seo/workflow { "workflow": "full_audit" }',
          runIndexing: 'POST /api/seo/workflow { "workflow": "indexing" }',
          runOptimization: 'POST /api/seo/workflow { "workflow": "optimization", "urls": [...] }',
          runResearch: 'POST /api/seo/workflow { "workflow": "research", "keyword": "...", "locale": "en" }',
          auditContent: 'POST /api/seo/workflow { "action": "audit", "urls": [...] }',
          verifyIndexing: 'POST /api/seo/workflow { "action": "verify_indexing", "urls": [...], "forceSubmit": true }',
        },
      });
    }

    // List available workflows
    return NextResponse.json({
      success: true,
      availableWorkflows: [
        {
          id: 'full_audit',
          name: 'Full SEO Audit',
          description: 'Comprehensive SEO audit including GSC verification, content audit, and indexing check',
        },
        {
          id: 'indexing',
          name: 'Indexing Check',
          description: 'Verify indexing status of all URLs and submit unindexed to search engines',
        },
        {
          id: 'optimization',
          name: 'Content Optimization',
          description: 'Analyze and optimize content for SEO using parallel agents',
        },
        {
          id: 'research',
          name: 'SEO Research',
          description: 'Structured SEO research with verification methodology (from zenobi-us/dotfiles)',
        },
      ],
      skills: [
        {
          id: 'seo-research-skill',
          name: 'SEO Research Skill',
          description: 'Parallel research methodology with source verification and confidence levels',
        },
        {
          id: 'parallel-seo-agents',
          name: 'Parallel SEO Agents',
          description: 'Dispatch multiple specialized agents for independent SEO tasks',
        },
      ],
      endpoints: {
        status: 'GET /api/seo/workflow?action=status',
        verifyGSC: 'GET /api/seo/workflow?action=verify-gsc',
        runWorkflow: 'POST /api/seo/workflow { "workflow": "..." }',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get workflow status', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST: Run SEO workflows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflow, action, urls, keyword, locale = 'en', forceSubmit = false } = body;

    // Direct actions
    if (action === 'audit' && urls) {
      const auditResults = await auditContent(urls);
      return NextResponse.json({
        success: true,
        action: 'content_audit',
        results: auditResults,
        summary: {
          urlsAudited: auditResults.length,
          totalIssues: auditResults.reduce((sum, a) => sum + a.issues.length, 0),
          avgSeoScore: auditResults.reduce((sum, a) => sum + a.seoScore, 0) / auditResults.length,
        },
      });
    }

    if (action === 'verify_indexing') {
      const urlsToCheck = urls || getAllIndexableUrls().filter(u => u.includes('/blog/')).slice(0, 20);
      const results = await verifyAndSubmitForIndexing(urlsToCheck, forceSubmit);
      return NextResponse.json({
        success: true,
        action: 'verify_indexing',
        results,
        summary: {
          totalChecked: results.length,
          indexed: results.filter(r => r.indexed).length,
          notIndexed: results.filter(r => !r.indexed).length,
          submitted: results.filter(r => r.submittedForIndexing).length,
        },
      });
    }

    // Workflow execution
    switch (workflow) {
      case 'full_audit': {
        const report = await runFullSEOWorkflow();
        return NextResponse.json({
          success: report.status === 'completed',
          workflow: 'full_audit',
          report,
        });
      }

      case 'indexing': {
        const report = await runIndexingWorkflow();
        return NextResponse.json({
          success: report.status === 'completed',
          workflow: 'indexing',
          report,
        });
      }

      case 'optimization': {
        if (!urls || !Array.isArray(urls)) {
          return NextResponse.json(
            { error: 'URLs array required for optimization workflow' },
            { status: 400 }
          );
        }
        const report = await runContentOptimizationWorkflow(urls);
        return NextResponse.json({
          success: report.status === 'completed',
          workflow: 'optimization',
          report,
        });
      }

      case 'research': {
        if (!keyword) {
          return NextResponse.json(
            { error: 'Keyword required for research workflow' },
            { status: 400 }
          );
        }
        const report = await runSEOResearchWorkflow(keyword, locale);
        return NextResponse.json({
          success: report.status === 'completed',
          workflow: 'research',
          report,
        });
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid workflow specified',
            validWorkflows: ['full_audit', 'indexing', 'optimization', 'research'],
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      { error: 'Failed to run workflow', details: String(error) },
      { status: 500 }
    );
  }
}
