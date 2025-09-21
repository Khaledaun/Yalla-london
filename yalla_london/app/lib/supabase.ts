// app/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// import { createServerClient as createSSRClient, type CookieOptions } from "@supabase/ssr";
// import type { Database } from "@/types/database";
type Database = any;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function assertEnv(name: string, value: string) {
  if (!value) throw new Error(`[supabase] Missing required env: ${name}`);
}

let anonClientSingleton: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  assertEnv("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_KEY", ANON_KEY);
  if (!anonClientSingleton) {
    anonClientSingleton = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: typeof window !== "undefined" },
    });
  }
  return anonClientSingleton;
}

export function createBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("[supabase] createBrowserClient() called on the server");
  }
  return getSupabaseClient();
}

export function createServerClient({
  cookies,
}: {
  cookies: () => {
    get: (name: string) => { value?: string } | undefined;
    set: (name: string, value: string, options: any) => void;
    delete: (name: string, options?: any) => void;
  };
}): SupabaseClient<Database> {
  assertEnv("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_KEY", ANON_KEY);
  
  // Fallback to regular client if SSR package not available
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
}

export function createServiceClient(): SupabaseClient<Database> {
  assertEnv("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "yalla-service" } },
  });
}

export async function isSupabaseAvailable(): Promise<boolean> {
  try {
    assertEnv("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_KEY", ANON_KEY);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: "GET",
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function createMockSupabaseClient(): SupabaseClient<Database> {
  const mock: any = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: () => mock,
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
  return mock as SupabaseClient<Database>;
}
