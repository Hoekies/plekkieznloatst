// Vraagideeën uit wat er op de kaart rond een punt staat (OpenStreetMap): kerk, molen, monument,
// café, kunstwerk, speeltuin… Per soort een paar vragen; het antwoord zoekt de organisator ter plekke op.

type VraagIdee = { tekst: string; type: "open" | "foto_opdracht"; bij: string };
export type KaartDing = { naam: string; tags: Record<string, string> };

function soort(t: Record<string, string>): string | null {
  if (t.amenity === "place_of_worship" || t.building === "church" || t.building === "chapel") return "kerk";
  if (t.man_made === "windmill" || t.historic === "mill" || t.man_made === "watermill") return "molen";
  if (t.historic === "memorial" || t.historic === "monument" || t.memorial) return "monument";
  if (t.tourism === "artwork") return "kunstwerk";
  if (["cafe", "restaurant", "pub", "bar", "fast_food", "ice_cream"].includes(t.amenity)) return "horeca";
  if (t.amenity === "school" || t.amenity === "kindergarten") return "school";
  if (t.leisure === "playground") return "speeltuin";
  if (t.leisure === "park" || t.leisure === "garden") return "park";
  if (["townhall", "library", "community_centre", "fire_station", "police", "post_office", "theatre", "cinema"].includes(t.amenity)) return "gebouw";
  if (t.historic || t.heritage) return "historisch";
  if (t.tourism === "museum" || t.tourism === "attraction" || t.tourism === "viewpoint") return "bezienswaardig";
  return null;
}

const SJABLONEN: Record<string, ((n: string) => VraagIdee["tekst"])[]> = {
  kerk: [(n) => `In welk jaar is de ${n} gebouwd?`, (n) => `Hoeveel klokken hangen er in de toren van de ${n}?`, (n) => `Naar welke heilige is de ${n} vernoemd?`],
  molen: [(n) => `In welk jaar is molen ${n} gebouwd?`, (n) => `Wat werd er vroeger gemalen in molen ${n}?`, (n) => `Hoeveel wieken heeft molen ${n}? (Let op: tel goed!)`],
  monument: [(n) => `Wat staat er op het monument "${n}"?`, (n) => `Voor wie of wat is "${n}" opgericht?`, (n) => `In welk jaar is "${n}" onthuld?`],
  kunstwerk: [(n) => `Hoe heet de maker van het kunstwerk "${n}"?`, (n) => `Uit welk materiaal is "${n}" gemaakt?`],
  horeca: [(n) => `Welke kleur heeft de voordeur van ${n}?`, (n) => `Wat kost een kop koffie bij ${n}?`],
  school: [(n) => `Hoe heet de school op deze plek? (${n})`, (n) => `Welke kleur hebben de kozijnen van ${n}?`],
  speeltuin: [(n) => `Hoeveel schommels staan er in ${n}?`, (n) => `Wat is het hoogste speeltoestel in ${n}?`],
  park: [(n) => `Welke boom staat er bij de ingang van ${n}?`, (n) => `Hoeveel bankjes tel je in ${n}?`],
  gebouw: [(n) => `In welk jaar is ${n} gebouwd? (kijk naar de gevel)`, (n) => `Wat staat er boven de ingang van ${n}?`],
  historisch: [(n) => `Wat was "${n}" vroeger?`, (n) => `Welk jaartal zie je bij "${n}"?`],
  bezienswaardig: [(n) => `Wat is er bijzonder aan ${n}?`, (n) => `Welk jaartal hoort bij ${n}?`],
};

// Hooguit `max` ideeën: per plek eerst één, daarna aanvullen; altijd een foto-opdracht bij de eerste plek
export function maakVraagIdeeen(dingen: KaartDing[], max = 8): VraagIdee[] {
  const perPlek = dingen
    .map((d) => ({ d, s: soort(d.tags) }))
    .filter((x): x is { d: KaartDing; s: string } => !!x.s)
    .map(({ d, s }) => SJABLONEN[s].map((f) => ({ tekst: f(d.naam), type: "open" as const, bij: d.naam })));
  const uit: VraagIdee[] = [];
  for (let ronde = 0; uit.length < max && perPlek.some((l) => l.length > ronde); ronde++) {
    for (const lijst of perPlek) if (lijst[ronde] && uit.length < max) uit.push(lijst[ronde]);
  }
  const eerste = dingen.find((d) => soort(d.tags));
  if (eerste) uit.splice(Math.min(2, uit.length), 0, { tekst: `Maak een teamfoto bij ${eerste.naam}`, type: "foto_opdracht", bij: eerste.naam });
  // Weinig in de buurt? Dan altijd bruikbare vragen voor elke plek
  const altijd: VraagIdee[] = [
    { tekst: "Hoe heet de straat waar dit punt ligt?", type: "open", bij: "deze plek" },
    { tekst: "Wat staat er op het bord of de gevel het dichtst bij dit punt?", type: "open", bij: "deze plek" },
    { tekst: "Maak een foto van het gekste dat je op deze plek ziet", type: "foto_opdracht", bij: "deze plek" },
  ];
  for (const idee of altijd) if (uit.length < 4) uit.push(idee);
  return uit.slice(0, max);
}
