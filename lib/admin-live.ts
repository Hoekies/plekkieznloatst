import { createAdminClient } from "@/lib/supabase-admin";
import type { SpeciaalItem } from "@/types/database";
import { rondAfAlsTijdVoorbij } from "@/lib/eindtijd";
import { huisLogoUrl } from "@/lib/huisstijl";
import { puzzelRegels } from "@/lib/puzzel-server";
import { puzzelVolgorde, lettersVoor } from "@/lib/puzzel";
import { testRol } from "@/lib/testteam";
import { raadVenster, RAAD_WACHT_MIN } from "@/lib/puzzel-server";

export type SpelerOverzicht = {
  player_id: string;
  login_name: string;
  nickname: string | null;
  // Gekozen teamnaam, of de loginnaam zolang het team nog geen naam heeft gekozen
  display_name: string;
  // Door het team gekozen icoon (emoji)
  icon: string | null;
  // Telefoonnummer van het team (migratie 009), voor bellen en WhatsApp
  telefoon?: string | null;
  // Heeft de groep nu een telefoon gekoppeld (= ingelogd)?
  ingelogd: boolean;
  // Uitgeschakeld door de beheerder: kan niet inloggen en telt niet mee in het stappenplan
  uitgeschakeld?: boolean;
  sessie_id: string | null;
  sessie_status: "geen_sessie" | "actief" | "voltooid" | "vervallen";
  started_at: string | null;
  finished_at: string | null;
  score: number;
  afstand_m: number;
  bezochte_punten: number;
  huidig_punt_naam: string | null;
  laatste_gezien: string | null;
  laatste_lat: number | null;
  laatste_lng: number | null;
  // Openstaande melding "volgende punt niet bereikbaar"
  hulp: { id: string; punt_naam: string | null; sinds: string } | null;
  // Itemtypes die het team nog in de balk heeft, en die het al heeft ingezet
  items: { in_balk: string[]; ingezet: string[] };
  // Plek van het punt waar het team nu heen loopt (voor de lijn op de live kaart)
  volgend_punt?: { lat: number; lng: number } | null;
  volgend_punt_id?: string | null;
  // Punten die het team al heeft afgerond (de kaart kleurt ze groen)
  bezochte_ids?: string[];
  // 🧩 Puzzelwoord (alleen voor het beheer, nooit naar de beamer): het woord en welke letters het team al heeft
  // gok: wat het team na de finish invulde (één poging, binnen een minuut), goed: of dat klopte, raad_tot: einde raadtijd
  puzzel?: { woord: string; open: boolean[]; opgelost: boolean; gok?: string | null; goed?: boolean | null; raad_tot?: string | null } | null;
  // Moet het team nu wachten? Spook (volgende punt verborgen) of plek zooi (staat stil), met eindtijd
  wacht: { effect_id: string; soort: "spook" | "plekzooi"; tot: string } | null;
};

export type RoutePuntKort = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  order_index: number;
};

export type LiveData = {
  // huis_logo: eigen logo van de organisatie (huisstijl van de route)
  route: { id: string; name: string; modus: string; uitslag_vrijgegeven?: boolean; verwacht_aantal_teams?: number; eindtijd?: string | null; gepauzeerd_sinds?: string | null; huis_logo?: string | null } | null;
  route_punten: RoutePuntKort[];
  spelers: SpelerOverzicht[];
  speciale_items: SpeciaalItem[];
  // Ingestuurde foto's die nog gekeurd moeten worden (voor "vraagt je aandacht" op het dashboard)
  wachtende_fotos?: number;
  // Gezet als de sessies niet opgehaald konden worden (bv. een migratie die nog niet gedraaid is)
  fout?: string;
};

export function sessietijd(s: SpelerOverzicht): number {
  if (!s.started_at) return 0;
  const eind = s.finished_at ? new Date(s.finished_at).getTime() : Date.now();
  return Math.floor((eind - new Date(s.started_at).getTime()) / 1000);
}

export async function haalLiveData(): Promise<LiveData> {
  const admin = createAdminClient();

  const [{ data: route }, { data: alleSpelersRuw }] = await Promise.all([
    // "*": ook het logo (migratie 016), zonder dat een ontbrekende kolom het dashboard leeg maakt
    admin.from("routes").select("*").eq("is_active", true).maybeSingle(),
    // "*": een kolom uit een nog niet gedraaide migratie (zoals telefoon) mag het dashboard niet leeg maken
    admin.from("players").select("*").order("login_name"),
  ]);

  // 🧪 De testtegenstander is geen echt team: niet op het dashboard
  const allePlayers = (alleSpelersRuw ?? []).filter((p) => testRol(p) !== "tegenstander");

  // Eindtijd voorbij? Dan eerst de lopende spellen afsluiten, zodat het dashboard meteen de eindstand toont
  const tijd = route ? await rondAfAlsTijdVoorbij(admin, route.id) : null;
  const routeInfo = route ? {
    id: route.id, name: route.name, modus: route.modus, uitslag_vrijgegeven: route.uitslag_vrijgegeven, verwacht_aantal_teams: route.verwacht_aantal_teams,
    eindtijd: tijd?.eindtijd ?? null, gepauzeerd_sinds: tijd?.pauze ?? null, huis_logo: huisLogoUrl(route),
  } : null;

  // Alles wat alleen van de route afhangt tegelijk ophalen (scheelt rondjes naar de database)
  const playerIds = (allePlayers ?? []).map((p) => p.id);
  // Startitems liggen niet op de kaart; sequentieel heeft alleen plek zooi op de kaart
  let itemQuery = route
    ? admin.from("special_items").select("*").eq("route_id", route.id).eq("is_startitem", false)
    : null;
  if (itemQuery && route?.modus === "sequentieel") itemQuery = itemQuery.eq("type", "plekzooi");
  const [itemsRes, puntenRes, sessiesResult] = await Promise.all([
    itemQuery ? itemQuery.order("created_at") : Promise.resolve(null),
    route
      ? admin.from("route_points").select("id, name, latitude, longitude, type, order_index").eq("route_id", route.id).order("order_index")
      : Promise.resolve(null),
    route && playerIds.length
      ? admin
          .from("player_sessions")
          // "*" i.p.v. losse kolommen: een kolom uit een nog niet gedraaide migratie (zoals afstand_m)
          // mag nooit het hele dashboard leeg maken
          .select("*")
          .eq("route_id", route.id)
          .in("player_id", playerIds)
      : Promise.resolve(null),
  ]);
  const specialeItems = (itemsRes?.data ?? []) as SpeciaalItem[];
  const routePunten: RoutePuntKort[] = puntenRes?.data ?? [];

  if (!allePlayers?.length) {
    return { route: routeInfo, route_punten: routePunten, spelers: [], speciale_items: specialeItems };
  }

  const sessies = sessiesResult?.data ?? [];
  const fout = sessiesResult?.error ? `Sessies konden niet geladen worden: ${sessiesResult.error.message}` : undefined;

  // Eén sessie per speler. Heeft een speler er meer (bv. een gestopt spel en een nieuw spel), dan telt
  // de lopende, dan de gefinishte; een vervallen sessie alleen als er niets anders is.
  const voorrang = (st: string) => (st === "actief" ? 0 : st === "voltooid" ? 1 : 2);
  const sessieMap = new Map<string, (typeof sessies)[number]>();
  for (const s of sessies) {
    const huidig = sessieMap.get(s.player_id);
    if (!huidig || voorrang(s.status) < voorrang(huidig.status)) sessieMap.set(s.player_id, s);
  }
  const sessieIds = (sessies).map((s) => s.id);

  const huidigePointIds = [...new Set(
    (sessies).filter((s) => s.current_point_id).map((s) => s.current_point_id as string)
  )];
  // Alles per sessie tegelijk ophalen
  const leeg = Promise.resolve({ data: null });
  const [ptsRes, progRes, locsRes, hulpRes, teamItemsRes, fotoRes, wachtRes, spoRes] = await Promise.all([
    huidigePointIds.length ? admin.from("route_points").select("id, name").in("id", huidigePointIds) : leeg,
    sessieIds.length
      ? admin.from("player_point_progress").select("session_id, route_point_id, is_correct").in("session_id", sessieIds).not("answered_at", "is", null)
      : leeg,
    // Laatste locatie per sessie apart opvragen: één gezamenlijke "nieuwste N" miste juist de speler
    // die al een tijdje niets stuurde (en die wil je op het dashboard zien als "niet gezien")
    Promise.all(sessieIds.map((id) =>
      admin.from("location_updates").select("session_id, latitude, longitude, created_at")
        .eq("session_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    )).then((rijen) => ({ data: rijen.map((r) => r.data).filter(Boolean) })),
    sessieIds.length
      ? admin.from("hulpverzoeken").select("id, session_id, created_at, route_points(name)").in("session_id", sessieIds).eq("status", "open")
      : leeg,
    // Items per team: opgepakt (of startitem) en nog niet gebruikt = in de balk
    sessieIds.length
      ? admin.from("special_items").select("type, used_at, claimed_by_session_id").in("claimed_by_session_id", sessieIds)
      : leeg,
    // Alleen het aantal: foto's die op keuring wachten
    sessieIds.length
      ? admin.from("foto_inzendingen").select("id", { count: "exact", head: true }).in("session_id", sessieIds).eq("status", "wacht")
      : Promise.resolve({ count: 0 }),
    // Lopende spook- en plek-zooi-effecten
    sessieIds.length
      ? admin.from("special_item_effects").select("id, target_session_id, effect_type, expires_at")
          .in("target_session_id", sessieIds).in("effect_type", ["ghost", "plekzooi"]).gt("expires_at", new Date().toISOString())
      : leeg,
    // De eigen volgorde per team (rondje, banaan): daaruit volgt het volgende punt
    sessieIds.length
      ? admin.from("session_point_order").select("session_id, volgorde, route_point_id").in("session_id", sessieIds).order("volgorde")
      : leeg,
  ]);

  // Het volgende punt van een team: het eerste punt in de eigen volgorde dat nog niet is afgerond (een punt
  // met een open vraag telt dus nog als doel). Zonder eigen volgorde: de routevolgorde. Niet current_point_id:
  // dat is het laatst bereikte punt, en daar wees de lijn dan terug naar.
  const volgordeMap = new Map<string, string[]>();
  ((spoRes.data ?? []) as { session_id: string; route_point_id: string }[]).forEach((r) => {
    volgordeMap.set(r.session_id, [...(volgordeMap.get(r.session_id) ?? []), r.route_point_id]);
  });

  const volgendPuntId = (sessie: { id: string; status: string } | null | undefined): string | null => {
    if (sessie?.status !== "actief") return null;
    const klaar = new Set(bezochtMap.get(sessie.id) ?? []);
    const volgorde = volgordeMap.get(sessie.id) ?? routePunten.map((p) => p.id);
    return volgorde.find((id) => !klaar.has(id)) ?? null;
  };

  const puntNaam = new Map<string, string>();
  ((ptsRes.data ?? []) as { id: string; name: string }[]).forEach((p) => puntNaam.set(p.id, p.name));

  const progressMap = new Map<string, number>();
  const bezochtMap = new Map<string, string[]>();
  ((progRes.data ?? []) as { session_id: string; route_point_id: string }[]).forEach((p) => {
    progressMap.set(p.session_id, (progressMap.get(p.session_id) ?? 0) + 1);
    bezochtMap.set(p.session_id, [...(bezochtMap.get(p.session_id) ?? []), p.route_point_id]);
  });

  // 🧩 Puzzelwoord: per team de gevonden letters (goed beantwoorde vragen, met de letters per vraag)
  const regels = puzzelRegels(route);
  const puzzelMap = new Map<string, NonNullable<SpelerOverzicht["puzzel"]>>();
  if (regels && routePunten.length) {
    const { data: metVraag } = await admin.from("questions").select("route_point_id").in("route_point_id", routePunten.map((p) => p.id));
    const vraagPunten = new Set((metVraag ?? []).map((v) => v.route_point_id as string));
    const gevonden = new Map<string, number>();
    ((progRes.data ?? []) as { session_id: string; route_point_id: string; is_correct: boolean | null }[]).forEach((p) => {
      if (p.is_correct && vraagPunten.has(p.route_point_id)) gevonden.set(p.session_id, (gevonden.get(p.session_id) ?? 0) + lettersVoor(regels.verdeling, p.route_point_id));
    });
    for (const s of sessies) {
      const r = s as { puzzel_opgelost?: boolean; puzzel_gok?: string | null; puzzel_gok_goed?: boolean | null; finished_at?: string | null; puzzel_raad_start?: string | null };
      // Raadtijd: na "Start" een minuut (migratie 024); nog niet gestart = tot 30 min na de finish kan het nog
      const venster = raadVenster(r);
      const raadTot = venster.tot ?? (venster.kanStarten && r.finished_at ? Date.parse(r.finished_at) + RAAD_WACHT_MIN * 60000 : null);
      const open = new Set(puzzelVolgorde(s.id, regels.woord.length, regels.opVolgorde).slice(0, gevonden.get(s.id) ?? 0));
      puzzelMap.set(s.id, {
        woord: regels.woord, open: regels.woord.split("").map((_, i) => open.has(i)), opgelost: !!r.puzzel_opgelost,
        gok: r.puzzel_gok ?? null, goed: r.puzzel_gok_goed ?? null,
        raad_tot: s.status === "voltooid" && raadTot ? new Date(raadTot).toISOString() : null,
      });
    }
  }

  const locatieMap = new Map<string, { lat: number; lng: number; created_at: string }>();
  const gezien = new Set<string>();
  ((locsRes.data ?? []) as { session_id: string; latitude: number; longitude: number; created_at: string }[]).forEach((l) => {
    if (!gezien.has(l.session_id)) {
      gezien.add(l.session_id);
      locatieMap.set(l.session_id, { lat: l.latitude, lng: l.longitude, created_at: l.created_at });
    }
  });

  const hulpMap = new Map<string, SpelerOverzicht["hulp"]>();
  ((hulpRes.data ?? []) as { id: string; session_id: string; created_at: string; route_points: unknown }[]).forEach((h) => {
    const punt = h.route_points as { name?: string } | { name?: string }[] | null;
    const naam = Array.isArray(punt) ? punt[0]?.name : punt?.name;
    hulpMap.set(h.session_id, { id: h.id, punt_naam: naam ?? null, sinds: h.created_at });
  });

  // Per sessie het effect dat het langst duurt
  const wachtMap = new Map<string, NonNullable<SpelerOverzicht["wacht"]>>();
  ((wachtRes.data ?? []) as { id: string; target_session_id: string; effect_type: string; expires_at: string }[]).forEach((e) => {
    const huidig = wachtMap.get(e.target_session_id);
    if (!huidig || e.expires_at > huidig.tot) {
      wachtMap.set(e.target_session_id, { effect_id: e.id, soort: e.effect_type === "ghost" ? "spook" : "plekzooi", tot: e.expires_at });
    }
  });

  const itemMap = new Map<string, SpelerOverzicht["items"]>();
  ((teamItemsRes.data ?? []) as { type: string; used_at: string | null; claimed_by_session_id: string | null }[]).forEach((i) => {
    if (!i.claimed_by_session_id) return;
    const m = itemMap.get(i.claimed_by_session_id) ?? { in_balk: [], ingezet: [] };
    (i.used_at ? m.ingezet : m.in_balk).push(i.type);
    itemMap.set(i.claimed_by_session_id, m);
  });

  const spelers: SpelerOverzicht[] = allePlayers.map((player) => {
    const sessie = sessieMap.get(player.id);
    const locatie = sessie ? locatieMap.get(sessie.id) : null;
    return {
      player_id: player.id,
      login_name: player.login_name,
      nickname: player.nickname ?? null,
      display_name: player.nickname ?? player.login_name,
      icon: player.icon ?? null,
      telefoon: (player as { telefoon?: string | null }).telefoon ?? null,
      ingelogd: !!player.active_device_id,
      uitgeschakeld: !!player.is_uitgeschakeld,
      sessie_id: sessie?.id ?? null,
      sessie_status: sessie ? (sessie.status as SpelerOverzicht["sessie_status"]) : "geen_sessie",
      started_at: sessie?.started_at ?? null,
      finished_at: sessie?.finished_at ?? null,
      score: sessie?.score ?? 0,
      afstand_m: sessie?.afstand_m ?? 0,
      bezochte_punten: sessie ? (progressMap.get(sessie.id) ?? 0) : 0,
      huidig_punt_naam: sessie?.current_point_id ? (puntNaam.get(sessie.current_point_id) ?? null) : null,
      laatste_gezien: locatie?.created_at ?? null,
      laatste_lat: locatie?.lat ?? null,
      laatste_lng: locatie?.lng ?? null,
      hulp: sessie ? (hulpMap.get(sessie.id) ?? null) : null,
      items: (sessie ? itemMap.get(sessie.id) : null) ?? { in_balk: [], ingezet: [] },
      wacht: sessie ? (wachtMap.get(sessie.id) ?? null) : null,
      puzzel: sessie ? (puzzelMap.get(sessie.id) ?? null) : null,
      volgend_punt_id: volgendPuntId(sessie),
      bezochte_ids: sessie ? (bezochtMap.get(sessie.id) ?? []) : [],
      volgend_punt: (() => {
        const id = volgendPuntId(sessie);
        const p = id ? routePunten.find((r) => r.id === id) : null;
        return p ? { lat: p.latitude, lng: p.longitude } : null;
      })(),
    };
  });

  return { route: routeInfo, route_punten: routePunten, spelers, speciale_items: specialeItems, wachtende_fotos: fotoRes.count ?? 0, fout };
}
