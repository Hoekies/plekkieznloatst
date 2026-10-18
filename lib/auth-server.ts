import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { middlewareMerk, MERK_HEADER } from "@/lib/middleware-merk";

// De ingelogde gebruiker op de server. De middleware heeft de sessie al bij Supabase
// gecontroleerd en geeft id en rol door in de request-headers, samen met een geheim kenmerk.
// Alleen met dat kenmerk worden ze vertrouwd: zelf meegestuurde headers tellen nooit.
// Dat scheelt per pagina of API-aanroep één of twee extra rondjes naar de database.
export type Gebruiker = { id: string; app_metadata: { rol?: string } };

// Rollen: "admin" (alles), "helper" (hulp van de spelleider: foto's keuren, punten vrijgeven,
// meekijken), en spelers (geen rol)
export function isAdmin(user: Gebruiker | null): boolean {
  return user?.app_metadata?.rol === "admin";
}
export function isBeheer(user: Gebruiker | null): boolean {
  const rol = user?.app_metadata?.rol;
  return rol === "admin" || rol === "helper";
}

export async function haalGebruiker(): Promise<Gebruiker | null> {
  const h = headers();
  const id = h.get("x-pr-user-id");
  if (id && h.get(MERK_HEADER) === await middlewareMerk()) {
    return { id, app_metadata: { rol: h.get("x-pr-rol") ?? undefined } };
  }
  // Zonder (geldige) gegevens van de middleware: zelf bij Supabase controleren
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, app_metadata: { rol: user.app_metadata?.rol as string | undefined } } : null;
}
