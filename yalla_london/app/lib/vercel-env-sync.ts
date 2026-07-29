/**
 * Vercel Environment Variable Sync
 *
 * Syncs per-site variables to the Vercel project via their REST API.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID env vars.
 *
 * Vercel API docs: https://vercel.com/docs/rest-api/endpoints/projects
 */

const VERCEL_API = "https://api.vercel.com";

interface VercelEnvVar {
  key: string;
  value: string;
  target: ("production" | "preview" | "development")[];
  type: "encrypted" | "plain" | "sensitive";
}

function getVercelConfig() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID; // optional

  if (!token || !projectId) {
    return null;
  }

  return { token, projectId, teamId };
}

function buildUrl(path: string, teamId?: string): string {
  const url = `${VERCEL_API}${path}`;
  return teamId ? `${url}?teamId=${teamId}` : url;
}

/**
 * Get all existing environment variables from Vercel
 */
export async function getVercelEnvVars(): Promise<
  { key: string; id: string; value: string; target: string[] }[] | null
> {
  const config = getVercelConfig();
  if (!config) return null;

  const res = await fetch(
    buildUrl(`/v9/projects/${config.projectId}/env`, config.teamId),
    {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) {
    console.error(`[vercel-sync] Failed to list env vars: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data.envs || [];
}

/**
 * Create or update an environment variable on Vercel
 */
async function upsertEnvVar(
  envVar: VercelEnvVar,
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getVercelConfig();
  if (!config) return { success: false, error: "Vercel not configured" };

  try {
    if (existingId) {
      // PATCH existing
      const res = await fetch(
        buildUrl(
          `/v9/projects/${config.projectId}/env/${existingId}`,
          config.teamId
        ),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: envVar.value,
            target: envVar.target,
            type: envVar.type,
          }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `PATCH failed (${res.status}): ${err}` };
      }
    } else {
      // POST new
      const res = await fetch(
        buildUrl(`/v10/projects/${config.projectId}/env`, config.teamId),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(envVar),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `POST failed (${res.status}): ${err}` };
      }
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Sync a batch of site variables to Vercel.
 * Converts site-scoped keys to the env var naming convention:
 *   e.g., siteId="dubai", key="GA4_PROPERTY_ID" → "GA4_PROPERTY_ID_DUBAI"
 *
 * Returns { synced, failed, skipped } counts.
 */
export async function syncToVercel(
  siteId: string,
  variables: { key: string; value: string }[]
): Promise<{
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
  vercelConfigured: boolean;
}> {
  const config = getVercelConfig();
  if (!config) {
    return {
      synced: 0,
      failed: 0,
      skipped: variables.length,
      errors: ["VERCEL_TOKEN or VERCEL_PROJECT_ID not set"],
      vercelConfigured: false,
    };
  }

  // Fetch existing vars to know whether to create or update
  const existing = await getVercelEnvVars();
  const existingMap = new Map(
    (existing || []).map((v) => [v.key, v.id])
  );

  const envSuffix = siteId.toUpperCase().replace(/-/g, "_");
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { key, value } of variables) {
    if (!value || !value.trim()) continue; // Skip empty values

    // Per-site env var name: KEY_SITEID (e.g., GA4_PROPERTY_ID_DUBAI)
    const envKey = `${key}_${envSuffix}`;

    const result = await upsertEnvVar(
      {
        key: envKey,
        value,
        target: ["production", "preview"],
        type: "encrypted",
      },
      existingMap.get(envKey)
    );

    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push(`${envKey}: ${result.error}`);
    }
  }

  return {
    synced,
    failed,
    skipped: 0,
    errors,
    vercelConfigured: true,
  };
}

/**
 * Check if Vercel integration is configured
 */
export function isVercelConfigured(): boolean {
  return !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}
