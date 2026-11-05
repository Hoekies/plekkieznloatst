import type { createAdminClient } from "@/lib/supabase-admin";
import { puzzelStand } from "@/lib/puzzel";
import { puzzelRegels, gevondenLetters } from "@/lib/puzzel-server";
import { zichtbareItems, type MeespeelData } from "@/lib/meespelen";

type AdminClient = ReturnType<typeof createAdminClient>;

// Wat een medespeler mag zien. Bewust niet: het volgende punt, vragen en antwoorden, andere teams, de plek van het team
// en het hele puzzelwoord. Alleen lezen: dit verandert niets aan het spel. Geen spel gevonden: null.
export async function meespeelData(admin: AdminClient, sessieId: string): Promise<MeespeelData | null> {
  const { data: sessie } = await admin.from("player_sessions").select("id, player_id, route_id, score, status").eq("id", sessieId).maybeSingle();
  if (!sessie) return null;
  const [{ data: route }, { data: speler }] = await Promise.all([
    // "*": een ontbrekende instellingskolom mag de link niet blokkeren
    admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle(),
    admin.from("players").select("*").eq("id", sessie.player_id).maybeSingle(),
  ]);
  // Teamnaam, nooit de loginnaam: de link kan worden doorgestuurd
  const s = (speler ?? {}) as { nickname?: string | null; display_name?: string | null };
  const team = s.nickname || s.display_name || "dit team";
  const r = (route ?? {}) as { is_active?: boolean; meespeellink?: boolean | null; modus?: string; verboden_gebieden?: { naam: string; punten: [number, number][] }[] | null };

  if (r.meespeellink === false) return { actief: false, team, reden: "uit" };
  if (sessie.status === "voltooid") return { actief: false, team, reden: "klaar" };
  if (sessie.status !== "actief" || !r.is_active) return { actief: false, team, reden: "gestopt" };

  const regels = puzzelRegels(route);
  const [{ data: items }, { data: balk }, gevonden] = await Promise.all([
    admin.from("special_items").select("id, type, latitude, longitude, claimed, is_startitem").eq("route_id", sessie.route_id),
    admin.from("special_items").select("type").eq("claimed_by_session_id", sessie.id).is("used_at", null),
    regels ? gevondenLetters(admin, sessie.id, regels) : Promise.resolve(0),
  ]);
  // Nog niet opgelost: puzzelStand geeft alleen de verdiende letters
  const stand = regels ? puzzelStand(regels.woord, sessie.id, gevonden, false, regels.alleBonus, regels.omschrijving, regels.opVolgorde) : null;

  return {
    actief: true,
    team,
    score: sessie.score ?? 0,
    modus: r.modus ?? "verspreid",
    items: zichtbareItems(items ?? [], r.modus),
    balk: (balk ?? []).map((b) => b.type),
    puzzel: stand ? { letters: stand.letters, omschrijving: stand.omschrijving } : null,
    verboden: r.verboden_gebieden ?? [],
  };
}
