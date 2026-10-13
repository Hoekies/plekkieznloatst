import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// De ingelogde gebruiker op de server. De middleware heeft de sessie al bij Supabase
// gecontroleerd en geeft id en rol door in de request-headers (een speler kan die headers
// niet zelf meesturen: de middleware haalt ze altijd eerst weg). Dat scheelt per pagina of
// API-aanroep één of twee extra rondjes naar de database.
export type Gebruiker = { id: string; app_metadata: { rol?: string } };

export async function haalGebruiker(): Promise<Gebruiker | null> {
  const h = headers();
  const id = h.get("x-pr-user-id");
  if (id) return { id, app_metadata: { rol: h.get("x-pr-rol") ?? undefined } };
  // Zonder gegevens van de middleware (zou niet moeten voorkomen): zelf controleren
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, app_metadata: { rol: user.app_metadata?.rol as string | undefined } } : null;
}
