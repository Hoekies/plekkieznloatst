// 🗓️ Seizoenen en feestdagen voor de achtergrond van het welkomstscherm. De app kiest op datum;
// feestdagen gaan voor seizoenen. Vaste data als [maand, dag]; Carnaval en Pasen rekent de app elk jaar uit.
export type Thema = { sleutel: string; naam: string; emoji: string; feestdag: boolean; periode: (jaar: number) => [Date, Date]; eigen?: boolean };

const d = (jaar: number, maand: number, dag: number) => new Date(jaar, maand - 1, dag);
// Vrije thema's hebben geen datum: begin na eind, dus de datum valt er nooit in
const nooit = (jaar: number): [Date, Date] => [d(jaar, 1, 2), d(jaar, 1, 1)];
const plus = (datum: Date, dagen: number) => new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() + dagen);

// Paaszondag (gregoriaanse kalender, rekenregel van Meeus/Jones/Butcher)
export function paaszondag(jaar: number): Date {
  const a = jaar % 19, b = Math.floor(jaar / 100), c = jaar % 100, dd = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31), dag = ((h + l - 7 * m + 114) % 31) + 1;
  return d(jaar, maand, dag);
}

export const THEMAS: Thema[] = [
  // Feestdagen (gaan voor)
  { sleutel: "halloween", naam: "Halloween", emoji: "🎃", feestdag: true, periode: (j) => [d(j, 10, 24), d(j, 11, 7)] },
  { sleutel: "sinterklaas", naam: "Sinterklaas", emoji: "🎁", feestdag: true, periode: (j) => [d(j, 11, 13), d(j, 12, 6)] },
  { sleutel: "kerst", naam: "Kerst", emoji: "🎄", feestdag: true, periode: (j) => [d(j, 12, 7), d(j, 12, 27)] },
  { sleutel: "oudnieuw", naam: "Oud & nieuw", emoji: "🎆", feestdag: true, periode: (j) => [d(j, 12, 28), d(j + 1, 1, 6)] },
  { sleutel: "valentijn", naam: "Valentijn", emoji: "💘", feestdag: true, periode: (j) => [d(j, 2, 7), d(j, 2, 21)] },
  // Carnaval: carnavalszondag is 7 weken voor Pasen; van een week ervoor tot en met de dinsdag
  { sleutel: "carnaval", naam: "Carnaval", emoji: "🎭", feestdag: true, periode: (j) => { const z = plus(paaszondag(j), -49); return [plus(z, -7), plus(z, 2)]; } },
  { sleutel: "pasen", naam: "Pasen", emoji: "🐣", feestdag: true, periode: (j) => { const p = paaszondag(j); return [plus(p, -7), plus(p, 7)]; } },
  { sleutel: "koningsdag", naam: "Koningsdag", emoji: "👑", feestdag: true, periode: (j) => [d(j, 4, 20), d(j, 5, 4)] },
  // Seizoenen (daarbuiten)
  { sleutel: "lente", naam: "Lente", emoji: "🌷", feestdag: false, periode: (j) => [d(j, 3, 21), d(j, 6, 20)] },
  { sleutel: "zomer", naam: "Zomer", emoji: "☀️", feestdag: false, periode: (j) => [d(j, 6, 21), d(j, 9, 22)] },
  { sleutel: "herfst", naam: "Herfst", emoji: "🍂", feestdag: false, periode: (j) => [d(j, 9, 23), d(j, 12, 20)] },
  { sleutel: "winter", naam: "Winter", emoji: "❄️", feestdag: false, periode: (j) => [d(j, 12, 21), d(j + 1, 3, 20)] },
  // Vrije thema's (bijv. een bedrijfsuitje of verjaardag): geen datum, alleen te gebruiken door ze vast te zetten (📌).
  // Naam en emoji stelt de beheerder zelf in (regel "_namen", zie leesNamen).
  { sleutel: "eigen1", naam: "Eigen 1", emoji: "⭐", feestdag: false, eigen: true, periode: nooit },
  { sleutel: "eigen2", naam: "Eigen 2", emoji: "🎈", feestdag: false, eigen: true, periode: nooit },
];

// 📌 Vastgezet thema: een regel met deze sleutel in seizoen_achtergronden, met in "pad" de themasleutel
// (bijv. "kerst"). Dan geldt dat thema overal, wat de datum ook is (geen migratie nodig).
export const VAST_SLEUTEL = "_vast";
export const bestaandThema = (s: unknown): s is string => typeof s === "string" && THEMAS.some((t) => t.sleutel === s);
// Instellingsregels in dezelfde tabel ("_vast", "_namen") beginnen met een liggend streepje: geen afbeeldingen
export const isInstelRij = (thema: unknown) => typeof thema === "string" && thema.startsWith("_");

// ✏️ Eigen naam en emoji van de vrije thema's: regel "_namen", met in "pad" een JSON-tekst
export const NAMEN_SLEUTEL = "_namen";
export type EigenNamen = Record<string, { naam: string; emoji: string }>;
export const MAX_NAAM = 30, MAX_EMOJI = 8;
export function leesNamen(tekst: string | null | undefined): EigenNamen {
  try {
    const ruw = JSON.parse(tekst ?? "{}") as Record<string, { naam?: unknown; emoji?: unknown }>;
    const uit: EigenNamen = {};
    for (const t of THEMAS.filter((x) => x.eigen)) {
      const r = ruw?.[t.sleutel];
      const naam = typeof r?.naam === "string" ? r.naam.trim().slice(0, MAX_NAAM) : "";
      const emoji = typeof r?.emoji === "string" ? r.emoji.trim().slice(0, MAX_EMOJI) : "";
      if (naam || emoji) uit[t.sleutel] = { naam, emoji };
    }
    return uit;
  } catch {
    return {};
  }
}
// Naam en emoji zoals de beheerder ze ziet (eigen naam als die is ingesteld)
export const themaNaam = (t: Thema, namen: EigenNamen) => namen[t.sleutel]?.naam || t.naam;
export const themaEmoji = (t: Thema, namen: EigenNamen) => namen[t.sleutel]?.emoji || t.emoji;

// Wat er per thema kan worden geüpload, en in welke kolom van seizoen_achtergronden het staat
export const SEIZOEN_KOLOM = { achtergrond: "pad", logo: "logo_pad", logo_breed: "logo_breed_pad" } as const;
export type SeizoenSoort = keyof typeof SEIZOEN_KOLOM;

// Valt de datum in de periode van dit thema? (ook als die over de jaarwisseling loopt)
function inPeriode(t: Thema, datum: Date): boolean {
  const dag = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  return [datum.getFullYear() - 1, datum.getFullYear()].some((j) => { const [van, tot] = t.periode(j); return dag >= van && dag <= tot; });
}

// Het thema van dit moment waarvoor een achtergrond is geüpload: eerst feestdagen, dan het seizoen
export function huidigThema(datum: Date, beschikbaar: Set<string>): Thema | null {
  return THEMAS.find((t) => t.feestdag && beschikbaar.has(t.sleutel) && inPeriode(t, datum))
    ?? THEMAS.find((t) => !t.feestdag && beschikbaar.has(t.sleutel) && inPeriode(t, datum))
    ?? null;
}

// Periode als tekst, bijv. "24 okt – 7 nov" (voor het beheer)
export function periodeTekst(t: Thema, jaar: number): string {
  if (t.eigen) return "alleen met 📌";
  const f = (x: Date) => x.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).replace(".", "");
  const [van, tot] = t.periode(jaar);
  return `${f(van)} – ${f(tot)}`;
}
