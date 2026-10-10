// "Klaar om te spelen?": wat er vóór het activeren van een route nog aandacht nodig heeft.
import type { RoutePunt, RouteModus } from "@/types/database";
import { haversine } from "@/lib/geo";

export type ControleRegel = { niveau: "fout" | "let op"; tekst: string };

export function routeControle({ punten, modus, vraagPuntIds, verwachtTeams, itemTekort, itemTeVeel, teamStarts, teamMinuten }: {
  punten: RoutePunt[];
  modus: RouteModus;
  vraagPuntIds: Set<string>;
  verwachtTeams: number;
  itemTekort: number;
  itemTeVeel: boolean;
  // Per team de startplek en het eerste punt (voor de aanloop)
  teamStarts: { lat: number; lng: number }[][];
  teamMinuten: number[];
}): ControleRegel[] {
  const regels: ControleRegel[] = [];
  const naam = (p: RoutePunt) => p.name || "naamloos punt";
  const lijst = (ps: RoutePunt[]) => ps.slice(0, 5).map(naam).join(", ") + (ps.length > 5 ? ` en nog ${ps.length - 5}` : "");
  if (punten.length === 0) {
    regels.push({ niveau: "fout", tekst: "Er staan nog geen punten op de kaart." });
    return regels;
  }
  if (punten[punten.length - 1].type !== "eindpunt") regels.push({ niveau: "fout", tekst: "Het laatste punt is geen finish (🏁)." });
  if (modus === "verspreid" && punten.length < 4) regels.push({ niveau: "fout", tekst: "Een verspreide route heeft een start, minstens 2 punten in het rondje en een finish nodig." });
  const zonderVraag = punten.filter((p) => p.type === "vraagpunt" && !vraagPuntIds.has(p.id));
  if (zonderVraag.length) regels.push({ niveau: "let op", tekst: `${zonderVraag.length} vraagpunt${zonderVraag.length !== 1 ? "en" : ""} zonder vraag: ${lijst(zonderVraag)}.` });
  const zonderNaam = punten.filter((p) => !p.name?.trim());
  if (zonderNaam.length) regels.push({ niveau: "let op", tekst: `${zonderNaam.length} punt${zonderNaam.length !== 1 ? "en" : ""} zonder naam.` });
  if (modus === "verspreid") {
    if (punten.length < verwachtTeams * 2) regels.push({ niveau: "let op", tekst: `Minimaal ${verwachtTeams * 2} punten aanbevolen voor ${verwachtTeams} teams (nu ${punten.length}).` });
    if (itemTekort) regels.push({ niveau: "let op", tekst: `Ongeveer ${itemTekort} item${itemTekort !== 1 ? "s" : ""} te weinig volgens het advies.` });
    if (itemTeVeel) regels.push({ niveau: "let op", tekst: "Meer items dan het advies: het spel kan rommelig worden." });
    // Eerlijkheid: aanloop naar het eerste punt en totale looptijd per team
    const aanloop = teamStarts.map((c) => c.length > 1 ? haversine(c[0].lat, c[0].lng, c[1].lat, c[1].lng) : 0);
    if (aanloop.length > 1 && Math.max(...aanloop) - Math.min(...aanloop) > 150) {
      regels.push({ niveau: "let op", tekst: `De aanloop naar het eerste punt verschilt ${Math.round(Math.max(...aanloop) - Math.min(...aanloop))} m tussen de teams.` });
    }
    const tijden = teamMinuten;
    if (tijden.length > 1 && Math.max(...tijden) - Math.min(...tijden) > 10) {
      regels.push({ niveau: "let op", tekst: `De geschatte speeltijd verschilt ${Math.round(Math.max(...tijden) - Math.min(...tijden))} minuten tussen de teams.` });
    }
  }
  return regels;
}
