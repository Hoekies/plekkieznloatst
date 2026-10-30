import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { teamPlaatjes } from "@/lib/deel-plaatjes";

// 🖼️ Gegevens voor de teamplaatjes (teamkaart en ons rondje): pas als de uitslag vrij is
export async function GET() {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const { data: route } = await ctx.admin.from("routes").select("uitslag_vrijgegeven").eq("id", ctx.sessie.route_id).maybeSingle();
  if (!route?.uitslag_vrijgegeven) return NextResponse.json({ fout: "Pas na de uitslag" }, { status: 409 });
  return NextResponse.json(await teamPlaatjes(ctx.admin, ctx.sessie));
}
