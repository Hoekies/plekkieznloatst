import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { haalRouteVerslag } from "@/lib/team-verslag";
import GelopenRoute from "@/components/speler/GelopenRoute";

export default async function GelopenRoutePagina() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) redirect("/login");

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id")
    .eq("player_id", speler.id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sessie) redirect("/speler/finish");

  const verslag = await haalRouteVerslag(admin, sessie.id);
  return (
    <GelopenRoute
      spoor={verslag.spoor}
      punten={verslag.punten}
      items={verslag.items.filter((i) => i.lat != null && i.lng != null).map((i) => ({ soort: i.soort, type: i.type, ander: i.ander, lat: i.lat!, lng: i.lng! }))}
      afstandM={verslag.afstandM}
    />
  );
}
