import type { createAdminClient } from "@/lib/supabase-admin";
import { haversine, binnenVlak } from "@/lib/geo";
import { telBijScore, boekScoreOver } from "@/lib/score";
import { logItem } from "@/lib/item-log";
import { testRol } from "@/lib/test-rol";
import { teamFotos } from "@/lib/teamfoto";
import {
  spelplezierAan, plezierInstellingen, BADGES, BLIKSEM_SEC, ONFIRE_REEKS, TAAI_GERAAKT, VAL_AFSTAND_PUNT,
  schatSlot, radVakken, RAD_ITEMS, radHalverwege, goudenStatus, type BadgeSoort,
} from "@/lib/spelplezier";

type AdminClient = ReturnType<typeof createAdminClient>;
type Route = Record<string, unknown> & { id: string };
type Sessie = { id: string; route_id: string; player_id: string; status?: string; score?: number };

// 🎉 Spelplezier op de server (migratie 007), met de instellingen per route (migratie 008, lib/spelplezier.ts).
// Zonder migratie geven de tabellen een fout: dan gebeurt er niets.

const willekeurig = <T,>(lijst: readonly T[]): T => lijst[Math.floor(Math.random() * lijst.length)];
const haalRoute = async (admin: AdminClient, routeId: string) =>
  (await admin.from("routes").select("*").eq("id", routeId).maybeSingle()).data as Route | null;

// Is dit spel van een 🧪 testteam? (test en echt raken elkaar nooit)
async function isTest(admin: AdminClient, sessieId: string): Promise<boolean> {
  const { data } = await admin.from("player_sessions").select("players!inner(*)").eq("id", sessieId).maybeSingle();
  return !!testRol(data?.players);
}

// Teamnaam bij een spel
async function teamNaam(admin: AdminClient, sessieId: string): Promise<string> {
  const { data } = await admin.from("player_sessions").select("players!inner(nickname, login_name)").eq("id", sessieId).maybeSingle();
  const p = data?.players as unknown as { nickname: string | null; login_name: string } | undefined;
  return p?.nickname ?? p?.login_name ?? "een team";
}

// 🎁 Een item in de balk van dit team (alsof het net is opgepakt). Als startitem: Opruimen haalt het weg.
export async function geefItem(admin: AdminClient, sessie: { id: string; route_id: string }, type: string): Promise<boolean> {
  const { error } = await admin.from("special_items").insert({
    route_id: sessie.route_id, type, name: `Bonus ${type}`, latitude: 0, longitude: 0, points_effect: 0,
    claimed: true, claimed_by_session_id: sessie.id, claimed_at: new Date().toISOString(), is_startitem: true,
  });
  return !error;
}

// 🎖️ Een badge geven (als de route badges aan heeft en deze badge niet uit staat); dubbel geven doet niets.
// Is de badge nieuw en staan er punten per badge ingesteld, dan komen die erbij.
export async function geefBadge(admin: AdminClient, sessieId: string, soort: BadgeSoort, route?: Route | null): Promise<void> {
  let r = route;
  if (r === undefined) {
    const { data: s } = await admin.from("player_sessions").select("route_id").eq("id", sessieId).maybeSingle();
    r = s ? await haalRoute(admin, s.route_id) : null;
  }
  const inst = plezierInstellingen(r).badges;
  if (!spelplezierAan(r).badges || !(soort in BADGES) || inst.uit.includes(soort)) return;
  const { data } = await admin.from("badges").upsert({ sessie_id: sessieId, soort }, { onConflict: "sessie_id,soort", ignoreDuplicates: true }).select("id");
  if (data?.length && inst.punten > 0) await telBijScore(admin, sessieId, inst.punten).catch(() => undefined);
}

// 🛡️ Na een item op dit team: drie keer geraakt = badge
export async function naGeraakt(admin: AdminClient, doelSessie: string): Promise<void> {
  const { count } = await admin.from("item_log").select("id", { count: "exact", head: true })
    .eq("doel_session_id", doelSessie).not("gebruiker_session_id", "is", null).neq("gebruiker_session_id", doelSessie);
  if ((count ?? 0) >= TAAI_GERAAKT) await geefBadge(admin, doelSessie, "taai");
}

// 🚩 Punt bereikt: als eerste (van hetzelfde soort spel) bij dit punt = badge
export async function naBereikt(admin: AdminClient, sessie: Sessie, puntId: string, route: Route | null): Promise<void> {
  if (!spelplezierAan(route).badges) return;
  const { data } = await admin.from("player_point_progress").select("session_id, player_sessions!inner(route_id, players!inner(*))")
    .eq("route_point_id", puntId).neq("session_id", sessie.id);
  const ikTest = await isTest(admin, sessie.id);
  const eerder = (data ?? []).some((r) => {
    const s = r.player_sessions as unknown as { players: unknown } | null;
    return !!testRol(s?.players) === ikTest;
  });
  if (!eerder) await geefBadge(admin, sessie.id, "pionier", route);
}

// ⏰🔥⚡ Na een antwoord op een gewone vraag (geen foto, geen stemvraag): de reeks bijwerken (elke X op rij een
// item of punten) en de badges die bij antwoorden horen. Geeft terug wat de speler meteen ziet.
export async function naAntwoord(admin: AdminClient, p: { sessie: Sessie; route: Route | null; goed: boolean; reachedAt: string | null; gouden: boolean })
  : Promise<{ reeks: number | null; reeks_item: string | null; reeks_punten: number | null; reeks_lengte: number }> {
  const aan = spelplezierAan(p.route);
  const inst = plezierInstellingen(p.route).reeks;
  let reeks: number | null = null, reeksItem: string | null = null, reeksPunten: number | null = null;
  if (aan.reeks || aan.badges) {
    const { data, error } = await admin.from("player_sessions").select("reeks").eq("id", p.sessie.id).maybeSingle();
    if (!error && data) {
      const nieuw = p.goed ? (data.reeks ?? 0) + 1 : 0;
      reeks = nieuw;
      await admin.from("player_sessions").update({ reeks: nieuw }).eq("id", p.sessie.id);
      if (aan.reeks && p.goed && nieuw % inst.lengte === 0) {
        if (inst.beloning === "punten") {
          await telBijScore(admin, p.sessie.id, inst.punten).catch(() => undefined);
          reeksPunten = inst.punten;
        } else {
          const type = willekeurig(inst.items);
          if (await geefItem(admin, p.sessie, type)) reeksItem = type;
        }
      }
    }
  }
  if (aan.badges && p.goed) {
    if (reeks !== null && reeks >= ONFIRE_REEKS) await geefBadge(admin, p.sessie.id, "onfire", p.route);
    if (p.reachedAt && Date.now() - Date.parse(p.reachedAt) <= BLIKSEM_SEC * 1000) await geefBadge(admin, p.sessie.id, "bliksem", p.route);
    if (p.gouden) await geefBadge(admin, p.sessie.id, "gouden", p.route);
  }
  return { reeks: aan.reeks ? reeks : null, reeks_item: reeksItem, reeks_punten: reeksPunten, reeks_lengte: inst.lengte };
}

// ── 🪤 Val ──────────────────────────────────────────────────────────────────

// Een bom uit de balk als val op de eigen plek neerleggen
export async function plaatsVal(admin: AdminClient, sessie: Sessie, itemId: string, lat: number, lng: number)
  : Promise<{ ok: true; minuten: number } | { ok: false; fout: string; status: number }> {
  const route = await haalRoute(admin, sessie.route_id);
  if (!spelplezierAan(route).val) return { ok: false, fout: "Vallen staan uit bij deze route", status: 400 };
  const inst = plezierInstellingen(route).val;
  const nu = new Date().toISOString();
  const { data: open, error: valFout } = await admin.from("vallen").select("id").eq("sessie_id", sessie.id).is("geraakt_op", null).gt("verloopt_op", nu);
  if (valFout) return { ok: false, fout: "Draai eerst migratie 007 (spelplezier) in Supabase", status: 500 };
  if ((open?.length ?? 0) >= inst.max) return { ok: false, fout: inst.max === 1 ? "Jullie hebben al een val liggen: één tegelijk" : `Jullie hebben al ${inst.max} vallen liggen`, status: 409 };
  const { data: punten } = await admin.from("route_points").select("latitude, longitude").eq("route_id", sessie.route_id);
  if ((punten ?? []).some((p) => haversine(lat, lng, p.latitude, p.longitude) < VAL_AFSTAND_PUNT)) {
    return { ok: false, fout: `Te dicht bij een punt: loop eerst ${VAL_AFSTAND_PUNT} meter verder`, status: 400 };
  }
  // De bom atomair opgebruiken: alleen als hij van dit team is en nog niet gebruikt
  const { data: weg } = await admin.from("special_items").update({ used_at: nu })
    .eq("id", itemId).eq("claimed_by_session_id", sessie.id).eq("type", "bom").is("used_at", null).select("id");
  if (!weg?.length) return { ok: false, fout: "Deze bom is al gebruikt", status: 409 };
  const { error } = await admin.from("vallen").insert({
    route_id: sessie.route_id, sessie_id: sessie.id, item_id: itemId, latitude: lat, longitude: lng,
    punten: Math.max(1, inst.punten ?? Number(route?.bom_waarde ?? 30)), verloopt_op: new Date(Date.now() + inst.minuten * 60_000).toISOString(),
  });
  if (error) {
    await admin.from("special_items").update({ used_at: null }).eq("id", itemId);
    return { ok: false, fout: "Val zetten lukte niet, probeer het opnieuw", status: 500 };
  }
  return { ok: true, minuten: inst.minuten };
}

// Loopt dit team in een val van een ander team? (bij elke plek die de app doorgeeft)
async function checkVallen(admin: AdminClient, sessie: Sessie, lat: number, lng: number, route: Route | null): Promise<void> {
  const inst = plezierInstellingen(route).val;
  const { data: vallen } = await admin.from("vallen").select("*").eq("route_id", sessie.route_id).is("geraakt_op", null)
    .gt("verloopt_op", new Date().toISOString()).neq("sessie_id", sessie.id);
  const raak = (vallen ?? []).filter((v) => haversine(lat, lng, v.latitude, v.longitude) <= inst.meter);
  if (!raak.length) return;
  const ikTest = await isTest(admin, sessie.id);
  for (const v of raak) {
    if ((await isTest(admin, v.sessie_id)) !== ikTest) continue;
    const { data: gezet } = await admin.from("vallen").update({ geraakt_sessie: sessie.id, geraakt_op: new Date().toISOString() })
      .eq("id", v.id).is("geraakt_op", null).select("id");
    if (!gezet?.length) continue;
    const [zetter, ik] = await Promise.all([teamNaam(admin, v.sessie_id), teamNaam(admin, sessie.id)]);
    // De punten gaan eraf; staat "zetter krijgt de punten" aan, dan gaan ze naar het team dat de val zette
    if (inst.zetterKrijgt) await boekScoreOver(admin, sessie.id, v.sessie_id, v.punten).catch(() => undefined);
    else await telBijScore(admin, sessie.id, -v.punten).catch(() => undefined);
    // Melding via de gewone itemmeldingen (zelfde scherm als een bom)
    if (v.item_id) {
      await admin.from("special_item_effects").upsert({
        special_item_id: v.item_id, target_session_id: sessie.id, effect_type: "punt_aftrek", expires_at: null,
        applied_at: new Date().toISOString(), notification: `🪤 In de val van team ${zetter} gelopen! Jullie verliezen ${v.punten} punten.`,
      }, { onConflict: "special_item_id,target_session_id" }).then(() => undefined, () => undefined);
    }
    await logItem(admin, { gebruiker: v.sessie_id, doel: sessie.id, type: "bom", omschrijving: `val: ${ik} liep in de val van ${zetter}`, plek: { lat: v.latitude, lng: v.longitude } });
    await geefBadge(admin, v.sessie_id, "sluw", route);
    await naGeraakt(admin, sessie.id);
    return; // één val per keer
  }
}

// ── 📦 Vliegende schat ──────────────────────────────────────────────────────

// De schat van dit tijdblok (maakt hem als hij er nog niet is). null = geen plek gevonden.
async function schatNu(admin: AdminClient, route: Route, test: boolean, minuten: number): Promise<{ id: string; latitude: number; longitude: number; gepakt_door: string | null } | null> {
  const slot = schatSlot(Date.now(), minuten);
  const { data: bestaand } = await admin.from("schatten").select("*").eq("route_id", route.id).eq("slot", slot).eq("test", test).maybeSingle();
  if (bestaand) return bestaand;
  // Nieuwe plek: 30 tot 90 meter van een willekeurig punt (niet de finish), nooit in een verboden gebied
  const { data: punten } = await admin.from("route_points").select("latitude, longitude, type").eq("route_id", route.id);
  const kandidaten = (punten ?? []).filter((p) => p.type !== "eindpunt");
  const verboden = (route.verboden_gebieden as { punten: [number, number][] }[] | null) ?? [];
  for (let poging = 0; poging < 12 && kandidaten.length; poging++) {
    const basis = willekeurig(kandidaten);
    const afstand = 30 + Math.random() * 60, hoek = Math.random() * 2 * Math.PI;
    const lat = basis.latitude + (afstand * Math.cos(hoek)) / 111_320;
    const lng = basis.longitude + (afstand * Math.sin(hoek)) / (111_320 * Math.cos((basis.latitude * Math.PI) / 180));
    if (verboden.some((g) => binnenVlak(lat, lng, g.punten))) continue;
    await admin.from("schatten").insert({ route_id: route.id, slot, test, latitude: lat, longitude: lng }).then(() => undefined, () => undefined);
    const { data } = await admin.from("schatten").select("*").eq("route_id", route.id).eq("slot", slot).eq("test", test).maybeSingle();
    return data ?? null;
  }
  return null;
}

// ── 🎰 Rad van fortuin ──────────────────────────────────────────────────────

async function radMag(admin: AdminClient, sessie: Sessie & { rad_gedraaid_op?: string | null }, moment: number): Promise<boolean> {
  if (sessie.status !== "actief" || sessie.rad_gedraaid_op) return false;
  const [{ count: totaal }, { count: afgerond }] = await Promise.all([
    admin.from("route_points").select("id", { count: "exact", head: true }).eq("route_id", sessie.route_id),
    admin.from("player_point_progress").select("id", { count: "exact", head: true }).eq("session_id", sessie.id).not("answered_at", "is", null),
  ]);
  return radHalverwege(afgerond ?? 0, totaal ?? 0, moment);
}

export async function draaiRad(admin: AdminClient, sessie: Sessie & { rad_gedraaid_op?: string | null })
  : Promise<{ ok: true; vak: number; tekst: string; item: string | null } | { ok: false; fout: string }> {
  const route = await haalRoute(admin, sessie.route_id);
  if (!spelplezierAan(route).rad) return { ok: false, fout: "Het rad staat uit bij deze route" };
  const inst = plezierInstellingen(route).rad;
  if (!(await radMag(admin, sessie, inst.moment))) return { ok: false, fout: "Het rad kun je nog niet draaien, of jullie hebben al gedraaid" };
  const vakken = radVakken(inst);
  const vak = Math.floor(Math.random() * vakken.length);
  const v = vakken[vak];
  // Eén keer per spel: alleen het verzoek dat het moment zelf zet, draait echt
  const { data: gezet } = await admin.from("player_sessions").update({ rad_gedraaid_op: new Date().toISOString(), rad_uitkomst: v.id })
    .eq("id", sessie.id).is("rad_gedraaid_op", null).select("id");
  if (!gezet?.length) return { ok: false, fout: "Jullie hebben al gedraaid" };
  let item: string | null = null, tekst = "Helaas, niets deze keer 😴";
  if (v.punten) {
    await telBijScore(admin, sessie.id, v.punten).catch(() => undefined);
    tekst = v.punten > 0 ? `${v.punten} punten erbij!` : `Pech: ${-v.punten} punten eraf`;
    if (v.punten >= inst.hoofdprijs) await geefBadge(admin, sessie.id, "geluk", route);
  } else if (v.item) {
    item = willekeurig(RAD_ITEMS);
    if (await geefItem(admin, sessie, item)) tekst = "Een item voor in de balk!";
    else item = null;
  }
  return { ok: true, vak, tekst, item };
}

// ── 📸 Fotobattle ──────────────────────────────────────────────────────────

// De finishfoto's van de andere teams (zelfde soort spel) waarop dit team kan stemmen, de eigen stem en de prijs
export async function fotobattle(admin: AdminClient, sessie: Sessie) {
  const route = await haalRoute(admin, sessie.route_id);
  if (!spelplezierAan(route).fotobattle || route?.uitslag_vrijgegeven) return { aan: false as const };
  const inst = plezierInstellingen(route).fotobattle;
  const { data: spellen } = await admin.from("player_sessions").select("id, players!inner(*)").eq("route_id", sessie.route_id).in("status", ["actief", "voltooid"]);
  const ikTest = await isTest(admin, sessie.id);
  const teams = (spellen ?? []).filter((s) => s.id !== sessie.id && !!testRol(s.players) === ikTest);
  const fotos = await teamFotos(admin, sessie.route_id, teams.map((t) => t.id));
  const { data: stem } = await admin.from("fotobattle_stemmen").select("foto_sessie").eq("route_id", sessie.route_id).eq("kiezer_sessie", sessie.id).maybeSingle();
  return {
    aan: true as const,
    fotos: teams.filter((t) => fotos.has(t.id)).map((t) => {
      const p = t.players as unknown as { nickname: string | null; login_name: string; icon: string | null };
      return { sessie_id: t.id, naam: p.nickname ?? p.login_name, icon: p.icon, url: fotos.get(t.id)! };
    }),
    mijn_stem: stem?.foto_sessie ?? null,
    punten: inst.punten,
    prijs: inst.prijs || null,
  };
}

export async function stemFoto(admin: AdminClient, sessie: Sessie, fotoSessie: string): Promise<string | null> {
  const fb = await fotobattle(admin, sessie);
  if (!fb.aan) return "De fotobattle is voorbij";
  if (!fb.fotos.some((f) => f.sessie_id === fotoSessie)) return "Op deze foto kun je niet stemmen";
  const { error } = await admin.from("fotobattle_stemmen")
    .upsert({ route_id: sessie.route_id, kiezer_sessie: sessie.id, foto_sessie: fotoSessie, created_at: new Date().toISOString() }, { onConflict: "route_id,kiezer_sessie" });
  return error ? "Stemmen lukte niet, probeer het opnieuw" : null;
}

// Bij het vrijgeven van de uitslag: de winnaar van de fotobattle krijgt de ingestelde punten (één keer per spel,
// ook als de uitslag vaker wordt vrijgegeven). Echte teams en testteams hebben elk hun eigen winnaar.
export async function keerFotobattleUit(admin: AdminClient, routeId: string): Promise<void> {
  const route = await haalRoute(admin, routeId);
  const inst = plezierInstellingen(route).fotobattle;
  if (!route || !spelplezierAan(route).fotobattle || inst.punten <= 0) return;
  const { data: gezet } = await admin.from("routes").update({ fotobattle_uitgekeerd_op: new Date().toISOString() })
    .eq("id", routeId).is("fotobattle_uitgekeerd_op", null).select("id");
  if (!gezet?.length) return;
  const { data: stemmen } = await admin.from("fotobattle_stemmen").select("foto_sessie, player_sessions!fotobattle_stemmen_foto_sessie_fkey(players!inner(*))").eq("route_id", routeId);
  const tellen = new Map<string, { test: boolean; n: number }>();
  for (const s of stemmen ?? []) {
    const ps = s.player_sessions as unknown as { players: unknown } | null;
    const oud = tellen.get(s.foto_sessie) ?? { test: !!testRol(ps?.players), n: 0 };
    tellen.set(s.foto_sessie, { ...oud, n: oud.n + 1 });
  }
  for (const test of [false, true]) {
    const lijst = [...tellen.entries()].filter(([, t]) => t.test === test).sort((a, b) => b[1].n - a[1].n);
    // Gelijkspel om de eerste plek: geen winnaar (net als bij de prijstitel)
    if (!lijst.length || (lijst[1] && lijst[1][1].n === lijst[0][1].n)) continue;
    await telBijScore(admin, lijst[0][0], inst.punten).catch(() => undefined);
  }
}

// ── Alles voor de app (elke 5 seconden, met de eigen plek) ─────────────────

export async function spelplezierVoorSpeler(admin: AdminClient, sessie: Sessie & { rad_gedraaid_op?: string | null }, plek: { lat: number; lng: number; nauwkeurig: number } | null) {
  const route = await haalRoute(admin, sessie.route_id);
  const aan = spelplezierAan(route);
  const inst = plezierInstellingen(route);
  const leeg = {
    aan, gouden_tot: null as string | null, gouden_factor: inst.gouden.factor, badges: [] as { soort: string; created_at: string }[],
    rad: false, rad_vakken: radVakken(inst.rad), rad_moment: inst.rad.moment,
    schat: null as { id: string; lat: number; lng: number; tot: string } | null, schat_gepakt: null as { item: string | null; punten: number } | null,
    vallen: [] as { lat: number; lng: number; tot: string }[], val_geraakt: [] as { id: string; door: string; punten: number }[],
  };
  if (!route) return leeg;
  const gouden = goudenStatus(route);
  const uit = { ...leeg, gouden_tot: gouden?.tot ?? null };
  const speelt = sessie.status === "actief" && !route.gepauzeerd_sinds && !route.uitslag_vrijgegeven;

  if (aan.val && speelt && plek) await checkVallen(admin, sessie, plek.lat, plek.lng, route).catch(() => undefined);

  if (aan.schat && speelt) {
    const test = await isTest(admin, sessie.id);
    const s = await schatNu(admin, route, test, inst.schat.minuten).catch(() => null);
    if (s && !s.gepakt_door) {
      // Binnen bereik: meteen pakken (alleen het eerste verzoek krijgt hem)
      if (plek && haversine(plek.lat, plek.lng, s.latitude, s.longitude) <= inst.schat.meter + Math.min(plek.nauwkeurig, 20)) {
        const metItem = inst.schat.beloning !== "punten", metPunten = inst.schat.beloning !== "item";
        const type = metItem ? willekeurig(inst.schat.items) : null;
        const { data: gepakt } = await admin.from("schatten").update({ gepakt_door: sessie.id, gepakt_op: new Date().toISOString(), item_type: type })
          .eq("id", s.id).is("gepakt_door", null).select("id");
        if (gepakt?.length) {
          const kreegItem = type ? await geefItem(admin, sessie, type) : false;
          if (metPunten) await telBijScore(admin, sessie.id, inst.schat.punten).catch(() => undefined);
          uit.schat_gepakt = { item: kreegItem ? type : null, punten: metPunten ? inst.schat.punten : 0 };
          await logItem(admin, { gebruiker: sessie.id, doel: null, type: type ?? "ster", omschrijving: "schat", plek: { lat: s.latitude, lng: s.longitude } });
          await geefBadge(admin, sessie.id, "schat", route);
        }
      } else {
        uit.schat = { id: s.id, lat: s.latitude, lng: s.longitude, tot: new Date((schatSlot(Date.now(), inst.schat.minuten) + 1) * inst.schat.minuten * 60_000).toISOString() };
      }
    }
  }

  const nu = new Date().toISOString();
  const [{ data: badges }, { data: mijnVallen }] = await Promise.all([
    aan.badges ? admin.from("badges").select("soort, created_at").eq("sessie_id", sessie.id).order("created_at") : Promise.resolve({ data: [] }),
    aan.val ? admin.from("vallen").select("*").eq("sessie_id", sessie.id).order("gezet_op", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
  ]);
  uit.badges = (badges ?? []) as { soort: string; created_at: string }[];
  type ValRij = { id: string; latitude: number; longitude: number; verloopt_op: string; geraakt_op: string | null; geraakt_sessie: string | null; punten: number };
  const vallen = (mijnVallen ?? []) as ValRij[];
  uit.vallen = vallen.filter((v) => !v.geraakt_op && v.verloopt_op > nu).map((v) => ({ lat: v.latitude, lng: v.longitude, tot: v.verloopt_op }));
  uit.val_geraakt = await Promise.all(vallen.filter((v) => v.geraakt_op && v.geraakt_sessie && Date.now() - Date.parse(v.geraakt_op) < 15 * 60_000)
    .map(async (v) => ({ id: v.id, door: await teamNaam(admin, v.geraakt_sessie!), punten: v.punten })));
  if (aan.rad && speelt) uit.rad = await radMag(admin, sessie, inst.rad.moment).catch(() => false);
  return uit;
}

// 🧹 Opruimen: de schatten, het gouden kwartier en de uitbetaalde fotobattle van de route weg (vallen, badges en
// stemmen gaan met de spellen mee)
export async function ruimSpelplezierOp(admin: AdminClient): Promise<void> {
  await admin.from("schatten").delete().not("id", "is", null).then(() => undefined, () => undefined);
  await admin.from("routes").update({ gouden_tot: null }).not("id", "is", null).then(() => undefined, () => undefined);
  await admin.from("routes").update({ fotobattle_uitgekeerd_op: null }).not("id", "is", null).then(() => undefined, () => undefined);
}
