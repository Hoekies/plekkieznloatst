import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// 🩺 Systeemcheck: is de database bijgewerkt (alle migraties), staat de opslag goed, en de instellingen?
// Alleen lezen. Waarden van geheime instellingen worden nooit teruggegeven, alleen of ze er zijn.
export type Check = { groep: string; naam: string; ok: boolean; uitleg?: string };

const MIGRATIES: { nr: string; bestand: string; wat: string; tabel: string; kolom?: string }[] = [
  { nr: "003", bestand: "003_routes_bewerkt_op.sql", wat: "laatst aangepast bij routes", tabel: "routes", kolom: "bewerkt_op" },
  { nr: "004", bestand: "004_pushmeldingen.sql", wat: "pushmeldingen", tabel: "push_abonnementen" },
  { nr: "005", bestand: "005_spelers_vernieuwen.sql", wat: "wijzigingen naar spelers sturen", tabel: "routes", kolom: "spelers_vernieuwen_at" },
  { nr: "006", bestand: "006_correcties_en_eindtijd.sql", wat: "punten aanpassen en eindtijd", tabel: "score_correcties" },
  { nr: "007", bestand: "007_vragenbank.sql", wat: "favorieten in de vragenbank", tabel: "vragenbank_markering" },
  { nr: "008", bestand: "008_inloglinks.sql", wat: "inloglinks zonder wachtwoord", tabel: "inlog_links" },
  { nr: "009", bestand: "009_teambericht_en_telefoon.sql", wat: "bericht aan één team en telefoonnummers", tabel: "players", kolom: "telefoon" },
  { nr: "010", bestand: "010_pauze.sql", wat: "spel pauzeren", tabel: "routes", kolom: "gepauzeerd_sinds" },
  { nr: "011", bestand: "011_wachtwoord_bewaren.sql", wat: "wachtwoord opnieuw versturen", tabel: "players", kolom: "wachtwoord_versleuteld" },
  { nr: "012", bestand: "012_hele_route_zichtbaar.sql", wat: "hele route zichtbaar", tabel: "routes", kolom: "alle_punten_zichtbaar" },
  { nr: "014", bestand: "014_vraagopties_puzzel_verboden.sql", wat: "vraagopties, puzzelwoord, verboden gebieden", tabel: "routes", kolom: "verboden_gebieden" },
  { nr: "015", bestand: "015_indexen_opruimen_foutlog.sql", wat: "snellere database, opruimen, foutlogboek", tabel: "client_fouten" },
  { nr: "016", bestand: "016_huisstijl_geluid_stemvraag.sql", wat: "huisstijl, geluidset en stemvraag", tabel: "routes", kolom: "geluid_set" },
  { nr: "017", bestand: "017_puzzel_verdeling.sql", wat: "puzzelwoord aan/uit en letters per vraag", tabel: "routes", kolom: "puzzel_verdeling" },
  { nr: "018", bestand: "018_puzzel_gok.sql", wat: "puzzelwoord raden na de finish", tabel: "player_sessions", kolom: "puzzel_gok" },
];

export async function GET() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const checks: Check[] = [];

  // Verbinding
  const { error: verbindingFout } = await admin.from("routes").select("id").limit(1);
  checks.push({ groep: "Database", naam: "Verbinding met de database", ok: !verbindingFout, uitleg: verbindingFout?.message });

  // Migraties: bestaat de tabel of kolom die ze toevoegen?
  for (const m of MIGRATIES) {
    const { error } = await admin.from(m.tabel).select(m.kolom ?? "*").limit(1);
    checks.push({ groep: "Database", naam: `Migratie ${m.nr}: ${m.wat}`, ok: !error, uitleg: error ? `Draai ${m.bestand} in Supabase → SQL Editor.` : undefined });
  }
  // 013: mag een punt "doorlooppunt" zijn? Probeer een punt op een route die niet bestaat: zonder migratie
  // weigert de soortcontrole (23514), met migratie pas de verwijzing naar de route (23503). Er komt nooit iets bij.
  const { error: soortFout } = await admin.from("route_points").insert({
    route_id: "00000000-0000-0000-0000-000000000000", order_index: 0, type: "doorlooppunt", name: "systeemcheck", latitude: 0, longitude: 0,
  });
  const doorloopOk = !!soortFout && soortFout.code !== "23514";
  checks.push({ groep: "Database", naam: "Migratie 013: 🚶 doorlooppunten", ok: doorloopOk, uitleg: doorloopOk ? undefined : "Draai 013_doorlooppunt.sql in Supabase → SQL Editor." });

  // Opslag (afbeeldingen en foto's)
  const { data: buckets, error: opslagFout } = await admin.storage.listBuckets();
  for (const naam of ["route-afbeeldingen", "vraag-afbeeldingen", "foto-inzendingen", "vraag-geluid"]) {
    const ok = !opslagFout && !!buckets?.some((b) => b.name === naam);
    checks.push({ groep: "Opslag", naam: `Map "${naam}"`, ok, uitleg: ok ? undefined : naam === "vraag-geluid" ? "Draai migratie 014 (maakt deze map aan)." : "Maak deze map aan in Supabase → Storage." });
  }

  // Instellingen op Vercel (alleen of ze er zijn)
  const env = [
    ["NEXT_PUBLIC_SUPABASE_URL", "Adres van de database"],
    ["SUPABASE_SERVICE_ROLE_KEY", "Sleutel voor de server"],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Pushmeldingen (openbare sleutel)"],
    ["VAPID_PRIVATE_KEY", "Pushmeldingen (geheime sleutel)"],
  ] as const;
  for (const [naam, wat] of env) {
    const ok = !!process.env[naam];
    checks.push({ groep: "Instellingen", naam: wat, ok, uitleg: ok ? undefined : `Zet ${naam} in Vercel → Settings → Environment Variables.` });
  }

  // Puzzelwoord bedenken: met Claude als de sleutel er is, anders gratis via Wiktionary (geen fout)
  checks.push({ groep: "Instellingen", naam: process.env.ANTHROPIC_API_KEY ? "✨ Woordvoorstellen: met AI (Claude)" : "✨ Woordvoorstellen: gratis (Wiktionary); met ANTHROPIC_API_KEY ook vrije vragen", ok: true });

  // Stand van het spel
  const { data: actief } = await admin.from("routes").select("name").eq("is_active", true).maybeSingle();
  checks.push({ groep: "Spel", naam: actief ? `Actieve route: ${actief.name}` : "Geen actieve route", ok: true });

  return NextResponse.json({ checks });
}
