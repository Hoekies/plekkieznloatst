import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import SpelerKaart from "@/components/speler/SpelerKaart";

export default async function SpelerKaartPage() {
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

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  if (!sessie) redirect("/speler");

  const [{ data: punten }, { data: voortgang }] = await Promise.all([
    admin
      .from("route_points")
      .select("*")
      .eq("route_id", sessie.route_id)
      .order("order_index"),
    admin
      .from("player_point_progress")
      .select("*")
      .eq("session_id", sessie.id)
      .order("reached_at"),
  ]);

  return (
    <SpelerKaart
      sessie={sessie}
      punten={punten ?? []}
      initVoortgang={voortgang ?? []}
    />
  );
}
