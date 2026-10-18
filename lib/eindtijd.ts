import type { createAdminClient } from "@/lib/supabase-admin";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";

type AdminClient = ReturnType<typeof createAdminClient>;

// Eindtijd van het spel (migratie 006). Is die voorbij, dan zijn alle teams die nog spelen
// gefinisht op de eindtijd: hun stand telt. Geeft de eindtijd terug (null = geen eindtijd).
// Wordt aangeroepen door de spelers-app (elke paar seconden) en het dashboard, dus het spel
// stopt ook als er even geen telefoon online is.
export async function rondAfAlsTijdVoorbij(admin: AdminClient, routeId: string): Promise<string | null> {
  // select("*"): zonder migratie 006 ontbreekt de kolom gewoon, in plaats van een fout
  const { data: route } = await admin.from("routes").select("*").eq("id", routeId).maybeSingle();
  const eindtijd = (route as { eindtijd?: string | null } | null)?.eindtijd ?? null;
  if (!route || !eindtijd || new Date(eindtijd).getTime() > Date.now()) return eindtijd;

  const { data: gestopt } = await admin.from("player_sessions")
    .update({ status: "voltooid", finished_at: eindtijd })
    .eq("route_id", routeId).eq("status", "actief")
    .select("id");
  if (gestopt?.length) {
    await laatItemsVervallen(admin, gestopt.map((s) => s.id), { naFinishTypes: itemsNaFinishVan(route) });
  }
  return eindtijd;
}

export function eindtijdVoorbij(eindtijd: string | null | undefined): boolean {
  return !!eindtijd && new Date(eindtijd).getTime() <= Date.now();
}
