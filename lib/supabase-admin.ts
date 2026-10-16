import { createClient } from "@supabase/supabase-js";

// Alleen server-side gebruiken — heeft volledige toegang, omzeilt RLS
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Next.js bewaart fetch-antwoorden anders in zijn cache: dan zou een pagina oude scores tonen
      global: { fetch: (url, opties) => fetch(url, { ...opties, cache: "no-store" }) },
    }
  );
}
