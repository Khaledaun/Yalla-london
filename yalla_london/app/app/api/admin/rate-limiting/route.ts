export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';

interface RateLimitRule {
  rule_id: string;
  name: string;
  endpoint_pattern: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  limit_type: 'requests_per_minute' | 'requests_per_hour' | 'requests_per_day' | 'concurrent_requests';
  limit_value: number;
  window_size: number; // in seconds
  burst_limit?: number; // allow short bursts
  identifier: 'ip' | 'user_id' | 'api_key' | 'session';
  bypass_roles?: string[];
  status: 'active' | 'inactive' | 'monitoring_only';
  created_at: string;
  updated_at: string;
}

interface RateLimitStats {
  rule_id: string;
  total_requests: number;
  blocked_requests: number;
  current_usage: number;
  peak_usage: number;
  last_request: string;
  top_consumers: Array<{
    identifier: string;
    request_count: number;
    blocked_count: number;
  }>;
}

interface RateLimitConfig {
  redis_enabled: boolean;
  redis_url?: string;
  fallback_to_memory: boolean;
  default_limits: {
    global_requests_per_minute: number;
    authenticated_requests_per_minute: number;
    unauthenticated_requests_per_minute: number;
  };
  monitoring: {
    alert_threshold_percentage: number;
    log_blocked_requests: boolean;
    track_user_patterns: boolean;
  };
}

// In-memory storage for demonstration (Redis would be used in production)
let rateLimitRules: Map<string, RateLimitRule> = new Map();
let rateLimitStats: Map<string, RateLimitStats> = new Map();
let requestCounters: Map<string, Map<string, { count: number; window_start: number }>> = new Map();

// Default rate limiting configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  redis_enabled: !!process.env.REDIS_URL,
  redis_url: process.env.REDIS_URL,
  fallback_to_memory: true,
  default_limits: {
    global_requests_per_minute: 1000,
    authenticated_requests_per_minute: 300,
    unauthenticated_requests_per_minute: 100
  },
  monitoring: {
    alert_threshold_percentage: 80,
    log_blocked_requests: true,
    track_user_patterns: true
  }
};

// Pre-configured rate limiting rules
const DEFAULT_RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    rule_id: 'public_api_general',
    name: 'Public API General Limit',
    endpoint_pattern: '/api/public/*',
    method: 'ALL',
    limit_type: 'requests_per_minute',
    limit_value: 100,
    window_size: 60,
    burst_limit: 150,
    identifier: 'ip',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    rule_id: 'search_api_limit',
    name: 'Search API Rate Limit',
    endpoint_pattern: '/api/search/*',
    method: 'GET',
    limit_type: 'requests_per_minute',
    limit_value: 60,
    window_size: 60,
    identifier: 'ip',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    rule_id: 'content_generation_limit',
    name: 'Content Generation API Limit',
    endpoint_pattern: '/api/generate-content*',
    method: 'POST',
    limit_type: 'requests_per_hour',
    limit_value: 10,
    window_size: 3600,
    identifier: 'user_id',
    bypass_roles: ['admin', 'editor'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    rule_id: 'auth_api_limit',
    name: 'Authentication API Limit',
    endpoint_pattern: '/api/auth/*',
    method: 'POST',
    limit_type: 'requests_per_minute',
    limit_value: 5,
    window_size: 60,
    burst_limit: 10,
    identifier: 'ip',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    rule_id: 'admin_api_limit',
    name: 'Admin API Rate Limit',
    endpoint_pattern: '/api/admin/*',
    method: 'ALL',
    limit_type: 'requests_per_minute',
    limit_value: 200,
    window_size: 60,
    identifier: 'user_id',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    rule_id: 'media_upload_limit',
    name: 'Media Upload Rate Limit',
    endpoint_pattern: '/api/media/upload*',
    method: 'POST',
    limit_type: 'requests_per_hour',
    limit_value: 50,
    window_size: 3600,
    identifier: 'user_id',
    bypass_roles: ['admin'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initialize default rules
DEFAULT_RATE_LIMIT_RULES.forEach(rule => {
  rateLimitRules.set(rule.rule_id, rule);
  rateLimitStats.set(rule.rule_id, {
    rule_id: rule.rule_id,
    total_requests: Math.floor(Math.random() * 10000),
    blocked_requests: Math.floor(Math.random() * 500),
    current_usage: Math.floor(Math.random() * 50),
    peak_usage: Math.floor(Math.random() * 80) + 60,
    last_request: new Date(Date.now() - Math.random() * 60000).toISOString(),
    top_consumers: [
      { identifier: '192.168.1.100', request_count: 245, blocked_count: 12 },
      { identifier: '10.0.0.50', request_count: 189, blocked_count: 8 },
      { identifier: 'user_12345', request_count: 156, blocked_count: 3 }
    ]
  });
});

function checkRateLimit(ruleId: string, identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const rule = rateLimitRules.get(ruleId);
  if (!rule || rule.status !== 'active') {
    return { allowed: true, remaining: -1, resetTime: 0 };
  }
  
  const now = Date.now();
  const windowStart = Math.floor(now / (rule.window_size * 1000)) * (rule.window_size * 1000);
  
  if (!requestCounters.has(ruleId)) {
    requestCounters.set(ruleId, new Map());
  }
  
  const ruleCounters = requestCounters.get(ruleId)!;
  const userKey = `${identifier}:${windowStart}`;
  
  const currentCount = ruleCounters.get(userKey)?.count || 0;
  const limit = rule.burst_limit || rule.limit_value;
  
  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowStart + (rule.window_size * 1000)
    };
  }
  
  // Increment counter
  ruleCounters.set(userKey, {
    count: currentCount + 1,
    window_start: windowStart
  });
  
  // Clean up old entries
  for (const [key, entry] of ruleCounters.entries()) {
    if (entry.window_start < windowStart - (rule.window_size * 1000)) {
      ruleCounters.delete(key);
    }
  }
  
  return {
    allowed: true,
    remaining: limit - currentCount - 1,
    resetTime: windowStart + (rule.window_size * 1000)
  };
}

function generateRateLimitReport(): any {
  const allRules = Array.from(rateLimitRules.values());
  const allStats = Array.from(rateLimitStats.values());
  
  const totalRequests = allStats.reduce((sum, stats) => sum + stats.total_requests, 0);
  const totalBlocked = allStats.reduce((sum, stats) => sum + stats.blocked_requests, 0);
  const blockRate = totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0;
  
  return {
    summary: {
      total_rules: allRules.length,
      active_rules: allRules.filter(r => r.status === 'active').length,
      total_requests_tracked: totalRequests,
      total_blocked_requests: totalBlocked,
      overall_block_rate: Math.round(blockRate * 100) / 100,
      redis_enabled: DEFAULT_CONFIG.redis_enabled
    },
    rule_performance: allStats.map(stats => {
      const rule = rateLimitRules.get(stats.rule_id);
      return {
        rule_id: stats.rule_id,
        rule_name: rule?.name || 'Unknown',
        endpoint_pattern: rule?.endpoint_pattern || '',
        total_requests: stats.total_requests,
        blocked_requests: stats.blocked_requests,
        block_rate: stats.total_requests > 0 ? 
          Math.round((stats.blocked_requests / stats.total_requests) * 10000) / 100 : 0,
        current_usage: stats.current_usage,
        peak_usage: stats.peak_usage,
        status: rule?.status || 'unknown'
      };
    }),
    top_consumers: allStats
      .flatMap(stats => stats.top_consumers)
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 10),
    recommendations: generateRateLimitRecommendations(allRules, allStats)
  };
}

function generateRateLimitRecommendations(rules: RateLimitRule[], stats: RateLimitStats[]): string[] {
  const recommendations: string[] = [];
  
  // Check for high block rates
  const highBlockRateRules = stats.filter(s => {
    const blockRate = s.total_requests > 0 ? (s.blocked_requests / s.total_requests) * 100 : 0;
    return blockRate > 10;
  });
  
  if (highBlockRateRules.length > 0) {
    recommendations.push(`⚠️ High block rate detected for ${highBlockRateRules.length} rule(s). Consider increasing limits or investigating abuse.`);
  }
  
  // Check for unused rules
  const unusedRules = stats.filter(s => s.total_requests < 100);
  if (unusedRules.length > 0) {
    recommendations.push(`📊 ${unusedRules.length} rule(s) have low usage. Consider removing or adjusting patterns.`);
  }
  
  // Redis recommendation
  if (!DEFAULT_CONFIG.redis_enabled) {
    recommendations.push('🚀 Enable Redis for better performance and distributed rate limiting.');
  }
  
  // Burst limit recommendations
  const rulesWithoutBurst = rules.filter(r => !r.burst_limit);
  if (rulesWithoutBurst.length > 0) {
    recommendations.push('⚡ Consider adding burst limits to rules for better user experience during traffic spikes.');
  }
  
  // Monitoring recommendations
  recommendations.push('📈 Enable request pattern tracking to identify potential abuse patterns.');
  recommendations.push('🔔 Set up alerting for when rate limits reach 80% of capacity.');
  
  return recommendations;
}

/**
 * GET /api/admin/rate-limiting
 * Get rate limiting configuration and statistics
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const ruleId = url.searchParams.get('rule_id');
    const includeStats = url.searchParams.get('include_stats') === 'true';
    const testIdentifier = url.searchParams.get('test_identifier');
    
    if (ruleId && testIdentifier) {
      // Test rate limit for specific rule and identifier
      const result = checkRateLimit(ruleId, testIdentifier);
      const rule = rateLimitRules.get(ruleId);
      
      return NextResponse.json({
        status: 'success',
        rule_id: ruleId,
        test_identifier: testIdentifier,
        rate_limit_result: result,
        rule_configuration: rule
      });
    }
    
    if (ruleId) {
      // Get specific rule details
      const rule = rateLimitRules.get(ruleId);
      if (!rule) {
        return NextResponse.json(
          { status: 'error', message: 'Rate limit rule not found' },
          { status: 404 }
        );
      }
      
      const response: any = {
        status: 'success',
        rate_limit_rule: rule
      };
      
      if (includeStats) {
        response.statistics = rateLimitStats.get(ruleId);
      }
      
      return NextResponse.json(response);
    }
    
    // Get all rate limiting configuration
    const allRules = Array.from(rateLimitRules.values());
    const report = generateRateLimitReport();
    
    return NextResponse.json({
      status: 'success',
      configuration: DEFAULT_CONFIG,
      rate_limit_rules: allRules,
      statistics: includeStats ? Array.from(rateLimitStats.values()) : undefined,
      performance_report: report,
      implementation_status: {
        redis_available: !!process.env.REDIS_URL,
        memory_fallback: DEFAULT_CONFIG.fallback_to_memory,
        rules_active: allRules.filter(r => r.status === 'active').length,
        total_rules: allRules.length
      }
    });
    
  } catch (error) {
    console.error('Rate limiting retrieval error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve rate limiting configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/rate-limiting
 * Create or update rate limiting rule
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      rule_id,
      name,
      endpoint_pattern,
      method = 'ALL',
      limit_type = 'requests_per_minute',
      limit_value,
      window_size,
      burst_limit,
      identifier = 'ip',
      bypass_roles,
      status = 'active'
    } = body;
    
    if (!name || !endpoint_pattern || !limit_value || !window_size) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields: name, endpoint_pattern, limit_value, window_size' },
        { status: 400 }
      );
    }
    
    const ruleIdToUse = rule_id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newRule: RateLimitRule = {
      rule_id: ruleIdToUse,
      name,
      endpoint_pattern,
      method,
      limit_type,
      limit_value,
      window_size,
      burst_limit,
      identifier,
      bypass_roles,
      status,
      created_at: rateLimitRules.has(ruleIdToUse) ? 
        rateLimitRules.get(ruleIdToUse)!.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    rateLimitRules.set(ruleIdToUse, newRule);
    
    // Initialize stats if new rule
    if (!rateLimitStats.has(ruleIdToUse)) {
      rateLimitStats.set(ruleIdToUse, {
        rule_id: ruleIdToUse,
        total_requests: 0,
        blocked_requests: 0,
        current_usage: 0,
        peak_usage: 0,
        last_request: new Date().toISOString(),
        top_consumers: []
      });
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Rate limiting rule created/updated successfully',
      rate_limit_rule: newRule,
      implementation_notes: [
        'Rule will take effect immediately for new requests',
        'Existing request counters will respect new limits',
        'Monitor rule performance after deployment',
        'Consider gradual rollout for strict limits'
      ]
    });
    
  } catch (error) {
    console.error('Rate limiting rule creation error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create/update rate limiting rule',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/rate-limiting
 * Update rate limiting configuration or rule status
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { rule_id, action, configuration } = body;
    
    if (rule_id && action) {
      // Update specific rule
      const rule = rateLimitRules.get(rule_id);
      if (!rule) {
        return NextResponse.json(
          { status: 'error', message: 'Rate limit rule not found' },
          { status: 404 }
        );
      }
      
      let actionDescription = '';
      
      switch (action) {
        case 'activate':
          rule.status = 'active';
          actionDescription = 'Rate limit rule activated';
          break;
        case 'deactivate':
          rule.status = 'inactive';
          actionDescription = 'Rate limit rule deactivated';
          break;
        case 'monitor_only':
          rule.status = 'monitoring_only';
          actionDescription = 'Rate limit rule set to monitoring only';
          break;
        case 'reset_counters':
          requestCounters.delete(rule_id);
          actionDescription = 'Rate limit counters reset';
          break;
        default:
          return NextResponse.json(
            { status: 'error', message: 'Invalid action' },
            { status: 400 }
          );
      }
      
      rule.updated_at = new Date().toISOString();
      rateLimitRules.set(rule_id, rule);
      
      return NextResponse.json({
        status: 'success',
        message: actionDescription,
        rate_limit_rule: rule
      });
    }
    
    // Update global configuration
    if (configuration) {
      Object.assign(DEFAULT_CONFIG, configuration);
      
      return NextResponse.json({
        status: 'success',
        message: 'Rate limiting configuration updated',
        configuration: DEFAULT_CONFIG
      });
    }
    
    return NextResponse.json(
      { status: 'error', message: 'No valid action or configuration provided' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Rate limiting update error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update rate limiting configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/rate-limiting
 * Delete rate limiting rule
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const ruleId = url.searchParams.get('rule_id');
    
    if (!ruleId) {
      return NextResponse.json(
        { status: 'error', message: 'rule_id parameter is required' },
        { status: 400 }
      );
    }
    
    if (rateLimitRules.has(ruleId)) {
      rateLimitRules.delete(ruleId);
      rateLimitStats.delete(ruleId);
      requestCounters.delete(ruleId);
      
      return NextResponse.json({
        status: 'success',
        message: 'Rate limiting rule deleted successfully',
        rule_id: ruleId
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Rate limiting rule not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Rate limiting deletion error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete rate limiting rule',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});