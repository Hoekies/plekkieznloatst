import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { plezierInstellingen } from "@/lib/spelplezier";
import { stuurPushNaarBeheer } from "@/lib/push";

// 🧑‍⚖️ Bezwaar tegen een fout gerekend antwoord (spelplezier deel 2, migratie 009).
// GET ?punt= = mag het team hier bezwaar maken (en hoe vaak nog), en de stand van een al gemaakt bezwaar.
// POST { route_point_id, toelichting? } = bezwaar maken; de spelleider beslist op het dashboard.
async function stand(ctx: NonNullable<Awaited<ReturnType<typeof haalSpelerSessie>>>, puntId: string) {
  const { data: route } = await ctx.admin.from("routes").select("*").eq("id", ctx.sessie!.route_id).maybeSingle();
  const inst = plezierInstellingen(route).bezwaar;
  const { data: rijen, error } = await ctx.admin.from("bezwaren").select("route_point_id, status").eq("sessie_id", ctx.sessie!.id);
  const eigen = (rijen ?? []).find((r) => r.route_point_id === puntId) ?? null;
  return { aan: inst.aan && !error, over: Math.max(0, inst.max - (rijen ?? []).length), status: eigen?.status ?? null };
}

export async function GET(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ aan: false });
  return NextResponse.json(await stand(ctx, request.nextUrl.searchParams.get("punt") ?? ""));
}

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { route_point_id?: string; toelichting?: string };
  const puntId = String(body.route_point_id ?? "");
  const s = await stand(ctx, puntId);
  if (!s.aan) return NextResponse.json({ fout: "Bezwaar maken staat uit bij deze route" }, { status: 400 });
  if (s.status) return NextResponse.json({ fout: "Jullie hebben hier al bezwaar gemaakt" }, { status: 409 });
  if (s.over <= 0) return NextResponse.json({ fout: "Jullie bezwaren zijn op" }, { status: 409 });
  // Alleen tegen een antwoord dat fout is gerekend
  const { data: v } = await ctx.admin.from("player_point_progress").select("is_correct, answered_at").eq("session_id", ctx.sessie.id).eq("route_point_id", puntId).maybeSingle();
  if (!v?.answered_at || v.is_correct !== false) return NextResponse.json({ fout: "Bezwaar kan alleen bij een fout gerekend antwoord" }, { status: 400 });
  const { error } = await ctx.admin.from("bezwaren").insert({ sessie_id: ctx.sessie.id, route_point_id: puntId, toelichting: typeof body.toelichting === "string" ? body.toelichting.trim().slice(0, 200) || null : null });
  if (error) return NextResponse.json({ fout: error.code === "23505" ? "Jullie hebben hier al bezwaar gemaakt" : "Bezwaar maken lukte niet" }, { status: 409 });
  const { data: team } = await ctx.admin.from("players").select("nickname, login_name").eq("id", ctx.spelerId).maybeSingle();
  await stuurPushNaarBeheer({ titel: `🧑‍⚖️ Bezwaar van ${team?.nickname ?? team?.login_name ?? "een team"}`, tekst: "Tik om te beslissen.", url: "/admin", tag: "bezwaar" }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
