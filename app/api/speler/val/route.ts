import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { spelGepauzeerd, PAUZE_FOUT } from "@/lib/eindtijd";
import { plaatsVal } from "@/lib/spelplezier-server";

// 🪤 Een bom uit de balk als verborgen val op de eigen plek leggen: POST { special_item_id, latitude, longitude }
export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actief spel" }, { status: 403 });
  if (await spelGepauzeerd(ctx.admin, ctx.sessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { special_item_id?: string; latitude?: number; longitude?: number };
  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") return NextResponse.json({ fout: "Je locatie ontbreekt: zet je locatie aan" }, { status: 400 });
  const uit = await plaatsVal(ctx.admin, ctx.sessie, String(body.special_item_id ?? ""), body.latitude, body.longitude);
  return uit.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ fout: uit.fout }, { status: uit.status });
}
