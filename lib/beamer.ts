// 📺 Beamerscherm: een geheime link per actieve route, zonder inloggen te bekijken (tv of beamer).
// De sleutel is af te leiden uit het route-id en de geheime servicesleutel: alleen de server kan hem maken,
// en zodra er een andere route actief is werkt de oude link niet meer.
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";

export async function beamerSleutel(routeId: string): Promise<string> {
  const geheim = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const data = new TextEncoder().encode(`pointrush-beamer:${routeId}:${geheim}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

// Alleen wat op een groot scherm mag: geen loginnamen, telefoonnummers, hulpvragen of wachtende effecten
export function beamerSpelers(spelers: SpelerOverzicht[]): SpelerOverzicht[] {
  return spelers
    .filter((s) => s.sessie_status === "actief" || s.sessie_status === "voltooid")
    .map((s) => ({
      ...s,
      login_name: s.display_name, nickname: s.display_name, telefoon: null, ingelogd: false,
      // Puzzelwoord: wel hoeveel letters (blokjes), nooit welke; het beamerscherm is openbaar
      hulp: null, wacht: null, items: { in_balk: [], ingezet: s.items.ingezet },
      puzzel: s.puzzel ? { woord: "•".repeat(s.puzzel.woord.length), open: [...s.puzzel.open].sort((a, b) => Number(b) - Number(a)), opgelost: s.puzzel.opgelost } : null,
    }));
}

export type BeamerData = {
  route: { naam: string; modus: string; huis_logo?: string | null };
  route_punten: LiveData["route_punten"];
  speciale_items: LiveData["speciale_items"];
  spelers: SpelerOverzicht[];
  gebeurtenissen: { id: string; tijd: string; speler_id: string | null; icoon: string; item: string | null; tekst: string }[];
};
