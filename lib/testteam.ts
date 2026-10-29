import type { createAdminClient } from "@/lib/supabase-admin";
import { voerItemUit } from "@/lib/item-uitvoeren";
import { logItem } from "@/lib/item-log";
import { maakDuel, startDuels, beantwoordDuel, type Duel } from "@/lib/duel";
import { DUEL_VRAGEN } from "@/lib/duel-vragen";
import { naGeraakt } from "@/lib/spelplezier-server";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🧪 Testteam (migratie 005): een team om in je eentje een rondje te lopen, met een nep-tegenstander die
// items op je gooit (vanzelf elke paar minuten, of met een knop in het beheer) en waar jij items op kunt gooien.
// Testteams en echte teams zien en raken elkaar niet, en een test telt niet mee in de statistiek, de stand
// of het rapport. Spelers zonder kolom test_rol (migratie nog niet gedraaid) gelden als echt team.

export const TEST_LOGIN = "test";
export const TEGENSTANDER_LOGIN = "testtegenstander";
export const TEGENSTANDER_NAAM = "Testtegenstander";
export const TEST_ITEMS = ["bom", "spook", "banaan", "dief", "wissel"] as const;
// Vanzelf: na zoveel minuten spelen de eerste worp, daarna steeds na zoveel minuten
const AUTO_EERSTE_MIN = 3;
const AUTO_TUSSEN_MIN = 4;
// ⚔️ Vanzelf een duel (als het duel aan staat op de route): pas na zoveel minuten, daarna met de gewone duelpauze
const AUTO_DUEL_MIN = 5;

export { testRol, type TestRol } from "@/lib/test-rol";
import { testRol } from "@/lib/test-rol";

// Hoort deze speler bij een test? ("*": zonder migratie 005 ontbreekt de kolom gewoon)
export async function isTestSpeler(admin: AdminClient, spelerId: string): Promise<boolean> {
  const { data } = await admin.from("players").select("*").eq("id", spelerId).maybeSingle();
  return !!testRol(data);
}

// Spelen deze twee in hetzelfde soort spel (allebei test, of allebei echt)?
export async function zelfdeSoortSpel(admin: AdminClient, a: string, b: string): Promise<boolean> {
  const { data } = await admin.from("players").select("*").in("id", [a, b]);
  const rol = (id: string) => !!testRol((data ?? []).find((p) => p.id === id));
  return rol(a) === rol(b);
}

// Ids van alle sessies van testspelers (om ze buiten statistiek en rapport te houden)
export async function testSessieIds(admin: AdminClient): Promise<Set<string>> {
  const { data: spelers } = await admin.from("players").select("*");
  const ids = (spelers ?? []).filter((p) => testRol(p)).map((p) => p.id as string);
  if (!ids.length) return new Set();
  const { data } = await admin.from("player_sessions").select("id").in("player_id", ids);
  return new Set((data ?? []).map((s) => s.id));
}

async function testSpelers(admin: AdminClient) {
  const { data } = await admin.from("players").select("*");
  const lijst = data ?? [];
  return { team: lijst.find((p) => testRol(p) === "team") ?? null, tegenstander: lijst.find((p) => testRol(p) === "tegenstander") ?? null };
}

// De testtegenstander speelt mee zolang het testteam speelt: een eigen spel op dezelfde route (zonder lopen)
export async function zorgTegenstander(admin: AdminClient, routeId: string): Promise<{ id: string; score: number; player_id: string } | null> {
  const { tegenstander } = await testSpelers(admin);
  if (!tegenstander) return null;
  const { data: bestaand } = await admin.from("player_sessions").select("id, score, player_id, status")
    .eq("player_id", tegenstander.id).eq("route_id", routeId).eq("status", "actief").maybeSingle();
  if (bestaand) return bestaand;
  const { data } = await admin.from("player_sessions")
    .insert({ player_id: tegenstander.id, route_id: routeId, started_at: new Date().toISOString(), status: "actief", score: 0 })
    .select("id, score, player_id").single();
  return data ?? null;
}

// De testtegenstander gooit een item op het testteam (type: willekeurig uit TEST_ITEMS)
export async function gooiOpTestteam(admin: AdminClient, testSessie: { id: string; route_id: string; score: number; player_id: string }, type?: string)
  : Promise<{ ok: true; type: string } | { ok: false; fout: string }> {
  const soort = type && (TEST_ITEMS as readonly string[]).includes(type) ? type : TEST_ITEMS[Math.floor(Math.random() * TEST_ITEMS.length)];
  const tegen = await zorgTegenstander(admin, testSessie.route_id);
  if (!tegen) return { ok: false, fout: "Er is geen testtegenstander: maak eerst het testteam aan" };
  // Een item voor de tegenstander, alsof hij het net heeft opgepakt (startitem: Opruimen haalt het weg)
  const { data: item, error } = await admin.from("special_items").insert({
    route_id: testSessie.route_id, type: soort, name: `Test${soort}`, latitude: 0, longitude: 0, points_effect: 0,
    claimed: true, claimed_by_session_id: tegen.id, claimed_at: new Date().toISOString(), is_startitem: true,
  }).select("id, type, points_effect").single();
  if (error || !item) return { ok: false, fout: error?.message ?? "Item maken lukte niet" };
  const [{ data: routeWaarden }, { data: team }] = await Promise.all([
    admin.from("routes").select("*").eq("id", testSessie.route_id).maybeSingle(),
    admin.from("players").select("nickname, login_name").eq("id", testSessie.player_id).maybeSingle(),
  ]);
  const uit = await voerItemUit(admin, {
    item, eigenSessie: { id: tegen.id, route_id: testSessie.route_id }, doelSessie: testSessie, routeWaarden,
    aanvallerNaam: TEGENSTANDER_NAAM, doelNaam: team?.nickname ?? team?.login_name ?? "testteam",
  });
  if (!uit.ok) return { ok: false, fout: uit.fout };
  await logItem(admin, { gebruiker: tegen.id, doel: testSessie.id, type: soort, omschrijving: uit.eigenNotificatie ?? null, plek: null }).catch(() => undefined);
  await naGeraakt(admin, testSessie.id).catch(() => undefined);
  return { ok: true, type: soort };
}

// Vanzelf gooien: het testteam speelt al een paar minuten en de vorige worp is lang genoeg geleden
export async function testAutoWorp(admin: AdminClient, spelerId: string): Promise<void> {
  const { data: speler } = await admin.from("players").select("*").eq("id", spelerId).maybeSingle();
  if (testRol(speler) !== "team") return;
  const { data: sessie } = await admin.from("player_sessions").select("id, route_id, score, player_id, started_at")
    .eq("player_id", spelerId).eq("status", "actief").maybeSingle();
  if (!sessie?.started_at || Date.now() - Date.parse(sessie.started_at) < AUTO_EERSTE_MIN * 60_000) return;
  const tegen = await zorgTegenstander(admin, sessie.route_id);
  if (!tegen) return;
  if (Date.now() - Date.parse(sessie.started_at) >= AUTO_DUEL_MIN * 60_000) {
    const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
    if (route?.duel_aan) await startDuels(admin, route, sessie.id, [tegen.id]).catch(() => undefined);
  }
  const { data: laatste } = await admin.from("special_items").select("used_at").eq("claimed_by_session_id", tegen.id)
    .not("used_at", "is", null).order("used_at", { ascending: false }).limit(1).maybeSingle();
  if (laatste?.used_at && Date.now() - Date.parse(laatste.used_at) < AUTO_TUSSEN_MIN * 60_000) return;
  // Twee verzoeken tegelijk: het tweede ziet de verse worp van het eerste pas na afloop; een dubbele worp is
  // bij een test niet erg
  await gooiOpTestteam(admin, sessie);
}

// ⚔️ Duel testen (knop in het beheer): de testtegenstander daagt het testteam nu uit, ook als het duel bij de
// route nog uit staat. Er hoeft niemand in de buurt te zijn.
export async function testDuel(admin: AdminClient, testSessie: { id: string; route_id: string }): Promise<{ ok: true } | { ok: false; fout: string }> {
  const tegen = await zorgTegenstander(admin, testSessie.route_id);
  if (!tegen) return { ok: false, fout: "Er is geen testtegenstander: maak eerst het testteam aan" };
  const { data: route } = await admin.from("routes").select("*").eq("id", testSessie.route_id).maybeSingle();
  if (!route) return { ok: false, fout: "Route niet gevonden" };
  return await maakDuel(admin, route, testSessie.id, tegen.id)
    ? { ok: true }
    : { ok: false, fout: "Er loopt al een duel, of migratie 006 (duel) is nog niet gedraaid" };
}

// De testtegenstander antwoordt zelf in een duel: na 10 tot 40 seconden, ongeveer de helft van de keren goed.
// Vast per duel (uit het id), zodat elke vraag om de stand hetzelfde moment en antwoord geeft.
export async function testBotAntwoord(admin: AdminClient, d: Duel, tegenSessie: string): Promise<boolean> {
  if (d.afgerond_op || (d.sessie_a === tegenSessie ? d.antwoord_a : d.antwoord_b) !== null) return false;
  const getal = parseInt(d.id.replace(/-/g, "").slice(0, 8), 16) || 0;
  if (Date.now() < Date.parse(d.gestart_op) + (10 + (getal % 31)) * 1000) return false;
  const goed = DUEL_VRAGEN[d.vraag_nr]?.goed ?? 0;
  const keuze = Math.floor(getal / 64) % 2 === 0 ? goed : (goed + 1 + (getal % 3)) % 4;
  await beantwoordDuel(admin, d, tegenSessie, keuze);
  return true;
}

// ↺ Test opnieuw: alleen de spellen van het testteam en de testtegenstander weg (echte teams blijven staan)
export async function wisTest(admin: AdminClient): Promise<number> {
  const { team, tegenstander } = await testSpelers(admin);
  const spelers = [team?.id, tegenstander?.id].filter(Boolean) as string[];
  if (!spelers.length) return 0;
  const { data: sessies } = await admin.from("player_sessions").select("id").in("player_id", spelers);
  const ids = (sessies ?? []).map((s) => s.id);
  if (!ids.length) return 0;
  await admin.from("special_items").delete().in("claimed_by_session_id", ids).eq("is_startitem", true);
  await admin.from("special_items").update({ claimed: false, claimed_by_session_id: null, claimed_at: null, used_at: null, respawn_at: null })
    .in("claimed_by_session_id", ids);
  await admin.from("player_point_progress").delete().in("session_id", ids);
  await admin.from("location_updates").delete().in("session_id", ids);
  await admin.from("special_item_effects").delete().in("target_session_id", ids);
  await admin.from("foto_inzendingen").delete().in("session_id", ids);
  await admin.from("player_sessions").delete().in("id", ids);
  return ids.length;
}
