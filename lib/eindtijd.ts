import type { createAdminClient } from "@/lib/supabase-admin";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { itemsNaFinishVan } from "@/lib/item-sessie";

type AdminClient = ReturnType<typeof createAdminClient>;

type SpelTijd = {
  eindtijd: string | null;   // migratie 006
  pauze: string | null;      // gepauzeerd sinds (migratie 010); null = het spel loopt
};

// Eindtijd en pauze van het spel. Is de eindtijd voorbij, dan zijn alle teams die nog spelen
// gefinisht op de eindtijd: hun stand telt. Tijdens een pauze loopt de eindtijd niet af.
// Wordt aangeroepen door de spelers-app (elke paar seconden), het verwerken van antwoorden en
// het dashboard, dus het spel stopt ook als er even geen telefoon online is.
export async function rondAfAlsTijdVoorbij(admin: AdminClient, routeId: string): Promise<SpelTijd> {
  // select("*"): zonder migratie 006/010 ontbreken de kolommen gewoon, in plaats van een fout
  const { data: route } = await admin.from("routes").select("*").eq("id", routeId).maybeSingle();
  const r = route as { eindtijd?: string | null; gepauzeerd_sinds?: string | null } | null;
  const tijd: SpelTijd = { eindtijd: r?.eindtijd ?? null, pauze: r?.gepauzeerd_sinds ?? null };
  if (!route || !tijd.eindtijd || tijd.pauze || new Date(tijd.eindtijd).getTime() > Date.now()) return tijd;

  const { data: gestopt } = await admin.from("player_sessions")
    .update({ status: "voltooid", finished_at: tijd.eindtijd })
    .eq("route_id", routeId).eq("status", "actief")
    .select("id");
  if (gestopt?.length) {
    await laatItemsVervallen(admin, gestopt.map((s) => s.id), { naFinishTypes: itemsNaFinishVan(route) });
  }
  return tijd;
}

export function eindtijdVoorbij(tijd: SpelTijd | string | null | undefined): boolean {
  if (tijd && typeof tijd === "object") return !tijd.pauze && eindtijdVoorbij(tijd.eindtijd);
  return !!tijd && new Date(tijd).getTime() <= Date.now();
}

// Gepauzeerd? Dan doen bereiken, antwoorden, foto's en items even niets (melding voor de app)
export async function spelGepauzeerd(admin: AdminClient, routeId: string): Promise<boolean> {
  const { data: route } = await admin.from("routes").select("*").eq("id", routeId).maybeSingle();
  return !!(route as { gepauzeerd_sinds?: string | null } | null)?.gepauzeerd_sinds;
}

export const PAUZE_FOUT = "Het spel is even gepauzeerd";
