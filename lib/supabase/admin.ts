import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role key, server only. Never expose it with a NEXT_PUBLIC_ prefix.
 */
export function getServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key ? key : null;
}

/**
 * Supabase client that bypasses RLS. Used for privileged server work:
 * uploading/removing Storage objects and the deletion cron.
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` is not configured, so the
 * app keeps working (Storage features degrade gracefully).
 */
export function createAdminClient() {
  const key = getServiceRoleKey();

  if (!key) {
    return null;
  }

  return createSupabaseClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
