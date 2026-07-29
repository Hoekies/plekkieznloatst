import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll wordt hier aangeroepen vanuit een Server Component, waar Next.js
            // geen cookies laat zetten. Onschadelijk: middleware.ts verversed de sessie
            // al bij elk request, dit is slechts een overbodige tweede poging.
          }
        },
      },
    }
  );
}
