// 🏆 Prijzen bij de finish: elk team krijgt een grappige titel, zodat iedereen iets wint. Per titel het team dat
// er het best in was (en nog geen titel heeft); wie overblijft krijgt een van de troostprijzen.

export type Prijs = { emoji: string; titel: string; uitleg: string };
export type TeamCijfers = {
  id: string;
  tijd: number;                    // seconden
  afstand: number;                 // meter
  goed: number;                    // goede antwoorden
  items: Record<string, number>;   // ingezette items per soort
  geraakt: number;                 // zo vaak raakte een ander team hen met een item
  stemmen?: number;                // 📸 stemmen in de fotobattle (migratie 007)
};

type Kandidaat = Prijs & { score: (t: TeamCijfers) => number; minimaal?: number };

// Op volgorde van belangrijkheid: de eerste titels worden het eerst uitgedeeld
const TITELS: Kandidaat[] = [
  { emoji: "📸", titel: "Mooiste foto", uitleg: "de meeste stemmen in de fotobattle", score: (t) => t.stemmen ?? 0, minimaal: 1 },
  { emoji: "🧠", titel: "Slimste team", uitleg: "de meeste goede antwoorden", score: (t) => t.goed, minimaal: 1 },
  { emoji: "🏃", titel: "Snelste team", uitleg: "het snelst over de finish", score: (t) => -t.tijd },
  { emoji: "🦹", titel: "Meesterdief", uitleg: "de meeste dieven ingezet", score: (t) => t.items.dief ?? 0, minimaal: 1 },
  { emoji: "🍌", titel: "Bananenkoning", uitleg: "de meeste bananen gegooid", score: (t) => t.items.banaan ?? 0, minimaal: 1 },
  { emoji: "💣", titel: "Bommenlegger", uitleg: "de meeste bommen gegooid", score: (t) => t.items.bom ?? 0, minimaal: 1 },
  { emoji: "🧭", titel: "Omloper van de dag", uitleg: "de meeste meters gelopen", score: (t) => t.afstand, minimaal: 1 },
  { emoji: "🎯", titel: "Schietschijf", uitleg: "het vaakst geraakt door een ander team", score: (t) => t.geraakt, minimaal: 1 },
  { emoji: "🎁", titel: "Itemverzamelaar", uitleg: "de meeste items ingezet", score: (t) => Object.values(t.items).reduce((a, b) => a + b, 0), minimaal: 1 },
];

// Voor wie geen titel kreeg: een troostprijs (op volgorde, daarna opnieuw)
const TROOST: Prijs[] = [
  { emoji: "🌸", titel: "Genieters van het uitzicht", uitleg: "rustig aan, en alles gezien" },
  { emoji: "🎉", titel: "Gezelligste team", uitleg: "plezier boven punten" },
  { emoji: "🐢", titel: "Volhouders", uitleg: "langzaam maar zeker binnen" },
  { emoji: "🦄", titel: "Unieke aanpak", uitleg: "op hun eigen manier" },
];

export function deelPrijzenUit(teams: TeamCijfers[]): Map<string, Prijs> {
  const uit = new Map<string, Prijs>();
  if (!teams.length) return uit;
  for (const k of TITELS) {
    const vrij = teams.filter((t) => !uit.has(t.id));
    if (!vrij.length) break;
    let beste: TeamCijfers | null = null;
    for (const t of vrij) if (!beste || k.score(t) > k.score(beste)) beste = t;
    if (!beste) continue;
    if (k.minimaal !== undefined && k.score(beste) < k.minimaal) continue;
    // Gelijk spel met een ander vrij team: deze titel overslaan (geen willekeurige winnaar)
    if (vrij.some((t) => t !== beste && k.score(t) === k.score(beste!))) continue;
    uit.set(beste.id, { emoji: k.emoji, titel: k.titel, uitleg: k.uitleg });
  }
  let i = 0;
  for (const t of teams) if (!uit.has(t.id)) uit.set(t.id, TROOST[i++ % TROOST.length]);
  return uit;
}
