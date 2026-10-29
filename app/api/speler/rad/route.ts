import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { spelGepauzeerd, PAUZE_FOUT } from "@/lib/eindtijd";
import { draaiRad } from "@/lib/spelplezier-server";

// 🎰 Eén keer aan het rad van fortuin draaien (halverwege de route). De server kiest het vak.
export async function POST() {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actief spel" }, { status: 403 });
  if (await spelGepauzeerd(ctx.admin, ctx.sessie.route_id)) return NextResponse.json({ fout: PAUZE_FOUT, pauze: true }, { status: 409 });
  const uit = await draaiRad(ctx.admin, ctx.sessie);
  return uit.ok ? NextResponse.json(uit) : NextResponse.json({ fout: uit.fout }, { status: 409 });
}
