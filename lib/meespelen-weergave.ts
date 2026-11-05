// 🤝 Meespeellink: weergave zonder serverzaken (lib/meespelen.ts gebruikt de crypto van de server).

// Hoe groot een item op de kaart is: ver uitgezoomd kleiner, anders ligt een route vol items als één klont over elkaar
export function itemMaatBijZoom(zoom: number): number {
  if (zoom >= 17) return 42;
  if (zoom >= 16) return 36;
  if (zoom >= 15) return 30;
  if (zoom >= 14) return 24;
  return 18;
}

// De resterende speeltijd in woorden. Zelfde regels als de teller van de speler: tijdens een pauze staat de tijd stil.
// Geen eindtijd ingesteld: null. laatste = de laatste 10 minuten (rood, net als bij de speler).
export function resterendeTijd(eindtijd: string | null, pauze: string | null, nu: number): { tekst: string; laatste: boolean } | null {
  if (!eindtijd) return null;
  if (pauze) return { tekst: "⏸️ Gepauzeerd", laatste: false };
  const minuten = Math.ceil((new Date(eindtijd).getTime() - nu) / 60000);
  if (minuten <= 0) return { tekst: "⏱️ De tijd is om", laatste: true };
  const u = Math.floor(minuten / 60), m = minuten % 60;
  return { tekst: `⏱️ Nog ${u ? `${u} u ` : ""}${u && !m ? "" : `${m} min`}`.trim(), laatste: minuten <= 10 };
}
