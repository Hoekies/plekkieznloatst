import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { spelplezierVoorSpeler } from "@/lib/spelplezier-server";

// 🎉 Spelplezier voor de spelersapp (migratie 007), elke paar seconden met de eigen plek (?lat=&lng=&acc=):
// gouden kwartier, badges, het rad, de vliegende schat (binnen bereik = meteen gepakt) en de eigen val. De server
// kijkt ook of het team in de val van een ander liep; de app weet nooit waar vallen van anderen liggen.
export async function GET(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ aan: null });
  const q = request.nextUrl.searchParams;
  const lat = Number(q.get("lat")), lng = Number(q.get("lng")), acc = Number(q.get("acc"));
  const plek = q.get("lat") !== null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, nauwkeurig: Number.isFinite(acc) ? acc : 30 } : null;
  try {
    return NextResponse.json(await spelplezierVoorSpeler(ctx.admin, ctx.sessie, plek));
  } catch {
    return NextResponse.json({ aan: null });
  }
}
