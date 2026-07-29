import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { MIST_CEL_OPPERVLAK_M2 } from "@/lib/geo";
import MistKaart from "@/components/speler/MistKaart";

export default async function SpelerMistPage() {
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

  const [{ data: route }, { data: cellen }] = await Promise.all([
    admin
      .from("routes")
      .select("mist_m2_per_ster, start_latitude, start_longitude")
      .eq("id", sessie.route_id)
      .maybeSingle(),
    admin
      .from("mist_voortgang")
      .select("cell_x, cell_y")
      .eq("session_id", sessie.id),
  ]);

  const startLocatie = route?.start_latitude !== null && route?.start_longitude !== null && route
    ? { lat: route.start_latitude, lng: route.start_longitude }
    : null;

  return (
    <MistKaart
      sessie={sessie}
      startLocatie={startLocatie}
      mistM2PerSter={route?.mist_m2_per_ster ?? 2500}
      initVoortgang={{
        cellen: cellen ?? [],
        totaalM2: (cellen?.length ?? 0) * MIST_CEL_OPPERVLAK_M2,
        score: sessie.score,
      }}
    />
  );
}
