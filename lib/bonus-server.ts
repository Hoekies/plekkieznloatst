import type { createAdminClient } from "@/lib/supabase-admin";
import { telBijScore } from "@/lib/score";
import { bonusPunten, bonusOpen, bonusStartMoment, type BonusAntwoord, type BonusVraag } from "@/lib/bonus";
import { testRol } from "@/lib/testteam";

type AdminClient = ReturnType<typeof createAdminClient>;

// Teams die meedoen (bezig of gefinisht) op deze route; hun aantal bepaalt de punten per plek. Het 🧪 testteam
// telt niet mee, behalve als er alleen getest wordt (dan kun je de bonusvraag ook in je eentje proberen).
// De testtegenstander telt nooit mee.
export async function bonusSpellen(admin: AdminClient, routeId: string): Promise<{ id: string; started_at: string | null }[]> {
  const { data } = await admin.from("player_sessions").select("id, started_at, players(*)").eq("route_id", routeId).in("status", ["actief", "voltooid"]);
  const alle = (data ?? []).filter((s) => testRol(s.players) !== "tegenstander");
  const echt = alle.filter((s) => !testRol(s.players));
  return (echt.length ? echt : alle).map((s) => ({ id: s.id, started_at: s.started_at }));
}

// ⚡ Bonusvragen die nu moeten starten (na X minuten speeltijd sinds het eerste team begon): starten voor
// iedereen tegelijk. Niet meer na het vrijgeven van de uitslag. Eén update met "nog niet gestart" als
// voorwaarde, zodat twee verzoeken tegelijk hem niet twee keer starten.
export async function startDueBonus(admin: AdminClient, routeId: string, uitslagVrij: boolean): Promise<void> {
  if (uitslagVrij) return;
  const { data: wachtend } = await admin.from("bonus_vragen").select("*").eq("route_id", routeId).is("gestart_op", null).not("na_minuten", "is", null);
  if (!wachtend?.length) return;
  const lijst = await bonusSpellen(admin, routeId);
  const eerste = lijst.map((s) => s.started_at).filter((t): t is string => !!t).sort()[0] ?? null;
  for (const v of wachtend as BonusVraag[]) {
    const moment = bonusStartMoment(v, eerste);
    if (moment == null || Date.now() < moment) continue;
    await admin.from("bonus_vragen").update({ gestart_op: new Date().toISOString(), aantal_teams: lijst.length })
      .eq("id", v.id).is("gestart_op", null);
  }
}

// Nu starten (knop "Nu sturen" in het beheer)
export async function startBonusNu(admin: AdminClient, bonusId: string, routeId: string): Promise<boolean> {
  const lijst = await bonusSpellen(admin, routeId);
  const { data } = await admin.from("bonus_vragen").update({ gestart_op: new Date().toISOString(), aantal_teams: lijst.length })
    .eq("id", bonusId).is("gestart_op", null).select("id");
  return !!data?.length;
}

// De bonusvraag die nu open staat op deze route (de laatst gestarte), of null
export async function openBonus(admin: AdminClient, routeId: string): Promise<BonusVraag | null> {
  const { data } = await admin.from("bonus_vragen").select("*").eq("route_id", routeId).not("gestart_op", "is", null)
    .order("gestart_op", { ascending: false }).limit(3);
  return ((data ?? []) as BonusVraag[]).find((v) => bonusOpen(v)) ?? null;
}

// Meerkeuze: de plek van dit goede antwoord (volgorde van binnenkomst) en de punten erbij
export async function beloonMeerkeuze(admin: AdminClient, v: BonusVraag, antwoord: BonusAntwoord): Promise<{ plek: number; punten: number }> {
  const { data: goed } = await admin.from("bonus_antwoorden").select("id, beantwoord_op").eq("bonus_id", v.id).eq("is_correct", true)
    .order("beantwoord_op", { ascending: true }).order("id", { ascending: true });
  const plek = Math.max(1, (goed ?? []).findIndex((r) => r.id === antwoord.id) + 1);
  const punten = bonusPunten(v.punten, v.aantal_teams ?? 1, plek);
  await admin.from("bonus_antwoorden").update({ punten }).eq("id", antwoord.id);
  await telBijScore(admin, antwoord.session_id, punten);
  return { plek, punten };
}

// Foto's: na elke keuring de punten van alle goedgekeurde foto's opnieuw uitrekenen op volgorde van
// insturen (niet van keuren), en alleen het verschil bij de score optellen of eraf halen
export async function herrekenFotoBonus(admin: AdminClient, v: BonusVraag): Promise<void> {
  const { data } = await admin.from("bonus_antwoorden").select("*").eq("bonus_id", v.id)
    .order("beantwoord_op", { ascending: true }).order("id", { ascending: true });
  let plek = 0;
  for (const a of (data ?? []) as BonusAntwoord[]) {
    const nieuw = a.foto_status === "goedgekeurd" ? bonusPunten(v.punten, v.aantal_teams ?? 1, ++plek) : 0;
    if (nieuw === a.punten) continue;
    await admin.from("bonus_antwoorden").update({ punten: nieuw }).eq("id", a.id);
    await telBijScore(admin, a.session_id, nieuw - a.punten);
  }
}
