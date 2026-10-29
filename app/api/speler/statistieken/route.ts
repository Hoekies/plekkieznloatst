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
  return NextResponse.json({ aan: true, ...(await spelStatistieken(ctx.admin, ctx.sessie.route_id, ctx.sessie.id)) });
}
