import { redirect } from "next/navigation";
import IntroScherm from "@/components/speler/IntroScherm";
import { haalHuisstijl } from "@/lib/huisstijl";
import { haalSpeler } from "@/lib/speler-sessie";

export default async function SpelerHomePage({ searchParams }: { searchParams: { gestopt?: string } }) {
  const ik = await haalSpeler();
  if (!ik) redirect("/login");
  const { admin, spelerId } = ik;

  // Actieve route ophalen: nodig om een sessie op een oude route te herkennen, en zodat het
  // introscherm de uitleg van de juiste spelsoort toont (zonder route: algemene tekst).
  const [{ data: actieveRoute }, { data: activeSessie }] = await Promise.all([
    admin.from("routes").select("id, modus").eq("is_active", true).maybeSingle(),
    admin.from("player_sessions").select("id, route_id").eq("player_id", spelerId).eq("status", "actief").maybeSingle(),
  ]);

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
      .eq("player_id", spelerId)
      .eq("route_id", actieveRoute.id)
      .eq("status", "voltooid")
      .limit(1)
      .maybeSingle();
    if (klaar) redirect("/speler/finish");
  }

  const huisstijl = await haalHuisstijl(admin);
  return (
    <IntroScherm
      welkomFoto={huisstijl.welkomFoto}
      huisLogo={huisstijl.logo}
      modus={actieveRoute?.modus ?? null}
      // Hierheen gestuurd omdat het spel wegviel: zonder actieve route is de route gestopt, anders het eigen spel
      melding={searchParams?.gestopt ? (actieveRoute ? "spel" : "route") : null}
    />
  );
}
