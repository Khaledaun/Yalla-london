/**
 * Error Interpreter — maps raw technical error strings to plain-English explanations.
 *
 * Used by the admin cockpit to surface actionable, human-readable error messages
 * to Khaled so he can understand what broke and what to do about it without
 * reading a stack trace.
 */

export interface InterpretedError {
  /** Plain-English description of what went wrong. */
  plain: string;
  /** Actionable instruction for how to fix it. */
  fix: string;
  /** How bad is this right now? */
  severity: 'critical' | 'warning' | 'info';
  /**
   * Optional: an API endpoint or external URL that can be called / visited
   * to resolve the issue directly.
   * e.g. '/api/admin/db-migrate' or 'https://www.indexnow.org/register'
   */
  fixAction?: string;
}

/** Normalised fallback returned when raw is empty/null/undefined. */
const FALLBACK: InterpretedError = {
  plain: 'Technical error (see details below)',
  fix: 'Check Cron Logs for the full error trace',
  severity: 'warning',
};

/**
 * Translate a raw error string (from a catch block, cron log, or API response)
 * into a structured, human-readable explanation.
 *
 * All pattern checks are case-insensitive so we don't miss e.g. "ECONNREFUSED".
 */
export function interpretError(raw: string | null | undefined): InterpretedError {
  if (!raw) return FALLBACK;

  const s = raw.toLowerCase();

  // -----------------------------------------------------------------------
  // DATABASE — migration / connection errors
  // -----------------------------------------------------------------------

  if (s.includes('p2021') || s.includes('does not exist in the current database')) {
    return {
      plain: 'Database table missing — migration needed',
      fix: 'Run DB migration from Settings → Database tab',
      severity: 'critical',
      fixAction: '/api/admin/db-migrate',
    };
  }

  if (s.includes('econnrefused') || s.includes('enotfound')) {
    return {
      plain: "Can't reach the database",
      fix: 'Check Supabase project is running at supabase.com/dashboard',
      severity: 'critical',
    };
  }

  if (s.includes('p2002') || s.includes('unique constraint')) {
    return {
      plain: 'Duplicate content detected — article with this slug already exists',
      fix: 'Change the article title slightly to generate a unique URL',
      severity: 'warning',
    };
  }

  if (s.includes('p2003') || s.includes('foreign key')) {
    return {
      plain: 'Related database record not found',
      fix: 'Check that the category and author records exist in the database',
      severity: 'warning',
    };
  }

  // -----------------------------------------------------------------------
  // API KEYS — provider-specific before general fallback
  // -----------------------------------------------------------------------

  // xAI / Grok — check before the general "unauthorized" branch
  if (
    (s.includes('invalid api key') || s.includes('unauthorized')) &&
    (s.includes('grok') || s.includes('xai') || s.includes('x.ai'))
  ) {
    return {
      plain: 'xAI Grok API key is invalid',
      fix: 'Update XAI_API_KEY in Vercel environment variables',
      severity: 'critical',
    };
  }

  // Anthropic / Claude
  if (
    (s.includes('invalid api key') || s.includes('unauthorized')) &&
    s.includes('anthropic')
  ) {
    return {
      plain: 'Anthropic API key is invalid',
      fix: 'Update ANTHROPIC_API_KEY in Vercel',
      severity: 'critical',
    };
  }

  // General invalid-key fallback
  if (s.includes('invalid api key') || s.includes('unauthorized')) {
    return {
      plain: 'An API key is invalid or missing',
      fix: 'Check API keys in Settings → Variable Vault',
      severity: 'critical',
    };
  }

  // -----------------------------------------------------------------------
  // TIMEOUT / BUDGET
  // -----------------------------------------------------------------------

  if (
    s.includes('timed_out') ||
    s.includes('budget exceeded') ||
    /remaining.*<.*5000/.test(s)
  ) {
    return {
      plain: 'Job ran out of time (53s Vercel limit)',
      fix: 'Content was saved to intermediate state and will continue next run automatically',
      severity: 'warning',
    };
  }

  if (s.includes('budget') && s.includes('remaining')) {
    return {
      plain: 'Cron approaching time limit',
      fix: 'Content partially processed, rest continues next run',
      severity: 'warning',
    };
  }

  // -----------------------------------------------------------------------
  // CONTENT QUALITY
  // -----------------------------------------------------------------------

  if (
    s.includes('word count') &&
    (s.includes('< 1000') || s.includes('below.*minimum') || s.includes('below 1,000'))
  ) {
    return {
      plain: 'Article too short to publish (needs 1,000+ words)',
      fix: 'Click Expand to have AI add more content',
      severity: 'warning',
    };
  }

  // Catch the "below 1,000" variant without a regex (plain .includes suffices)
  if (s.includes('word count') && s.includes('below 1,000')) {
    return {
      plain: 'Article too short to publish (needs 1,000+ words)',
      fix: 'Click Expand to have AI add more content',
      severity: 'warning',
    };
  }

  if (s.includes('pre-pub gate blocked') || s.includes('pre-publication gate')) {
    return {
      plain: 'Article failed quality check before publishing',
      fix: 'Click the status badge to see exactly which checks failed and how to fix them',
      severity: 'warning',
    };
  }

  if (s.includes('authenticity') && s.includes('signal')) {
    return {
      plain: 'Article needs more first-hand experience signals',
      fix: 'Click Rewrite with AI to add sensory details and insider tips',
      severity: 'warning',
    };
  }

  if (
    /affiliate.*links.*0/.test(s) ||
    s.includes('no booking links') ||
    s.includes('affiliate.*check')
  ) {
    return {
      plain: 'No affiliate links detected — revenue gap',
      fix: 'Click Add Affiliate Links to inject booking links automatically',
      severity: 'warning',
    };
  }

  // -----------------------------------------------------------------------
  // INDEXNOW
  // -----------------------------------------------------------------------

  if (
    s.includes('indexnow_key') ||
    /indexnow.*not set/.test(s) ||
    /indexnow.*missing/.test(s)
  ) {
    return {
      plain: 'IndexNow key missing — Google discovery will be slower',
      fix: 'Add INDEXNOW_KEY to Vercel. Get a free key at indexnow.org',
      severity: 'warning',
      fixAction: 'https://www.indexnow.org/register',
    };
  }

  // -----------------------------------------------------------------------
  // RATE LIMITING
  // -----------------------------------------------------------------------

  if (s.includes('rate limit') || s.includes('429')) {
    return {
      plain: 'AI provider rate limit hit',
      fix: 'Will automatically retry in 1 minute',
      severity: 'warning',
    };
  }

  // -----------------------------------------------------------------------
  // NETWORK / CONNECTION
  // -----------------------------------------------------------------------

  if (s.includes('econnreset') || s.includes('socket hang up')) {
    return {
      plain: 'Connection dropped during AI call',
      fix: 'Will retry automatically on next run',
      severity: 'warning',
    };
  }

  // -----------------------------------------------------------------------
  // CONTEXT / TOKEN LIMITS
  // -----------------------------------------------------------------------

  if (
    s.includes('context length') ||
    s.includes('token limit') ||
    s.includes('maximum context')
  ) {
    return {
      plain: 'Article content is too long for AI to process in one call',
      fix: 'Break the article into smaller sections',
      severity: 'warning',
    };
  }

  // -----------------------------------------------------------------------
  // DEFAULT FALLBACK
  // -----------------------------------------------------------------------

  return FALLBACK;
}
