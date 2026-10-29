import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { fotobattle, stemFoto } from "@/lib/spelplezier-server";

// 📸 Fotobattle (migratie 007): GET = de finishfoto's van de andere teams en de eigen stem; POST { sessie_id } = stemmen
// (aanpassen mag tot de uitslag). Alleen voor teams die gefinisht zijn.
export async function GET() {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie || ctx.sessie.status !== "voltooid") return NextResponse.json({ aan: false });
  return NextResponse.json(await fotobattle(ctx.admin, ctx.sessie).catch(() => ({ aan: false })));
}

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie || ctx.sessie.status !== "voltooid") return NextResponse.json({ fout: "Stemmen kan na de finish" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { sessie_id?: string };
  const fout = await stemFoto(ctx.admin, ctx.sessie, String(body.sessie_id ?? ""));
  return fout ? NextResponse.json({ fout }, { status: 400 }) : NextResponse.json({ ok: true });
}
