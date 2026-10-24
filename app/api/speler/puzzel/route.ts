import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { puzzelStand, RAAD_SECONDEN } from "@/lib/puzzel";
import { puzzelRegels, gevondenLetters, rekenPuzzelAf, raadPuzzel } from "@/lib/puzzel-server";

// 🧩 Puzzelwoord van het eigen spel: GET = de verdiende letters (en na de finish: de punten ervoor),
// POST { woord } = het woord afmaken (alleen na de finish). Zonder puzzelwoord: { actief: false }.
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
  return { admin, sessie, route, regels: puzzelRegels(route) };
}

type Context = NonNullable<Awaited<ReturnType<typeof context>>>;

async function stand(c: Context) {
  const regels = c.regels!;
  // Gefinisht: eerst afrekenen (punten per letter en eventueel de bonus), dan de actuele stand
  if (c.sessie.status === "voltooid") await rekenPuzzelAf(c.admin, c.sessie.id, c.route);
  const { data: s } = await c.admin.from("player_sessions").select("*").eq("id", c.sessie.id).maybeSingle();
  const gevonden = await gevondenLetters(c.admin, c.sessie.id, regels);
  const r = (s ?? {}) as { puzzel_opgelost?: boolean; finished_at?: string | null; puzzel_gok?: string | null; puzzel_gok_goed?: boolean | null; puzzel_gok_op?: string | null };
  const opgelost = !!r.puzzel_opgelost;
  // Raden: één poging, binnen RAAD_SECONDEN na de finish; daarna (of na de poging) gaat het woord open
  const raadTot = r.finished_at ? new Date(Date.parse(r.finished_at) + RAAD_SECONDEN * 1000).toISOString() : null;
  const afgesloten = opgelost || !!r.puzzel_gok_op || (!!raadTot && Date.now() > Date.parse(raadTot));
  const onthuld = c.sessie.status === "voltooid" && afgesloten;
  return {
    actief: true,
    ...puzzelStand(regels.woord, c.sessie.id, gevonden, opgelost || onthuld, regels.alleBonus, regels.omschrijving, regels.opVolgorde),
    opgelost,
    gevonden, gefinisht: c.sessie.status === "voltooid",
    letter_punten: regels.letterPunten, raad_bonus: regels.raadBonus,
    raad_tot: raadTot, afgesloten, gok: r.puzzel_gok ?? null, gok_goed: r.puzzel_gok_goed ?? null,
  };
}

export async function GET() {
  const c = await context();
  if (!c) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  if (!c.regels) return NextResponse.json({ actief: false });
  return NextResponse.json(await stand(c));
}

export async function POST(request: NextRequest) {
  const c = await context();
  if (!c) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  if (!c.regels) return NextResponse.json({ fout: "Deze route heeft geen puzzelwoord" }, { status: 400 });
  if (c.sessie.status !== "voltooid") return NextResponse.json({ fout: "Het woord afmaken kan bij de finish" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const uitkomst = await raadPuzzel(c.admin, c.sessie.id, c.regels, typeof body?.woord === "string" ? body.woord : "");
  if ("fout" in uitkomst) return NextResponse.json({ fout: uitkomst.fout, ...(await stand(c)) }, { status: uitkomst.status });
  return NextResponse.json({ goed: uitkomst.goed, ...(await stand(c)) });
}
