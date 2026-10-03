import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Het punt dat een team nu moet halen — zelfde volgorderegels als /api/speler/voortgang/bereik:
// de eigen teamvolgorde (session_point_order), anders order_index. Mist heeft geen volgorde.
export async function bepaalVolgendPunt(
  admin: AdminClient,
  sessie: { id: string; route_id: string },
): Promise<{ id: string; name: string } | null> {
  const [{ data: route }, { count: aantalVerwerkt }] = await Promise.all([
    admin.from("routes").select("modus").eq("id", sessie.route_id).maybeSingle(),
    admin
      .from("player_point_progress")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessie.id)
      .not("answered_at", "is", null),
  ]);
  const volgnummer = (aantalVerwerkt ?? 0) + 1;

  if (route?.modus === "mist") return null;

  const { data: spo } = await admin
    .from("session_point_order")
    .select("route_point_id")
    .eq("session_id", sessie.id)
    .eq("volgorde", volgnummer)
    .maybeSingle();
  if (spo) {
    const { data: punt } = await admin
      .from("route_points").select("id, name").eq("id", spo.route_point_id).maybeSingle();
    return punt ?? null;
  }
  if (route?.modus === "verspreid") return null;

  const { data: punt } = await admin
    .from("route_points")
    .select("id, name")
    .eq("route_id", sessie.route_id)
    .eq("order_index", volgnummer)
    .maybeSingle();
  return punt ?? null;
}
