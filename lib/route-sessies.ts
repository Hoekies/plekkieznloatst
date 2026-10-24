import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Punten toevoegen of verwijderen tijdens een lopend spel, zonder dat teams hun spel kwijtraken.
// Elk team heeft bij de start een eigen volgorde gekregen (session_point_order). Die passen we hier
// mee aan, zodat het aantal punten blijft kloppen (anders sluit de app het spel van het team af).

async function lopendeSessies(admin: AdminClient, routeId: string): Promise<string[]> {
  const { data } = await admin.from("player_sessions").select("id").eq("route_id", routeId).eq("status", "actief");
  return (data ?? []).map((s) => s.id);
}

// Laat de spelers-apps de route opnieuw inlezen (kolom uit migratie 005; ontbreekt hij, dan gebeurt er niets)
async function vraagSpelersTeVernieuwen(admin: AdminClient, routeId: string) {
  try { await admin.from("routes").update({ spelers_vernieuwen_at: new Date().toISOString() }).eq("id", routeId); } catch { /* niet erg */ }
}

// Nieuw punt: bij elk lopend team vlak vóór de finish in de volgorde
export async function voegPuntToeAanLopendeSpellen(admin: AdminClient, routeId: string, puntId: string) {
  const sessies = await lopendeSessies(admin, routeId);
  for (const sessieId of sessies) {
    const { data: spo } = await admin.from("session_point_order")
      .select("volgorde, route_point_id").eq("session_id", sessieId).order("volgorde");
    if (!spo?.length || spo.some((s) => s.route_point_id === puntId)) continue;
    const finish = spo[spo.length - 1];
    // Finish één plek opschuiven, daarna het nieuwe punt op de vrijgekomen plek
    await admin.from("session_point_order").update({ volgorde: finish.volgorde + 1 })
      .eq("session_id", sessieId).eq("volgorde", finish.volgorde);
    await admin.from("session_point_order").insert({ session_id: sessieId, volgorde: finish.volgorde, route_point_id: puntId });
  }
  if (sessies.length) await vraagSpelersTeVernieuwen(admin, routeId);
}

// Na het verwijderen van een punt: de volgorde van elk lopend team weer doornummeren (1, 2, 3, …)
export async function hernummerLopendeSpellen(admin: AdminClient, routeId: string) {
  const sessies = await lopendeSessies(admin, routeId);
  for (const sessieId of sessies) {
    const { data: spo } = await admin.from("session_point_order")
      .select("volgorde, route_point_id").eq("session_id", sessieId).order("volgorde");
    if (!spo?.length || spo.every((s, i) => s.volgorde === i + 1)) continue;
    // Na elkaar en oplopend: elk punt schuift naar een lager, al vrijgekomen nummer
    for (let i = 0; i < spo.length; i++) {
      if (spo[i].volgorde === i + 1) continue;
      await admin.from("session_point_order").update({ volgorde: i + 1 })
        .eq("session_id", sessieId).eq("route_point_id", spo[i].route_point_id);
    }
  }
  if (sessies.length) await vraagSpelersTeVernieuwen(admin, routeId);
}
