import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normaliseerPuzzel, puzzelStand } from "@/lib/puzzel";

// 🧩 Puzzelwoord van het eigen spel: GET = de verdiende letters, POST { woord } = raden (bij de finish).
// Zonder puzzelwoord in de route (of zonder migratie 014): { actief: false }.
async function context() {
  const user = await haalGebruiker();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;
  const { data: sessie } = await admin.from("player_sessions").select("*")
    .eq("player_id", speler.id).in("status", ["actief", "voltooid"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (!sessie) return null;
  const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
  const woord = normaliseerPuzzel((route as { puzzelwoord?: string | null } | null)?.puzzelwoord);
  if (!woord) return { admin, sessie, woord: "", bonus: 0, omschrijving: null };
  const r = route as { puzzel_bonus?: number; puzzel_omschrijving?: string | null };
  return { admin, sessie, woord, bonus: r.puzzel_bonus ?? 100, omschrijving: r.puzzel_omschrijving ?? null };
}

// Aantal goed beantwoorde vragen (alleen punten mét een vraag; een infopunt telt niet)
async function aantalGoed(admin: ReturnType<typeof createAdminClient>, sessieId: string) {
  const { data: goed } = await admin.from("player_point_progress").select("route_point_id").eq("session_id", sessieId).eq("is_correct", true);
  const ids = (goed ?? []).map((g) => g.route_point_id);
  if (!ids.length) return 0;
  const { count } = await admin.from("questions").select("id", { count: "exact", head: true }).in("route_point_id", ids);
  return count ?? 0;
}

export async function GET() {
  const c = await context();
  if (!c) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  if (!c.woord) return NextResponse.json({ actief: false });
  const opgelost = !!(c.sessie as { puzzel_opgelost?: boolean }).puzzel_opgelost;
  return NextResponse.json({ actief: true, ...puzzelStand(c.woord, c.sessie.id, await aantalGoed(c.admin, c.sessie.id), opgelost, c.bonus, c.omschrijving) });
}

export async function POST(request: NextRequest) {
  const c = await context();
  if (!c) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  if (!c.woord) return NextResponse.json({ fout: "Deze route heeft geen puzzelwoord" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const goedGeraden = normaliseerPuzzel(body?.woord) === c.woord;
  let opgelost = !!(c.sessie as { puzzel_opgelost?: boolean }).puzzel_opgelost;
  if (goedGeraden && !opgelost) {
    // Bonus één keer, zichtbaar in de tijdlijn en het rapport
    await c.admin.from("score_correcties").insert({ session_id: c.sessie.id, delta: c.bonus, reden: "🧩 Puzzelwoord geraden" });
    await c.admin.from("player_sessions").update({ score: (c.sessie.score ?? 0) + c.bonus, puzzel_opgelost: true }).eq("id", c.sessie.id);
    opgelost = true;
  }
  return NextResponse.json({ goed: goedGeraden, actief: true, ...puzzelStand(c.woord, c.sessie.id, await aantalGoed(c.admin, c.sessie.id), opgelost, c.bonus, c.omschrijving) });
}
