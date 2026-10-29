// 🎉 Spelplezier (migratie 007): de regels, zowel voor de server als de app. Per route aan of uit in de
// route-editor (⚙️ Instellingen → 🎮 Spel), met per onderdeel een ⚙️ voor de instellingen (migratie 008:
// routes.spelplezier, één JSON-veld). Zonder instellingen gelden de standaardwaarden hieronder.

export type SpelplezierAan = { val: boolean; reeks: boolean; badges: boolean; fotobattle: boolean; schat: boolean; rad: boolean };

// Uit de route ("*": zonder migratie 007 ontbreken de kolommen en staat alles uit)
export function spelplezierAan(route: unknown): SpelplezierAan {
  const r = (route ?? {}) as Record<string, unknown>;
  return {
    val: r.val_aan === true, reeks: r.reeks_aan === true, badges: r.badges_aan === true,
    fotobattle: r.fotobattle_aan === true, schat: r.schat_aan === true, rad: r.rad_aan === true,
  };
}

// 🎖️ Badges: per spel elke soort hooguit één keer
export type BadgeSoort = "pionier" | "bliksem" | "onfire" | "taai" | "schat" | "sluw" | "duel" | "geluk" | "gouden";
export const BADGES: Record<BadgeSoort, { emoji: string; naam: string; uitleg: string }> = {
  pionier: { emoji: "🚩", naam: "Pionier", uitleg: "als eerste bij een punt" },
  bliksem: { emoji: "⚡", naam: "Bliksemsnel", uitleg: "goed antwoord binnen 15 seconden" },
  onfire: { emoji: "🔥", naam: "On fire", uitleg: "5 goede antwoorden op rij" },
  taai: { emoji: "🛡️", naam: "Taaie rakkers", uitleg: "3 keer geraakt door een item, en toch door" },
  schat: { emoji: "📦", naam: "Schatzoekers", uitleg: "de vliegende schat gepakt" },
  sluw: { emoji: "🪤", naam: "Sluw", uitleg: "een team in jullie val laten lopen" },
  duel: { emoji: "⚔️", naam: "Duelkampioen", uitleg: "een duel gewonnen" },
  geluk: { emoji: "🍀", naam: "Geluksvogels", uitleg: "de hoofdprijs van het rad" },
  gouden: { emoji: "⏰", naam: "Goudzoekers", uitleg: "goed antwoord in het gouden kwartier" },
};
export const BLIKSEM_SEC = 15;
export const ONFIRE_REEKS = 5;
export const TAAI_GERAAKT = 3;
export const isBadge = (s: string): s is BadgeSoort => s in BADGES;

// ── ⚙️ Instellingen per onderdeel ───────────────────────────────────────────

export const BONUS_ITEMS = ["ster", "verdubbeling", "radar", "bom", "spook", "banaan", "schaduw"] as const;
export type BonusItem = (typeof BONUS_ITEMS)[number];
export const ITEM_LABEL: Record<BonusItem, string> = { ster: "⭐ Ster", verdubbeling: "✖️2 Verdubbeling", radar: "📡 Radar", bom: "💣 Bom", spook: "👻 Spook", banaan: "🍌 Banaan", schaduw: "🥷 Schaduw" };

export type PlezierInstellingen = {
  // 🪤 punten: null = de bomwaarde van de route; zetterKrijgt: het team dat de val zette krijgt die punten
  val: { meter: number; minuten: number; max: number; punten: number | null; zetterKrijgt: boolean };
  // 🔥 elke `lengte` goed op rij: een item (uit `items`) of `punten`
  reeks: { lengte: number; beloning: "item" | "punten"; punten: number; items: BonusItem[] };
  // 🎖️ uit: badges die niet gegeven worden; punten: zoveel punten per badge
  badges: { uit: BadgeSoort[]; punten: number };
  // 📸 punten voor de winnaar (bij het vrijgeven van de uitslag) en een fysieke prijs (tekst)
  fotobattle: { punten: number; prijs: string };
  // 📦 elke `minuten` een nieuwe plek, binnen `meter` gepakt; beloning item, punten of allebei
  schat: { minuten: number; meter: number; beloning: "item" | "punten" | "allebei"; punten: number; items: BonusItem[] };
  // 🎰 moment: na dit deel van de route; zonderMin: geen −25-vak; hoofdprijs: het grootste vak
  rad: { moment: number; zonderMin: boolean; hoofdprijs: number };
  // ⏰ aan: bij deze route te gebruiken (knop in het Spelleider-blok en het tijdstip); duur en vermenigvuldiger;
  // om: elke dag vanzelf op dit tijdstip ("14:30", Nederlandse tijd), of null
  gouden: { aan: boolean; minuten: number; factor: number; om: string | null };
  // ── Deel 2 (migratie 009): elk onderdeel met aan/uit in de instellingen zelf ──
  // 🥷 schaduw-item: zoveel minuten onzichtbaar voor radar en duels; aan = ook bij de schat, het rad en de reeks
  schaduw: { aan: boolean; minuten: number };
  // 🃏 jokers per team: 50/50 (twee foute antwoorden weg) en overslaan (vraag zonder punten verder)
  jokers: { aan: boolean; vijftig: number; over: number };
  // 📏 per gelopen kilometer: punten of een item
  km: { aan: boolean; beloning: "punten" | "item"; punten: number; items: BonusItem[] };
  // 🐣 mascotte en 🏅 levels: groeien mee met de score
  mascotte: { aan: boolean };
  levels: { aan: boolean };
  // 🧑‍⚖️ bezwaar tegen een fout gerekend antwoord: zo vaak per team
  bezwaar: { aan: boolean; max: number };
  // 💬 chat met de spelleider, 📊 spelstatistieken na de uitslag, 🗝️ sleutelpunten (per punt in de editor)
  chat: { aan: boolean };
  statistieken: { aan: boolean };
  sleutel: { aan: boolean };
  // 🧩 fotopuzzel: de foto (opslag route-afbeeldingen), de goede antwoorden en de punten bij goed raden
  fotopuzzel: { aan: boolean; pad: string | null; antwoorden: string[]; punten: number };
};

export const STANDAARD: PlezierInstellingen = {
  val: { meter: 15, minuten: 20, max: 1, punten: null, zetterKrijgt: false },
  reeks: { lengte: 3, beloning: "item", punten: 25, items: ["ster", "verdubbeling", "radar"] },
  badges: { uit: [], punten: 0 },
  fotobattle: { punten: 0, prijs: "" },
  schat: { minuten: 10, meter: 20, beloning: "item", punten: 25, items: [...BONUS_ITEMS] },
  rad: { moment: 0.5, zonderMin: false, hoofdprijs: 100 },
  gouden: { aan: false, minuten: 15, factor: 2, om: null },
  schaduw: { aan: false, minuten: 5 },
  jokers: { aan: false, vijftig: 1, over: 1 },
  km: { aan: false, beloning: "punten", punten: 25, items: ["ster", "radar"] },
  mascotte: { aan: false },
  levels: { aan: false },
  bezwaar: { aan: false, max: 1 },
  chat: { aan: false },
  statistieken: { aan: false },
  sleutel: { aan: false },
  fotopuzzel: { aan: false, pad: null, antwoorden: [], punten: 100 },
};

// De keuzes in het beheer (alleen knoppen); de server accepteert ook alleen deze waarden
export const KEUZES = {
  valMeter: [10, 15, 25], valMinuten: [10, 20, 30], valMax: [1, 2, 3], valPunten: [10, 25, 50],
  reeksLengte: [3, 4, 5], reeksPunten: [25, 50],
  badgePunten: [0, 10, 25],
  fotoPunten: [0, 25, 50, 100],
  schatMinuten: [5, 10, 15], schatMeter: [15, 20, 30], schatPunten: [25, 50],
  radMoment: [1 / 3, 0.5, 2 / 3], radHoofdprijs: [100, 200],
  goudenMinuten: [5, 10, 15, 30], goudenFactor: [2, 3],
  schaduwMinuten: [3, 5, 10], jokerAantal: [0, 1, 2, 3], kmPunten: [10, 25, 50], bezwaarMax: [1, 2, 3], puzzelfotoPunten: [50, 100, 200],
} as const;

const kies = <T,>(waarde: unknown, toegestaan: readonly T[], standaard: T): T => (toegestaan as readonly unknown[]).includes(waarde) ? (waarde as T) : standaard;
const lijst = <T extends string>(waarde: unknown, toegestaan: readonly T[], standaard: T[]): T[] => {
  if (!Array.isArray(waarde)) return standaard;
  const goed = waarde.filter((x): x is T => (toegestaan as readonly string[]).includes(x));
  return [...new Set(goed)];
};
const naderBij = (waarde: unknown, opties: readonly number[], standaard: number) =>
  typeof waarde === "number" ? opties.reduce((a, b) => (Math.abs(b - waarde) < Math.abs(a - waarde) ? b : a)) : standaard;

// Alles wat binnenkomt (uit de database of uit het beheer) naar geldige instellingen; wat ontbreekt = standaard
export function normaliseerPlezier(ruw: unknown): PlezierInstellingen {
  const r = (ruw && typeof ruw === "object" ? ruw : {}) as Record<string, Record<string, unknown> | undefined>;
  const v = r.val ?? {}, re = r.reeks ?? {}, b = r.badges ?? {}, f = r.fotobattle ?? {}, s = r.schat ?? {}, ra = r.rad ?? {}, g = r.gouden ?? {};
  const sc = r.schaduw ?? {}, j = r.jokers ?? {}, k = r.km ?? {}, bz = r.bezwaar ?? {}, fp = r.fotopuzzel ?? {};
  const aan = (x: Record<string, unknown> | undefined) => x?.aan === true;
  const kmItems = lijst(k.items, BONUS_ITEMS, STANDAARD.km.items);
  const puzzelAntwoorden = Array.isArray(fp.antwoorden)
    ? [...new Set(fp.antwoorden.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 10) : [];
  const S = STANDAARD;
  const reeksItems = lijst(re.items, BONUS_ITEMS, S.reeks.items);
  const schatItems = lijst(s.items, BONUS_ITEMS, S.schat.items);
  const om = typeof g.om === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(g.om) ? g.om : null;
  return {
    val: {
      meter: kies(v.meter, KEUZES.valMeter, S.val.meter), minuten: kies(v.minuten, KEUZES.valMinuten, S.val.minuten),
      max: kies(v.max, KEUZES.valMax, S.val.max), punten: v.punten === null ? null : kies(v.punten, KEUZES.valPunten, S.val.punten as number | null),
      zetterKrijgt: v.zetterKrijgt === true,
    },
    reeks: {
      lengte: kies(re.lengte, KEUZES.reeksLengte, S.reeks.lengte), beloning: kies(re.beloning, ["item", "punten"] as const, S.reeks.beloning),
      punten: kies(re.punten, KEUZES.reeksPunten, S.reeks.punten), items: reeksItems.length ? reeksItems : S.reeks.items,
    },
    badges: { uit: lijst(b.uit, Object.keys(BADGES) as BadgeSoort[], []), punten: kies(b.punten, KEUZES.badgePunten, S.badges.punten) },
    fotobattle: { punten: kies(f.punten, KEUZES.fotoPunten, S.fotobattle.punten), prijs: typeof f.prijs === "string" ? f.prijs.trim().slice(0, 60) : "" },
    schat: {
      minuten: kies(s.minuten, KEUZES.schatMinuten, S.schat.minuten), meter: kies(s.meter, KEUZES.schatMeter, S.schat.meter),
      beloning: kies(s.beloning, ["item", "punten", "allebei"] as const, S.schat.beloning), punten: kies(s.punten, KEUZES.schatPunten, S.schat.punten),
      items: schatItems.length ? schatItems : S.schat.items,
    },
    rad: { moment: naderBij(ra.moment, KEUZES.radMoment, S.rad.moment), zonderMin: ra.zonderMin === true, hoofdprijs: kies(ra.hoofdprijs, KEUZES.radHoofdprijs, S.rad.hoofdprijs) },
    gouden: { aan: g.aan === true, minuten: kies(g.minuten, KEUZES.goudenMinuten, S.gouden.minuten), factor: kies(g.factor, KEUZES.goudenFactor, S.gouden.factor), om },
    schaduw: { aan: aan(sc), minuten: kies(sc.minuten, KEUZES.schaduwMinuten, S.schaduw.minuten) },
    jokers: { aan: aan(j), vijftig: kies(j.vijftig, KEUZES.jokerAantal, S.jokers.vijftig), over: kies(j.over, KEUZES.jokerAantal, S.jokers.over) },
    km: { aan: aan(k), beloning: kies(k.beloning, ["punten", "item"] as const, S.km.beloning), punten: kies(k.punten, KEUZES.kmPunten, S.km.punten), items: kmItems.length ? kmItems : S.km.items },
    mascotte: { aan: aan(r.mascotte) },
    levels: { aan: aan(r.levels) },
    bezwaar: { aan: aan(bz), max: kies(bz.max, KEUZES.bezwaarMax, S.bezwaar.max) },
    chat: { aan: aan(r.chat) },
    statistieken: { aan: aan(r.statistieken) },
    sleutel: { aan: aan(r.sleutel) },
    fotopuzzel: {
      aan: aan(fp), pad: typeof fp.pad === "string" && /^[\w./-]{1,200}$/.test(fp.pad) && !fp.pad.includes("..") ? fp.pad : null,
      antwoorden: puzzelAntwoorden, punten: kies(fp.punten, KEUZES.puzzelfotoPunten, S.fotopuzzel.punten),
    },
  };
}
export const plezierInstellingen = (route: unknown) => normaliseerPlezier((route as { spelplezier?: unknown } | null)?.spelplezier);

// ── ⏰ Gouden kwartier ──────────────────────────────────────────────────────

export const GOUDEN_MIN = STANDAARD.gouden.minuten;

// Minuut van de dag in Nederlandse tijd
function minuutVanDag(nu: number): number {
  const delen = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(nu));
  const getal = (soort: string) => Number(delen.find((d) => d.type === soort)?.value ?? 0);
  return getal("hour") * 60 + getal("minute");
}

// Loopt het gouden kwartier nu, en tot wanneer? Met de knop (routes.gouden_tot) of vanzelf op het ingestelde
// tijdstip. Stopt de spelleider het vanzelf gestarte kwartier, dan zet de knop gouden_tot op "nu" binnen dat
// venster: dan blijft het uit.
export function goudenStatus(route: unknown, nu = Date.now()): { tot: string; factor: number } | null {
  const r = route as { gouden_tot?: string | null } | null;
  const inst = plezierInstellingen(route);
  if (!inst.gouden.aan) return null;
  const knop = r?.gouden_tot ? Date.parse(r.gouden_tot) : 0;
  if (knop > nu) return { tot: new Date(knop).toISOString(), factor: inst.gouden.factor };
  if (inst.gouden.om) {
    const [u, m] = inst.gouden.om.split(":").map(Number);
    const verstreken = minuutVanDag(nu) - (u * 60 + m);
    if (verstreken >= 0 && verstreken < inst.gouden.minuten) {
      const start = nu - verstreken * 60_000 - 60_000;
      if (knop && knop >= start && knop <= nu) return null;
      return { tot: new Date(nu + (inst.gouden.minuten - verstreken) * 60_000).toISOString(), factor: inst.gouden.factor };
    }
  }
  return null;
}
export const goudenNu = (route: unknown, nu = Date.now()) => !!goudenStatus(route, nu);

// ── 🪤 Val ──────────────────────────────────────────────────────────────────
export const VAL_AFSTAND_PUNT = 30;

// ── 🔥 Reeks (standaard) ────────────────────────────────────────────────────
export const REEKS_LENGTE = STANDAARD.reeks.lengte;
export const REEKS_ITEMS = STANDAARD.reeks.items;

// ── 📦 Vliegende schat ──────────────────────────────────────────────────────
export const schatSlot = (nu = Date.now(), minuten = STANDAARD.schat.minuten) => Math.floor(nu / (minuten * 60_000));

// ── 🎰 Rad van fortuin: acht even grote vakken (eerlijk rad) ─────────────────
export type RadVak = { id: string; label: string; kleur: string; punten?: number; item?: boolean };
export function radVakken(inst: PlezierInstellingen["rad"] = STANDAARD.rad): RadVak[] {
  return [
    { id: "hoofd", label: `+${inst.hoofdprijs}`, kleur: "#FFD93B", punten: inst.hoofdprijs },
    { id: "p25", label: "+25", kleur: "#22D3EE", punten: 25 },
    { id: "item", label: "🎁", kleur: "#A78BFA", item: true },
    inst.zonderMin ? { id: "p10", label: "+10", kleur: "#67E8F9", punten: 10 } : { id: "min25", label: "−25", kleur: "#F87171", punten: -25 },
    { id: "p50", label: "+50", kleur: "#4ADE80", punten: 50 },
    { id: "niets", label: "😴", kleur: "#94A3B8" },
    { id: "p25b", label: "+25", kleur: "#22D3EE", punten: 25 },
    { id: "item2", label: "🎁", kleur: "#A78BFA", item: true },
  ];
}
export const RAD_VAKKEN = radVakken();
export const RAD_ITEMS = ["ster", "verdubbeling", "radar", "bom", "spook"] as const;
// Na dit deel van de route (standaard de helft) mag het team één keer draaien
export const radHalverwege = (afgerond: number, totaal: number, deel = STANDAARD.rad.moment) => totaal > 1 && afgerond >= Math.ceil(totaal * deel - 1e-9);
export const radMomentTekst = (deel: number) => (deel < 0.4 ? "na een derde" : deel > 0.6 ? "na twee derde" : "halverwege");

// ── 🐣 Mascotte en 🏅 levels (groeien mee met de score) ─────────────────────
export const MASCOTTE = [
  { min: 0, emoji: "🥚", naam: "Ei" },
  { min: 100, emoji: "🐣", naam: "Kuiken" },
  { min: 300, emoji: "🦉", naam: "Uil" },
  { min: 600, emoji: "🦅", naam: "Adelaar" },
] as const;
export const LEVELS = [
  { min: 0, emoji: "🌱", naam: "Rookie" },
  { min: 100, emoji: "🔎", naam: "Speurder" },
  { min: 250, emoji: "🧭", naam: "Kenner" },
  { min: 500, emoji: "🎓", naam: "Meester" },
  { min: 1000, emoji: "👑", naam: "Legende" },
] as const;
const trede = <T extends { min: number }>(lijst: readonly T[], score: number): T => [...lijst].reverse().find((t) => score >= t.min) ?? lijst[0];
export const mascotteVoor = (score: number) => trede(MASCOTTE, score);
export const levelVoor = (score: number) => trede(LEVELS, score);
// Hoeveel nog tot de volgende stap (null = de hoogste)
export function volgendeTrede<T extends { min: number }>(lijst: readonly T[], score: number): { trede: T; nog: number } | null {
  const v = lijst.find((t) => t.min > score);
  return v ? { trede: v, nog: v.min - score } : null;
}

// 🥷 Het schaduw-item komt alleen in de schat, het rad en de reeks als het bij de route aan staat
export const metSchaduw = <T extends string>(items: readonly T[], inst: PlezierInstellingen): T[] =>
  items.filter((i) => i !== "schaduw" || inst.schaduw.aan);

// 🧩 Fotopuzzel: zoveel van de 16 stukjes zijn open bij zoveel goede antwoorden van zoveel vragen
export const PUZZEL_STUKJES = 16;
export function puzzelStukjesOpen(goed: number, vragen: number): number {
  if (vragen <= 0) return 0;
  return Math.min(PUZZEL_STUKJES, Math.round((goed / vragen) * PUZZEL_STUKJES));
}
