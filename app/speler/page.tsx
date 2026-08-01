import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import IntroScherm from "@/components/speler/IntroScherm";

export default async function SpelerHomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!speler) redirect("/login");

  // Actieve sessie → direct doorgaan
  const { data: activeSessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  if (activeSessie) {
    const { data: route } = await admin
      .from("routes").select("modus").eq("id", activeSessie.route_id).maybeSingle();
    redirect(route?.modus === "mist" ? "/speler/mist" : "/speler/kaart");
  }

  // Actieve route ophalen zodat het introscherm de uitleg van de juiste spelsoort toont.
  // Nog geen actieve route? Dan valt spelUitleg() terug op een algemene tekst.
  const { data: actieveRoute } = await admin
    .from("routes")
    .select("id, modus, mist_m2_per_ster")
    .eq("is_active", true)
    .maybeSingle();

  let heeftVragen = false;
  if (actieveRoute) {
    const { count } = await admin
      .from("route_points")
      .select("id", { count: "exact", head: true })
      .eq("route_id", actieveRoute.id);
    heeftVragen = (count ?? 0) > 0;
  }

  return (
    <IntroScherm
      modus={actieveRoute?.modus ?? null}
      mistM2PerSter={actieveRoute?.mist_m2_per_ster ?? null}
      heeftVragen={heeftVragen}
    />
  );
}
