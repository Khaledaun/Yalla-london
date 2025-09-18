import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Example endpoint handler for bulk enrich
export async function POST(request: Request) {
  // TODO: Implement bulk enrich logic using supabase
  return new Response(JSON.stringify({ status: "ok" }));
}
