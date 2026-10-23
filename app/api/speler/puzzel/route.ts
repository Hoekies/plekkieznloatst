import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { puzzelStand } from "@/lib/puzzel";
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
  const opgelost = !!(s as { puzzel_opgelost?: boolean } | null)?.puzzel_opgelost;
  return {
    actief: true,
    ...puzzelStand(regels.woord, c.sessie.id, gevonden, opgelost, regels.alleBonus, regels.omschrijving),
    gevonden, gefinisht: c.sessie.status === "voltooid",
    letter_punten: regels.letterPunten, raad_bonus: regels.raadBonus,
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
  const goed = await raadPuzzel(c.admin, c.sessie.id, c.regels, typeof body?.woord === "string" ? body.woord : "");
  return NextResponse.json({ goed, ...(await stand(c)) });
}
