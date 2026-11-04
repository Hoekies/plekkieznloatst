import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verwachtSchema, verwachteMappen } from "@/lib/migratie-schema.mjs";
import { OVERPASS_SERVERS } from "@/lib/overpass";

// 🩺 Systeemcheck: klopt de database met de migraties, is alles afgeschermd, staan opslag en instellingen goed, zijn
// de externe diensten bereikbaar? Waarden van geheime instellingen worden nooit teruggegeven, alleen of ze er zijn.
// ?teller=1: alleen het lichte deel, voor het bolletje in het menu (geen schrijfpogingen, geen externe diensten).
// licht: hoort bij dat lichte deel. info: ter informatie, telt niet mee. tijdelijk: ligt aan een andere dienst, geen actie.
export type Check = { groep: string; naam: string; ok: boolean; uitleg?: string; licht?: boolean; info?: boolean; tijdelijk?: boolean };

const SQL_EDITOR = "Draai in Supabase → SQL Editor";
const NUL = "00000000-0000-0000-0000-000000000000";

type Admin = ReturnType<typeof createAdminClient>;

// Staan alle tabellen en kolommen uit de migraties in de database? Eén verzoek per tabel; alleen als dat mislukt
// per kolom, om te kunnen zeggen welk bestand er ontbreekt.
async function schemaChecks(admin: Admin): Promise<Check[]> {
  let schema: Map<string, Map<string, string>>;
  try { schema = verwachtSchema(); } catch {
    return [{ groep: "Database", naam: "Migratiebestanden lezen", ok: false, licht: true, uitleg: "De bestanden in supabase/migrations zijn niet meegekomen met deze versie." }];
  }
  const missend = new Map<string, string[]>();
  let goed = 0;
  await Promise.all([...schema].map(async ([tabel, kolommen]) => {
    const namen = [...kolommen.keys()];
    const { error } = await admin.from(tabel).select(namen.join(",") || "*").limit(0);
    if (!error) { goed += namen.length; return; }
    const uitslagen = await Promise.all([...kolommen].map(async ([k, bron]) => {
      const { error: e } = await admin.from(tabel).select(k).limit(0);
      return { k, bron, ok: !e };
    }));
    for (const u of uitslagen) {
      if (u.ok) goed++;
      else missend.set(u.bron, [...(missend.get(u.bron) ?? []), `${tabel}.${u.k}`]);
    }
  }));
  const checks: Check[] = [{ groep: "Database", naam: `Tabellen en kolommen uit de migraties (${goed})`, ok: true, licht: true }];
  for (const [bestand, wat] of [...missend].sort()) {
    checks.push({ groep: "Database", naam: `${bestand} is niet (helemaal) gedraaid`, ok: false, licht: true,
      uitleg: `${SQL_EDITOR}: supabase/migrations/${bestand}. Mist: ${wat.slice(0, 4).join(", ")}${wat.length > 4 ? ` en nog ${wat.length - 4}` : ""}.` });
  }
  return checks.length > 1 ? checks.filter((c) => !c.ok) : checks;
}

// Regels die je niet aan een kolom ziet: probeer iets dat op een latere controle afstuit. Weigert de regel zelf (23514),
// dan ontbreekt de migratie. Er komt nooit iets bij: er is altijd een volgende controle die het tegenhoudt.
async function regelChecks(admin: Admin): Promise<Check[]> {
  const checks: Check[] = [];
  const { error: soortFout } = await admin.from("route_points").insert({ route_id: NUL, order_index: 0, type: "doorlooppunt", name: "systeemcheck", latitude: 0, longitude: 0 });
  const doorloopOk = !!soortFout && soortFout.code !== "23514";
  checks.push({ groep: "Database", naam: "🚶 Doorlooppunten toegestaan", ok: doorloopOk, uitleg: doorloopOk ? undefined : `${SQL_EDITOR} het deel "Migratie 013" uit supabase/migrations/001_schema.sql.` });

  const { error: scoreFout } = await admin.from("player_sessions").insert({ player_id: NUL, route_id: NUL, score: -1, status: "vervallen" });
  const minOk = !!scoreFout && scoreFout.code !== "23514";
  checks.push({ groep: "Database", naam: "Minpunten toegestaan (score onder 0)", ok: minOk, uitleg: minOk ? undefined : `${SQL_EDITOR} het deel "Migratie 021" uit supabase/migrations/001_schema.sql.` });

  // 🎨 Alle kleuren: een bestaande route opnieuw invoegen met een van de nieuwe kleuren. De kleurcontrole komt eerst
  // (23514 = migratie mist), daarna weigert de database hem omdat die route al bestaat (23505).
  const { data: route } = await admin.from("routes").select("*").limit(1).maybeSingle();
  if (route) {
    const { error: kleurFout } = await admin.from("routes").insert({ ...route, huis_thema: "petrol" });
    const kleurOk = !!kleurFout && kleurFout.code !== "23514";
    checks.push({ groep: "Database", naam: "🎨 Alle kleuren voor de spelersapp", ok: kleurOk, uitleg: kleurOk ? undefined : `${SQL_EDITOR}: supabase/migrations/012_meer_kleurthemas.sql.` });
  }

  // Scores in één stap: een aanroep op een sessie die niet bestaat verandert niets
  const { error: atoomFout } = await admin.rpc("pr_score_bij", { p_sessie: NUL, p_delta: 0 });
  checks.push({ groep: "Database", naam: "Scores en items in één stap", ok: !atoomFout, uitleg: atoomFout ? `${SQL_EDITOR}: supabase/migrations/002_atomaire_acties.sql.` : undefined });
  return checks;
}

// Kan iemand met de openbare sleutel (die staat in elke browser) gegevens lezen? Toont nooit inhoud, alleen of het kan.
async function beveiligingChecks(): Promise<Check[]> {
  const groep = "Beveiliging";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const kop = { apikey: anon, Authorization: `Bearer ${anon}` };
  const lees = async (tabel: string) => {
    const r = await fetch(`${url}/rest/v1/${tabel}?select=*&limit=1`, { headers: kop, cache: "no-store" }).catch(() => null);
    const rijen = r?.ok ? await r.json().catch(() => []) : [];
    return { tabel, status: r?.status ?? 0, rijen: Array.isArray(rijen) ? rijen.length : 0 };
  };
  const checks: Check[] = [];
  const tabellen = [...verwachtSchema().keys()];
  const uitslagen = await Promise.all(tabellen.map(lees));
  const open = uitslagen.filter((u) => u.rijen > 0).map((u) => u.tabel);
  checks.push({ groep, naam: `Tabellen niet leesbaar voor buitenstaanders (${tabellen.length})`, ok: !open.length,
    uitleg: open.length ? `Openbaar leesbaar: ${open.join(", ")}. Zet Row Level Security aan op deze tabellen.` : undefined });
  // Het puzzelwoord en de goede antwoorden: hier moet Supabase het verzoek helemaal weigeren
  const geheim = ["routes", "questions", "answer_options", "route_points", "special_items"];
  const nietDicht = uitslagen.filter((u) => geheim.includes(u.tabel) && u.status !== 401 && u.status !== 403).map((u) => u.tabel);
  checks.push({ groep, naam: "Puzzelwoord en goede antwoorden afgeschermd", ok: !nietDicht.length,
    uitleg: nietDicht.length ? `Niet afgeschermd: ${nietDicht.join(", ")}. ${SQL_EDITOR}: supabase/migrations/003_afschermen_en_startitems.sql.` : undefined });
  // Foto's van teams: niet op te vragen als lijst
  const lijst = await fetch(`${url}/storage/v1/object/list/foto-inzendingen`, { method: "POST", headers: { ...kop, "Content-Type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 1 }), cache: "no-store" }).catch(() => null);
  const items = lijst?.ok ? await lijst.json().catch(() => []) : [];
  const fotosDicht = !Array.isArray(items) || items.length === 0;
  checks.push({ groep, naam: "Teamfoto's niet op te vragen als lijst", ok: fotosDicht, uitleg: fotosDicht ? undefined : "Haal in Supabase → Storage de openbare leesregel van foto-inzendingen weg." });
  return checks;
}

async function opslagChecks(admin: Admin): Promise<Check[]> {
  const { data: buckets, error } = await admin.storage.listBuckets();
  return [...verwachteMappen()].map(([naam, openbaar]) => {
    const b = buckets?.find((x) => x.name === naam);
    const ok = !error && !!b && b.public === openbaar;
    const wat = openbaar ? "openbaar" : "niet openbaar";
    return { groep: "Opslag", naam: `Map "${naam}" (${wat})`, ok,
      uitleg: ok ? undefined : b ? `Zet deze map in Supabase → Storage op ${wat}.` : `${SQL_EDITOR}: supabase/migrations/013_opslagmappen.sql.` };
  });
}

function instellingChecks(): Check[] {
  const env = [
    ["NEXT_PUBLIC_SUPABASE_URL", "Adres van de database"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Openbare sleutel"],
    ["SUPABASE_SERVICE_ROLE_KEY", "Sleutel voor de server"],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Pushmeldingen (openbare sleutel)"],
    ["VAPID_PRIVATE_KEY", "Pushmeldingen (geheime sleutel)"],
  ] as const;
  const checks: Check[] = env.map(([naam, wat]) => {
    const ok = !!process.env[naam];
    return { groep: "Instellingen", naam: wat, ok, licht: true, uitleg: ok ? undefined : `Zet ${naam} in Vercel → Settings → Environment Variables.` };
  });
  checks.push({ groep: "Instellingen", naam: process.env.ANTHROPIC_API_KEY ? "✨ Woordvoorstellen: met AI (Claude)" : "✨ Woordvoorstellen: gratis (Wiktionary); met ANTHROPIC_API_KEY begrijpt Claude elke hint", ok: true, info: true, licht: true });
  return checks;
}

// De diensten die de app van buiten gebruikt. Ligt er een even plat, dan is dat geen fout van jou (tijdelijk).
async function dienstChecks(): Promise<Check[]> {
  const diensten: [string, string][] = [
    ["🌦️ Weer (Open-Meteo)", "https://api.open-meteo.com/v1/forecast?latitude=52&longitude=5&hourly=temperature_2m&forecast_days=1"],
    ["🗺️ Kaart (OpenFreeMap)", "https://tiles.openfreemap.org/styles/liberty"],
    ["🛰️ Luchtfoto (PDOK)", "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0?request=GetCapabilities&service=wmts"],
    ["🚶 Looproutes (OSM-routing)", "https://routing.openstreetmap.de/routed-foot/nearest/v1/foot/5,52?number=1"],
    ["📍 Adres zoeken (Nominatim)", "https://nominatim.openstreetmap.org/status"],
  ];
  const antwoord = (url: string) => fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store", headers: { "User-Agent": "PointRush-systeemcheck" } }).catch(() => null);
  const uit = (naam: string, ok: boolean): Check => ({ groep: "Externe diensten", naam, ok, tijdelijk: !ok });
  const gewoon = diensten.map(async ([naam, url]) => {
    const r = await antwoord(url);
    // 4xx (bijvoorbeeld "te veel verzoeken") betekent ook: de dienst leeft
    return uit(naam, !!r && r.status < 500);
  });
  // Overpass heeft een reserve-server: goed als er minstens één echt antwoordt (hij geeft soms 406 als hij vol zit)
  const overpass = Promise.all(OVERPASS_SERVERS.map((s) => antwoord(`${s}/status`)))
    .then((lijst) => uit("🧱 Ondergrond en vraagideeën (Overpass)", lijst.some((r) => r?.ok)));
  return Promise.all([...gewoon, overpass]);
}

// Stand van het spel: wat je kunt nagaan vóór en tijdens een spel
async function spelChecks(admin: Admin): Promise<Check[]> {
  const groep = "Spel";
  const { data: actief } = await admin.from("routes").select("id, name").eq("is_active", true).maybeSingle();
  if (!actief) return [{ groep, naam: "Geen actieve route", ok: true, info: true }];
  const [{ count: punten }, { data: lopend }] = await Promise.all([
    admin.from("route_points").select("id", { count: "exact", head: true }).eq("route_id", actief.id),
    admin.from("player_sessions").select("id, started_at").eq("route_id", actief.id).eq("status", "actief"),
  ]);
  const checks: Check[] = [{ groep, naam: `Actieve route: ${actief.name}`, ok: true, info: true }];
  checks.push({ groep, naam: `Punten op de route (${punten ?? 0})`, ok: (punten ?? 0) > 0, uitleg: (punten ?? 0) > 0 ? undefined : "De actieve route heeft geen punten: zet ze erop in de editor." });
  const oud = (lopend ?? []).filter((s) => s.started_at && Date.now() - Date.parse(s.started_at) > 12 * 3600 * 1000).length;
  checks.push({ groep, naam: "Geen vergeten spellen", ok: !oud, uitleg: oud ? `${oud} ${oud === 1 ? "spel loopt" : "spellen lopen"} al langer dan 12 uur. Rond ze af op het dashboard (🏁 Afronden).` : undefined });
  return checks;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const teller = request.nextUrl.searchParams.get("teller") === "1";

  const { error: verbindingFout } = await admin.from("routes").select("id").limit(1);
  const verbinding: Check = { groep: "Database", naam: "Verbinding met de database", ok: !verbindingFout, licht: true, uitleg: verbindingFout?.message };

  if (teller) {
    // Nieuwe foutmeldingen sinds je ze voor het laatst bekeek
    const sinds = request.nextUrl.searchParams.get("sinds");
    let telling = admin.from("client_fouten").select("id", { count: "exact", head: true });
    if (sinds) telling = telling.gt("created_at", sinds);
    const [schema, { count: fouten }] = await Promise.all([schemaChecks(admin), telling]);
    return NextResponse.json({ checks: [verbinding, ...schema, ...instellingChecks()], fouten: fouten ?? 0 });
  }

  // Alles tegelijk: het scherm wacht niet op elk onderdeel apart
  const [schema, regels, beveiliging, opslag, diensten, spel] = await Promise.all([
    schemaChecks(admin), regelChecks(admin), beveiligingChecks(), opslagChecks(admin), dienstChecks(), spelChecks(admin),
  ]);
  return NextResponse.json({ checks: [verbinding, ...schema, ...regels, ...beveiliging, ...opslag, ...instellingChecks(), ...diensten, ...spel] });
}
