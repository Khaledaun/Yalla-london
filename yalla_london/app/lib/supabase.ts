import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient() {
  // You should have SUPABASE_URL and SUPABASE_KEY set in your environment variables
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  }

  return createClient(url, key);
}
