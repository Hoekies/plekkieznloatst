import type { createAdminClient } from "@/lib/supabase-admin";
import { normaliseerPuzzel, lettersVoor } from "@/lib/puzzel";

type AdminClient = ReturnType<typeof createAdminClient>;

// 🧩 Puzzelwoord op de server: de instellingen van een route en de afrekening bij de finish.
export type PuzzelRegels = { woord: string; omschrijving: string | null; verdeling: Record<string, number>; letterPunten: number; alleBonus: number; raadBonus: number };

export function puzzelRegels(route: unknown): PuzzelRegels | null {
  const r = (route ?? {}) as {
    puzzelwoord?: string | null; puzzel_aan?: boolean | null; puzzel_omschrijving?: string | null; puzzel_verdeling?: Record<string, number> | null;
    puzzel_bonus?: number | null; puzzel_letter_punten?: number | null; puzzel_raad_bonus?: number | null;
  };
  // Uitgezet door de beheerder (migratie 017): geen puzzel, ook al staat er nog een woord
  const woord = r.puzzel_aan === false ? "" : normaliseerPuzzel(r.puzzelwoord);
  if (!woord) return null;
  return {
    woord, omschrijving: r.puzzel_omschrijving ?? null, verdeling: r.puzzel_verdeling ?? {},
    letterPunten: r.puzzel_letter_punten ?? 10, alleBonus: r.puzzel_bonus ?? 100, raadBonus: r.puzzel_raad_bonus ?? 50,
  };
}

// Verdiende letters: per goed beantwoorde vraag 1 (of 0 of 2, zoals de beheerder per vraag koos), nooit meer dan het woord lang is.
// Alleen punten mét een vraag; een infopunt zonder vraag telt niet.
export async function gevondenLetters(admin: AdminClient, sessieId: string, regels: PuzzelRegels): Promise<number> {
  const { data: goed } = await admin.from("player_point_progress").select("route_point_id").eq("session_id", sessieId).eq("is_correct", true);
  const ids = (goed ?? []).map((g) => g.route_point_id);
  if (!ids.length) return 0;
  const { data: metVraag } = await admin.from("questions").select("route_point_id").in("route_point_id", ids);
  return Math.min(regels.woord.length, (metVraag ?? []).reduce((n, v) => n + lettersVoor(regels.verdeling, v.route_point_id), 0));
}

async function geefPunten(admin: AdminClient, sessieId: string, delta: number, reden: string, extra: Record<string, unknown> = {}) {
  const { data: s } = await admin.from("player_sessions").select("score").eq("id", sessieId).maybeSingle();
  if (delta) await admin.from("score_correcties").insert({ session_id: sessieId, delta, reden });
  await admin.from("player_sessions").update({ score: (s?.score ?? 0) + delta, ...extra }).eq("id", sessieId);
}

// Bij de finish (en daarna opnieuw, als er nog letters bijkomen): punten per gevonden letter,
// en de bonus als alle letters gevonden zijn. Alleen voor een gefinishte sessie; nooit dubbel.
export async function rekenPuzzelAf(admin: AdminClient, sessieId: string, route: unknown) {
  const regels = puzzelRegels(route);
  if (!regels) return;
  const { data: sessie } = await admin.from("player_sessions").select("*").eq("id", sessieId).maybeSingle();
  const s = sessie as { status: string; puzzel_letters_betaald?: number; puzzel_opgelost?: boolean } | null;
  if (!s || s.status !== "voltooid" || s.puzzel_letters_betaald === undefined) return;  // migratie 017 nog niet gedraaid
  const gevonden = await gevondenLetters(admin, sessieId, regels);
  const nieuw = gevonden - s.puzzel_letters_betaald;
  if (nieuw > 0) {
    await geefPunten(admin, sessieId, nieuw * regels.letterPunten, `🧩 ${nieuw} ${nieuw === 1 ? "letter" : "letters"} gevonden`, { puzzel_letters_betaald: gevonden });
  }
  if (gevonden >= regels.woord.length && !s.puzzel_opgelost) {
    await geefPunten(admin, sessieId, regels.alleBonus, "🧩 Alle letters gevonden", { puzzel_opgelost: true });
  }
}

// Alle gefinishte teams van een route afrekenen (bij Uitslag vrijgeven)
export async function rekenPuzzelsAf(admin: AdminClient, routeId: string) {
  const { data: route } = await admin.from("routes").select("*").eq("id", routeId).maybeSingle();
  if (!puzzelRegels(route)) return;
  const { data: klaar } = await admin.from("player_sessions").select("id").eq("route_id", routeId).eq("status", "voltooid");
  for (const s of klaar ?? []) await rekenPuzzelAf(admin, s.id, route);
}

// Het team maakt het woord zelf af (bij de finish): goed = de bonus voor afmaken, één keer
export async function raadPuzzel(admin: AdminClient, sessieId: string, regels: PuzzelRegels, gok: string): Promise<boolean> {
  if (normaliseerPuzzel(gok) !== regels.woord) return false;
  const { data: sessie } = await admin.from("player_sessions").select("*").eq("id", sessieId).maybeSingle();
  if (!(sessie as { puzzel_opgelost?: boolean } | null)?.puzzel_opgelost) {
    await geefPunten(admin, sessieId, regels.raadBonus, "🧩 Woord afgemaakt", { puzzel_opgelost: true });
  }
  return true;
}
