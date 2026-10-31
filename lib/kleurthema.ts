// 🎨 Kleurthema's: de achtergrond- en vlakkleuren van de app (styles/globals.css, :root[data-thema=…]).
// Paars is de standaard. Beheer: per toestel (localStorage). Spelersapp: per route (routes.huis_thema, migratie 011).
export const KLEUR_THEMAS = [
  { sleutel: "paars", naam: "Paars", staal: "#2a1566" },
  { sleutel: "blauw", naam: "Nachtblauw", staal: "#153366" },
  { sleutel: "groen", naam: "Bosgroen", staal: "#1e5742" },
  { sleutel: "antraciet", naam: "Antraciet", staal: "#363a45" },
  { sleutel: "bordeaux", naam: "Bordeaux", staal: "#62192f" },
  { sleutel: "petrol", naam: "Petrol", staal: "#1a525b" },
  { sleutel: "koper", naam: "Koper", staal: "#59321c" },
  { sleutel: "magenta", naam: "Magenta", staal: "#601b52" },
  { sleutel: "middernacht", naam: "Middernacht", staal: "#1b1e31" },
  { sleutel: "olijf", naam: "Olijf", staal: "#444d21" },
] as const;

export type KleurThema = (typeof KLEUR_THEMAS)[number]["sleutel"];

export function isKleurThema(t: unknown): t is KleurThema {
  return typeof t === "string" && KLEUR_THEMAS.some((k) => k.sleutel === t);
}

// Beheer: de keuze op dit toestel
export const BEHEER_THEMA_SLEUTEL = "pr_beheer_thema";

// Thema op de pagina zetten (paars = geen attribuut)
export function zetThema(t: string | null | undefined) {
  if (isKleurThema(t) && t !== "paars") document.documentElement.dataset.thema = t;
  else delete document.documentElement.dataset.thema;
}

// Klein script dat vóór het tekenen het thema zet (geen paarse flits): beheer uit localStorage, speler vast
export function themaScript(vast?: string | null): string {
  if (vast !== undefined) return `(function(){var t=${JSON.stringify(isKleurThema(vast) && vast !== "paars" ? vast : null)};if(t)document.documentElement.dataset.thema=t;else delete document.documentElement.dataset.thema;})();`;
  const geldig = JSON.stringify(KLEUR_THEMAS.map((k) => k.sleutel).filter((k) => k !== "paars"));
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(BEHEER_THEMA_SLEUTEL)});if(${geldig}.indexOf(t)>=0)document.documentElement.dataset.thema=t;else delete document.documentElement.dataset.thema;}catch(e){}})();`;
}
