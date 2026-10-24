import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { maakStand, routeVanSpel } from "@/lib/stand";

// Eindstand voor het finishscherm
export async function GET() {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, spelerId, sessie } = ctx;

  const routeId = await routeVanSpel(admin, sessie);
  if (!routeId) return NextResponse.json({ leaderboard: [] });

  // Uitslag pas tonen als de beheerder hem heeft vrijgegeven (na het keuren van de foto's).
  // Tot die tijd alleen de eigen, voorlopige score (die stijgt als foto's goedgekeurd worden).
  const { data: route } = await admin.from("routes").select("*").eq("id", routeId).maybeSingle();
  const score = sessie?.score ?? null;
  if (!route?.uitslag_vrijgegeven) return NextResponse.json({ vrijgegeven: false, leaderboard: [], score });

  const stand = await maakStand(admin, routeId, spelerId, true);
  return NextResponse.json({ vrijgegeven: true, leaderboard: stand, score });
}
