import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { plezierInstellingen } from "@/lib/spelplezier";
import { spelStatistieken } from "@/lib/statistieken";

// 📊 Spelstatistieken voor het finishscherm (spelplezier deel 2): alleen als de route dat aan heeft en de uitslag vrij is
export async function GET() {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ aan: false });
  const { data: route } = await ctx.admin.from("routes").select("*").eq("id", ctx.sessie.route_id).maybeSingle();
  if (!plezierInstellingen(route).statistieken.aan || !route?.uitslag_vrijgegeven) return NextResponse.json({ aan: false });
  const { eigen, records } = await spelStatistieken(ctx.admin, ctx.sessie.route_id, ctx.sessie.id);
  const { data: team } = await ctx.admin.from("players").select("nickname, login_name").eq("id", ctx.spelerId).maybeSingle();
  return NextResponse.json({ aan: true, eigen, records, team: team?.nickname ?? team?.login_name ?? "Ons team", route: route?.name ?? "PointRush", score: ctx.sessie.score ?? 0 });
}
