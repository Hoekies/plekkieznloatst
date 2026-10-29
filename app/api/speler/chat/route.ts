import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { plezierInstellingen } from "@/lib/spelplezier";
import { stuurPushNaarBeheer } from "@/lib/push";

// 💬 Chat met de spelleider (spelplezier deel 2, migratie 009). GET = de berichten van dit team (?gelezen=1: de
// berichten van de spelleider als gelezen markeren); POST { tekst } = een bericht naar de spelleider.
export async function GET(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ aan: false, berichten: [] });
  const { data: route } = await ctx.admin.from("routes").select("*").eq("id", ctx.sessie.route_id).maybeSingle();
  if (!plezierInstellingen(route).chat.aan) return NextResponse.json({ aan: false, berichten: [] });
  if (request.nextUrl.searchParams.get("gelezen")) {
    await ctx.admin.from("chat_berichten").update({ gelezen_op: new Date().toISOString() }).eq("sessie_id", ctx.sessie.id).eq("van", "leider").is("gelezen_op", null);
  }
  const { data } = await ctx.admin.from("chat_berichten").select("id, van, tekst, created_at, gelezen_op").eq("sessie_id", ctx.sessie.id).order("created_at").limit(100);
  return NextResponse.json({ aan: true, berichten: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const { data: route } = await ctx.admin.from("routes").select("*").eq("id", ctx.sessie.route_id).maybeSingle();
  if (!plezierInstellingen(route).chat.aan) return NextResponse.json({ fout: "De chat staat uit" }, { status: 400 });
  const body = await request.json().catch(() => ({})) as { tekst?: string };
  const tekst = typeof body.tekst === "string" ? body.tekst.trim().slice(0, 300) : "";
  if (!tekst) return NextResponse.json({ fout: "Typ eerst een bericht" }, { status: 400 });
  const { error } = await ctx.admin.from("chat_berichten").insert({ sessie_id: ctx.sessie.id, van: "team", tekst });
  if (error) return NextResponse.json({ fout: "Versturen lukte niet" }, { status: 500 });
  const { data: team } = await ctx.admin.from("players").select("nickname, login_name").eq("id", ctx.spelerId).maybeSingle();
  await stuurPushNaarBeheer({ titel: `💬 ${team?.nickname ?? team?.login_name ?? "Een team"}`, tekst: tekst.slice(0, 120), url: "/admin", tag: `chat-${ctx.sessie.id}` }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
