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

  const [{ data: ruwePunten }, { data: voortgang }, { data: route }, { data: spo }] = await Promise.all([
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
    admin
      .from("routes")
      .select("modus")
      .eq("id", sessie.route_id)
      .maybeSingle(),
    admin
      .from("session_point_order")
      .select("volgorde, route_point_id")
      .eq("session_id", sessie.id)
      .order("volgorde"),
  ]);

  // Voor verspreid-modus: sorteer punten op de sessie-specifieke volgorde
  let punten = ruwePunten ?? [];
  if (route?.modus === "verspreid" && spo && spo.length > 0) {
    const puntenMap = new Map((ruwePunten ?? []).map((p) => [p.id, p]));
    punten = spo.map((s) => puntenMap.get(s.route_point_id)).filter(Boolean) as typeof punten;
  }

  return (
    <SpelerKaart
      sessie={sessie}
      punten={punten}
      initVoortgang={voortgang ?? []}
    />
  );
}
