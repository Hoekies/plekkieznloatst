import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { maakStand, routeVanSpel } from "@/lib/stand";
import { teamFotos } from "@/lib/teamfoto";

// Eindstand voor het finishscherm (elke 10 seconden opgevraagd). Ook de eigen teamfoto (de selfie of
// groepsfoto bij de finish, zodra die is goedgekeurd) en hoeveel foto's nog op keuring wachten, zodat het
// finishscherm die meteen bijwerkt zonder herladen.
export async function GET() {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, spelerId, sessie } = ctx;

  const routeId = await routeVanSpel(admin, sessie);
  if (!routeId) return NextResponse.json({ leaderboard: [] });

  const eigen = sessie ? await Promise.all([
    teamFotos(admin, routeId, [sessie.id]).then((m) => m.get(sessie.id) ?? null).catch(() => null),
    admin.from("foto_inzendingen").select("id", { count: "exact", head: true }).eq("session_id", sessie.id).eq("status", "wacht")
      .then((r) => r.count ?? 0, () => 0),
  ]) : [null, 0];
  const [foto, fotosWacht] = eigen;

  // Uitslag pas tonen als de beheerder hem heeft vrijgegeven (na het keuren van de foto's).
  // Tot die tijd alleen de eigen, voorlopige score (die stijgt als foto's goedgekeurd worden).
  const { data: route } = await admin.from("routes").select("*").eq("id", routeId).maybeSingle();
  const score = sessie?.score ?? null;
  if (!route?.uitslag_vrijgegeven) return NextResponse.json({ vrijgegeven: false, leaderboard: [], score, foto, fotos_wacht: fotosWacht });

  const stand = await maakStand(admin, routeId, spelerId, true);
  return NextResponse.json({ vrijgegeven: true, leaderboard: stand, score, foto, fotos_wacht: fotosWacht });
}
