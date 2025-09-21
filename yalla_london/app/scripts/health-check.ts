#!/usr/bin/env tsx

import { isSupabaseAvailable } from "@/lib/supabase";

(async () => {
  console.log("🔍 Checking Supabase connectivity...");
  
  try {
    const ok = await isSupabaseAvailable();
    if (ok) {
      console.log("✅ Supabase reachable with anon key");
      process.exit(0);
    } else {
      console.error("❌ Supabase not reachable. Check env vars and network.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Health check failed:", error);
    process.exit(1);
  }
})();
