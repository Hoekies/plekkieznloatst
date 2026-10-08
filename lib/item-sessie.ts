import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Items die na de finish nog zin hebben (verdubbeling en radar niet: geen vragen of kaart meer)
export const ITEMS_NA_FINISH = ["bom", "spook", "dief", "banaan", "wissel", "vraagteken", "ster"];

// De sessie waarmee een speler items mag inzetten: het lopende spel, of — als de route
// "items na de finish" toestaat — het afgeronde spel zolang de uitslag nog niet is vrijgegeven.
export async function haalItemSessie(admin: AdminClient, spelerId: string) {
  const { data: actief } = await admin
    .from("player_sessions")
    .select("id, score, route_id")
    .eq("player_id", spelerId)
    .eq("status", "actief")
    .maybeSingle();
  if (actief) return { sessie: actief, naFinish: false };

  const { data: route } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  if (!route?.items_na_finish || route.uitslag_vrijgegeven) return null;
  const { data: klaar } = await admin
    .from("player_sessions")
    .select("id, score, route_id")
    .eq("player_id", spelerId)
    .eq("route_id", route.id)
    .eq("status", "voltooid")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return klaar ? { sessie: klaar, naFinish: true } : null;
}
