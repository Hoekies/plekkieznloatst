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

  return <IntroScherm />;
}
