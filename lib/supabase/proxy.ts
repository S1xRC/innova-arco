import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated cookies to the response.
 *
 * Keep this function free of extra logic between `createServerClient` and
 * `getClaims()` — Supabase warns that any work in between can cause the
 * session to be logged out randomly.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this refreshes the session and keeps the user logged in.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
