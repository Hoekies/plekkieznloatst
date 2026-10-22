// 📦 Sjablonen voor een nieuwe route: kant-en-klare instellingen voor een soort uitje.
// Ze vullen alleen de instellingen; punten en vragen maak je zelf. Alles is daarna nog aan te passen.
export type Sjabloon = {
  sleutel: string;
  naam: string;
  uitleg: string;
  instellingen: Record<string, unknown>;
};

export const SJABLONEN: Sjabloon[] = [
  { sleutel: "standaard", naam: "⚙️ Standaard", uitleg: "De gewone instellingen.", instellingen: {} },
  {
    sleutel: "kinderfeest", naam: "🎈 Kinderfeest",
    uitleg: "Kortere effecten, vaak de tussenstand, iedereen begint met een banaan.",
    instellingen: {
      tussenstand_interval_minuten: 10, ster_waarde: 30, bom_waarde: 15, item_respawn: true,
      spook_duur_seconden: 180, plekzooi_duur_seconden: 120, startitems: { banaan: 1 },
    },
  },
  {
    sleutel: "bedrijfsuitje", naam: "🏢 Bedrijfsuitje",
    uitleg: "Fanatiek: meer punten per item, startitems om te saboteren, tussenstand elk kwartier.",
    instellingen: {
      tussenstand_interval_minuten: 15, ster_waarde: 60, bom_waarde: 40, item_respawn: true,
      spook_duur_seconden: 600, plekzooi_duur_seconden: 300, startitems: { banaan: 1, bom: 1, spook: 1 },
    },
  },
  {
    sleutel: "wandeling", naam: "🥾 Wandeling",
    uitleg: "Rustig: hele route zichtbaar, geen tussenstand, geen startitems.",
    instellingen: { tussenstand_interval_minuten: 0, alle_punten_zichtbaar: true, startitems: {} },
  },
];
