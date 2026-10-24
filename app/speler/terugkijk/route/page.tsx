import { redirect } from "next/navigation";
import { haalRouteVerslag } from "@/lib/team-verslag";
import GelopenRoute from "@/components/speler/GelopenRoute";
import { haalSpeler } from "@/lib/speler-sessie";

export default async function GelopenRoutePagina() {
  const ik = await haalSpeler();
  if (!ik) redirect("/login");
  const { admin, spelerId } = ik;

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id")
    .eq("player_id", spelerId)
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
      terugNaar="/speler/finish"
    />
  );
}
