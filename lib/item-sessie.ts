import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Items die na de finish nog zin hebben en die de beheerder per stuk kan aanzetten
// (verdubbeling en radar niet: geen vragen of kaart meer; vraagteken gaat nooit in de balk)
export const ITEMS_NA_FINISH = ["bom", "spook", "dief", "banaan", "wissel", "ster"];

// Welke items een gefinisht team nog mag inzetten. Zonder keuze per item (oude routes)
// geldt de oude schakelaar: aan = alle items hierboven.
export function itemsNaFinishVan(route: { items_na_finish?: boolean | null; items_na_finish_types?: unknown } | null | undefined): string[] {
  if (!route) return [];
  if (Array.isArray(route.items_na_finish_types)) return ITEMS_NA_FINISH.filter((t) => (route.items_na_finish_types as unknown[]).includes(t));
  return route.items_na_finish ? ITEMS_NA_FINISH : [];
}

// Items die een gefinisht team nog raken: alleen wat de beheerder voor na de finish heeft
// aangezet, en alleen als het iets doet (spook, dief en banaan werken op punten die nog komen)
const RAAKT_GEFINISHT = ["bom", "wissel"];
export function doelwitNaFinishVan(route: Parameters<typeof itemsNaFinishVan>[0] & { uitslag_vrijgegeven?: boolean | null }): string[] {
  if (!route || route.uitslag_vrijgegeven) return [];
  return itemsNaFinishVan(route).filter((t) => RAAKT_GEFINISHT.includes(t));
}

// De sessie waarmee een speler items mag inzetten: het lopende spel, of — als de route
// items na de finish toestaat — het afgeronde spel zolang de uitslag nog niet is vrijgegeven.
// Na de finish staat in `toegestaan` welke soorten nog mogen.
export async function haalItemSessie(admin: AdminClient, spelerId: string) {
  const { data: actief } = await admin
    .from("player_sessions")
    .select("id, score, route_id")
    .eq("player_id", spelerId)
    .eq("status", "actief")
    .maybeSingle();
  if (actief) return { sessie: actief, naFinish: false, toegestaan: [] as string[] };

  const { data: route } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  const toegestaan = itemsNaFinishVan(route);
  if (!route || !toegestaan.length || route.uitslag_vrijgegeven) return null;
  const { data: klaar } = await admin
    .from("player_sessions")
    .select("id, score, route_id")
    .eq("player_id", spelerId)
    .eq("route_id", route.id)
    .eq("status", "voltooid")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return klaar ? { sessie: klaar, naFinish: true, toegestaan } : null;
}
