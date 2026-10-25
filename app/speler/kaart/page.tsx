import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import SpelerKaart from "@/components/speler/SpelerKaart";
import { maakKleurMap } from "@/lib/speler-kleur";
import { puzzelRegels } from "@/lib/puzzel-server";

export default async function SpelerKaartPage() {
  const user = await haalGebruiker();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("id, icon, nickname, login_name")
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

  const [{ data: ruwePunten }, { data: voortgang }, { data: route }, { data: spo }, { data: alleSpelers }] = await Promise.all([
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
      .select("*") // alles: een ontbrekende instellingskolom mag de kaart nooit blokkeren
      .eq("id", sessie.route_id)
      .maybeSingle(),
    admin
      .from("session_point_order")
      .select("volgorde, route_point_id")
      .eq("session_id", sessie.id)
      .order("volgorde"),
    // Voor de vaste teamkleur (zelfde als in het beheer)
    admin.from("players").select("id"),
  ]);

  // Sessie op een route die niet meer actief is → /speler sluit hem af en start opnieuw (met melding)
  if (!route?.is_active) redirect("/speler?gestopt=1");

  // Verspreid: is de route na de start van de sessie aangepast (punten toegevoegd of
  // verwijderd), dan klopt de teamvolgorde niet meer. Sessie afsluiten en opnieuw starten.
  // Sequentieel heeft dezelfde teamvolgorde (voor de banaan); oudere sessies zonder volgorde lopen gewoon door.
  const heeftVolgorde = (spo?.length ?? 0) > 0;
  if (
    (route.modus === "verspreid" || (route.modus === "sequentieel" && heeftVolgorde)) &&
    (spo?.length ?? 0) !== (ruwePunten?.length ?? 0)
  ) {
    await admin.from("player_sessions").update({ status: "vervallen" }).eq("id", sessie.id);
    redirect("/speler");
  }

  // Doorlooppunten: de speler loopt er gewoon langs (geen scherm), het volgende punt verschijnt
  // Niet het eerste punt van een rondje: dat is de start met het welkomstscherm
  const stilleIds = (ruwePunten ?? []).filter((p, i) => p.type === "doorlooppunt" && !(route.modus === "verspreid" && i === 0)).map((p) => p.id);

  // Sorteer punten op de teamvolgorde
  let punten = ruwePunten ?? [];
  if (spo && heeftVolgorde) {
    const puntenMap = new Map((ruwePunten ?? []).map((p) => [p.id, p]));
    punten = spo.map((s) => puntenMap.get(s.route_point_id)).filter(Boolean) as typeof punten;
  }

  return (
    <SpelerKaart
      sessie={sessie}
      spelerIcoon={(speler as { icon?: string | null }).icon ?? null}
      teamKleur={maakKleurMap((alleSpelers ?? []).map((p) => p.id)).get(speler.id) ?? null}
      spelerNaam={(speler as { nickname?: string | null; login_name?: string | null }).nickname ?? (speler as { login_name?: string | null }).login_name ?? null}
      punten={punten}
      initVoortgang={voortgang ?? []}
      modus={route.modus === "verspreid" ? "verspreid" : "sequentieel"}
      startVraagMeter={(route as { startvraag_meter?: number | null }).startvraag_meter ?? undefined}
      puzzel={puzzelRegels(route)}
      stilleIds={stilleIds}
      verbodenGebieden={(route as { verboden_gebieden?: { naam: string; punten: [number, number][] }[] | null }).verboden_gebieden ?? []}
      heleRoute={route.modus !== "verspreid" && (route as { alle_punten_zichtbaar?: boolean }).alle_punten_zichtbaar === true}
      waarden={{
        ster: route.ster_waarde ?? 50,
        bom: route.bom_waarde ?? 30,
        spookSec: route.spook_duur_seconden ?? 600,
        plekzooiSec: route.plekzooi_duur_seconden ?? 300,
      }}
    />
  );
}
