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

  // Actieve route ophalen: nodig om een sessie op een oude route te herkennen, en zodat het
  // introscherm de uitleg van de juiste spelsoort toont (zonder route: algemene tekst).
  const { data: actieveRoute } = await admin
    .from("routes")
    .select("id, modus")
    .eq("is_active", true)
    .maybeSingle();

  const { data: activeSessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  if (activeSessie) {
    if (actieveRoute && activeSessie.route_id === actieveRoute.id) {
      redirect("/speler/kaart");
    }
    // Sessie hoort bij een route die niet meer actief is: afsluiten, zodat de groep
    // opnieuw via het introscherm op de huidige route start.
    await admin.from("player_sessions").update({ status: "vervallen" }).eq("id", activeSessie.id);
  }

  // Al gefinisht op de actieve route? Dan naar de finish (wachten op / bekijken van de uitslag),
  // niet terug naar het teamnaam-scherm. Na "Stop route" of "Reset spel" vervalt dit vanzelf.
  if (actieveRoute) {
    const { data: klaar } = await admin
      .from("player_sessions")
      .select("id")
      .eq("player_id", speler.id)
      .eq("route_id", actieveRoute.id)
      .eq("status", "voltooid")
      .limit(1)
      .maybeSingle();
    if (klaar) redirect("/speler/finish");
  }

  return (
    <IntroScherm
      modus={actieveRoute?.modus ?? null}
    />
  );
}
