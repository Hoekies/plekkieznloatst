import { isKleurThema } from "@/lib/kleurthema";
import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { schoonStartitems } from "@/lib/startitems";
import { ITEMS_NA_FINISH } from "@/lib/item-sessie";
import { normaliseerPlezier } from "@/lib/spelplezier";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .select("*, route_points(*)")
    .eq("id", params.id)
    .order("order_index", { referencedTable: "route_points" })
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const toegestaan: Record<string, unknown> = {};
  if (typeof body.name === "string") toegestaan.name = body.name;
  // 📁 Map voor het routeoverzicht (migratie 022); leeg = geen map
  if ("map" in body) toegestaan.map = typeof body.map === "string" && body.map.trim() ? body.map.trim().slice(0, 40) : null;
  if (body.status === "concept" || body.status === "gepubliceerd") toegestaan.status = body.status;
  // modus wordt alleen bij aanmaken gezet (zie /api/admin/routes) en kan hierna niet meer wijzigen.
  if (body.is_active === false) toegestaan.is_active = false;
  if (typeof body.verwacht_aantal_teams === "number" && body.verwacht_aantal_teams >= 2) toegestaan.verwacht_aantal_teams = body.verwacht_aantal_teams;
  if (typeof body.doel_afstand_km === "number" && body.doel_afstand_km >= 0) toegestaan.doel_afstand_km = body.doel_afstand_km;
  if (typeof body.ster_waarde === "number" && body.ster_waarde >= 0) toegestaan.ster_waarde = body.ster_waarde;
  if (typeof body.bom_waarde === "number" && body.bom_waarde >= 0) toegestaan.bom_waarde = body.bom_waarde;
  if (typeof body.item_respawn === "boolean") toegestaan.item_respawn = body.item_respawn;
  if (typeof body.vraag_punten === "number" && body.vraag_punten >= 0) toegestaan.vraag_punten = Math.round(body.vraag_punten);
  if (typeof body.startvraag_meter === "number" && body.startvraag_meter >= 0) toegestaan.startvraag_meter = Math.min(500, Math.round(body.startvraag_meter));
  if (typeof body.alle_punten_zichtbaar === "boolean") toegestaan.alle_punten_zichtbaar = body.alle_punten_zichtbaar;
  // ⚔️ Duel (migratie 006)
  if (typeof body.duel_aan === "boolean") toegestaan.duel_aan = body.duel_aan;
  if (typeof body.duel_punten === "number" && body.duel_punten > 0) toegestaan.duel_punten = Math.min(500, Math.round(body.duel_punten));
  // ⚙️ Instellingen van het spelplezier (migratie 008): alleen geldige waarden
  if (body.spelplezier && typeof body.spelplezier === "object") toegestaan.spelplezier = normaliseerPlezier(body.spelplezier);
  // 🎉 Spelplezier aan/uit (migratie 007)
  for (const veld of ["val_aan", "reeks_aan", "badges_aan", "fotobattle_aan", "schat_aan", "rad_aan"]) {
    if (typeof body[veld] === "boolean") toegestaan[veld] = body[veld];
  }
  if ("puzzelwoord" in body) toegestaan.puzzelwoord = typeof body.puzzelwoord === "string" && body.puzzelwoord.trim() ? body.puzzelwoord.trim().slice(0, 30) : null;
  if ("puzzel_omschrijving" in body) toegestaan.puzzel_omschrijving = typeof body.puzzel_omschrijving === "string" && body.puzzel_omschrijving.trim() ? body.puzzel_omschrijving.trim().slice(0, 120) : null;
  if (typeof body.puzzel_bonus === "number" && body.puzzel_bonus >= 0) toegestaan.puzzel_bonus = Math.min(10000, Math.round(body.puzzel_bonus));
  for (const veld of ["puzzel_letter_punten", "puzzel_raad_bonus"]) {
    if (typeof body[veld] === "number" && body[veld] >= 0) toegestaan[veld] = Math.min(10000, Math.round(body[veld]));
  }
  // 🧩 Puzzelwoord aan/uit en letters per vraag (migratie 017)
  if (typeof body.puzzel_aan === "boolean") toegestaan.puzzel_aan = body.puzzel_aan;
  if (body.puzzel_volgorde === "willekeurig" || body.puzzel_volgorde === "op_volgorde") toegestaan.puzzel_volgorde = body.puzzel_volgorde;
  if (body.puzzel_verdeling && typeof body.puzzel_verdeling === "object") {
    toegestaan.puzzel_verdeling = Object.fromEntries(Object.entries(body.puzzel_verdeling as Record<string, unknown>)
      .filter(([k, v]) => /^[0-9a-f-]{36}$/i.test(k) && (v === 0 || v === 2)));
  }
  // 🎨 Huisstijl en 🔔 geluidset (migratie 016); leeg = de gewone stijl
  if ("huisstijl_kleur" in body) toegestaan.huisstijl_kleur = typeof body.huisstijl_kleur === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.huisstijl_kleur) ? body.huisstijl_kleur : null;
  for (const veld of ["huisstijl_logo_pad", "welkom_foto_pad"]) {
    if (veld in body) toegestaan[veld] = typeof body[veld] === "string" && /^[\w-]+\.(jpg|jpeg|png|webp)$/i.test(body[veld]) ? body[veld] : null;
  }
  if (["klassiek", "arcade", "zacht", "feest"].includes(body.geluid_set)) toegestaan.geluid_set = body.geluid_set;
  // 🎨 Kleurthema van de spelersapp (migratie 011); paars = leeg
  if ("huis_thema" in body) toegestaan.huis_thema = isKleurThema(body.huis_thema) && body.huis_thema !== "paars" ? body.huis_thema : null;
  if ("verboden_gebieden" in body) {
    // Alleen geldige vlakken: een naam en minstens 3 hoekpunten
    const lijst = Array.isArray(body.verboden_gebieden) ? body.verboden_gebieden : [];
    toegestaan.verboden_gebieden = lijst
      .filter((g: { punten?: unknown }) => Array.isArray(g?.punten) && g.punten.length >= 3)
      .slice(0, 20)
      .map((g: { naam?: unknown; punten: unknown[] }) => ({
        naam: typeof g.naam === "string" ? g.naam.trim().slice(0, 40) : "Verboden gebied",
        punten: g.punten.slice(0, 60).map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [0, 0])).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b)),
      }));
  }
  if (Array.isArray(body.items_na_finish_types)) {
    // Keuze per item; de oude schakelaar staat aan zolang er minstens één item aan staat
    toegestaan.items_na_finish_types = ITEMS_NA_FINISH.filter((t) => body.items_na_finish_types.includes(t));
    toegestaan.items_na_finish = (toegestaan.items_na_finish_types as string[]).length > 0;
  }
  if ("startitems" in body) toegestaan.startitems = schoonStartitems(body.startitems);
  if (body.instappunten && typeof body.instappunten === "object" && !Array.isArray(body.instappunten)) {
    toegestaan.instappunten = Object.fromEntries(Object.entries(body.instappunten as Record<string, unknown>)
      .filter(([team, id]) => /^\d{1,2}$/.test(team) && typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)));
  }
  if (Array.isArray(body.omgekeerde_teams)) {
    toegestaan.omgekeerde_teams = [...new Set(body.omgekeerde_teams.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 50))];
  }
  if (typeof body.respawn_minuten === "number" && body.respawn_minuten > 0) toegestaan.respawn_minuten = body.respawn_minuten;
  if (typeof body.plekzooi_duur_seconden === "number" && body.plekzooi_duur_seconden > 0) toegestaan.plekzooi_duur_seconden = body.plekzooi_duur_seconden;
  if (typeof body.spook_duur_seconden === "number" && body.spook_duur_seconden > 0) toegestaan.spook_duur_seconden = body.spook_duur_seconden;
  if (typeof body.tussenstand_interval_minuten === "number" && body.tussenstand_interval_minuten >= 0) toegestaan.tussenstand_interval_minuten = body.tussenstand_interval_minuten;
  if (typeof body.tussenstand_duur_seconden === "number" && body.tussenstand_duur_seconden > 0) toegestaan.tussenstand_duur_seconden = body.tussenstand_duur_seconden;
  if (body.tussenstand_nu_tonen === true) toegestaan.tussenstand_trigger_at = new Date().toISOString();
  if (Object.keys(toegestaan).length === 0) {
    return NextResponse.json({ fout: "Geen geldige velden" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .update(toegestaan)
    .eq("id", params.id)
    .select()
    .single();
  if (error && /alle_punten_zichtbaar/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 012 (hele route zichtbaar) in Supabase" }, { status: 500 });
  }
  if (error && /puzzel_volgorde/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 010 (supabase/migrations/010_puzzel_volgorde.sql) in Supabase" }, { status: 500 });
  }
  if (error && /puzzel_aan|puzzel_verdeling|puzzel_letter_punten|puzzel_raad_bonus/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 017 (puzzelwoord per vraag) in Supabase" }, { status: 500 });
  }
  // Nieuwe kleur geweigerd door de controle in de database: migratie 012 (meer kleuren) ontbreekt nog
  if (error && /huis_thema_check/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 012 (supabase/migrations/012_meer_kleurthemas.sql) in Supabase" }, { status: 500 });
  }
  if (error && /huis_thema/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 011 (supabase/migrations/011_kleurthema.sql) in Supabase" }, { status: 500 });
  }
  if (error && /huisstijl|welkom_foto|geluid_set/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 016 (huisstijl, geluid en stemvraag) in Supabase" }, { status: 500 });
  }
  if (error && /routes.map|column "?map"?|vraag_statistiek/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 022 (routes in mappen) in Supabase" }, { status: 500 });
  }
  if (error && /startvraag_meter/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 026 (afstand tot de eerste vraag) in Supabase" }, { status: 500 });
  }
  if (error && /vraag_punten/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 025 (punten per vraag) in Supabase" }, { status: 500 });
  }
  if (error && /puzzel|verboden_gebieden/.test(error.message)) {
    return NextResponse.json({ fout: "Draai eerst migratie 014 (puzzelwoord en verboden gebieden) in Supabase" }, { status: 500 });
  }
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { error } = await admin.from("routes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
