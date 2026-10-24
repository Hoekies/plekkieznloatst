// Naamvoorstellen voor een punt, gekozen uit de vraagzin (knop 💡 in de route-editor).

const STOPWOORDEN = new Set([
  "de", "het", "een", "van", "in", "op", "met", "en", "of", "is", "zijn", "wat", "wie", "welk", "welke",
  "waar", "hoe", "hoeveel", "wanneer", "waarom", "we", "wij", "je", "jij", "jullie", "u", "dit", "deze",
  "die", "dat", "er", "noem", "maak", "neem", "foto", "1", "één", "tot", "voor", "bij", "naar", "aan",
  "werden", "werd", "staat", "staan", "heet", "heten", "hier", "daar", "graag", "had", "hebben", "heeft",
  "gehad", "kun", "kunnen", "kan", "jou", "jouw", "ons", "onze", "zie", "ziet", "zien", "vind", "vindt", "gaat", "nog",
  "niet", "wel", "ook", "uit", "om", "als", "dan", "maar", "door", "over", "zo", "al", "wordt", "worden", "was",
  "waren", "bent", "ben", "hun", "hem", "haar", "zij", "hij", "ze", "men", "mag", "moet", "moeten", "zal", "zou",
  "bekend", "onbekend", "precies", "ongeveer", "allemaal", "veel", "weinig", "meer", "minder", "goed", "fout",
]);

// Standaardnamen die de app zelf geeft; alleen die worden automatisch vernummerd
export function isStandaardNaam(naam: string | null | undefined): boolean {
  return !naam || /^punt\s*\d*$/i.test(naam.trim()) || /^nieuw punt$/i.test(naam.trim());
}

// Een kaal getal ("75") is geen bruikbare naam
const isGetal = (t: string) => /^[\d\s.,%€-]+$/.test(t.trim());

function netjes(tekst: string): string {
  const t = tekst.trim().replace(/[?!.:]+$/, "").replace(/\s+/g, " ");
  const kort = t.length > 24 ? t.slice(0, 23).trimEnd() + "…" : t;
  return kort.charAt(0).toUpperCase() + kort.slice(1);
}

// Woorden uit de vraagzin om uit te kiezen, bijvoorbeeld
// "Wanneer is het Sint Caecilia Gilde uit Veldhoven-dorp opgericht?"
//   → ["Sint Caecilia Gilde", "Veldhoven-dorp", "Opgericht"]
// Namen met hoofdletters blijven bij elkaar; daarna de overige betekenisvolle woorden.
function woordenUitVraag(vraag: string | null | undefined): string[] {
  if (!vraag?.trim()) return [];
  const namen: string[] = [];
  const losse: string[] = [];
  for (const zin of vraag.split(/[.?!\n]+/)) {
    const woorden = zin.replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter(Boolean);
    let groep: string[] = [];
    const sluit = () => { if (groep.length) namen.push(groep.join(" ")); groep = []; };
    woorden.forEach((w, i) => {
      const stop = STOPWOORDEN.has(w.toLowerCase());
      // Hoofdletter midden in de zin = (deel van) een naam; het eerste woord telt alleen mee als er nog een naamwoord op volgt
      const hoofdletter = /^\p{Lu}/u.test(w) && !stop && (i > 0 || /^\p{Lu}/u.test(woorden[1] ?? ""));
      if (hoofdletter) { groep.push(w); return; }
      sluit();
      if (!stop && w.length >= 4 && !isGetal(w)) losse.push(w);
    });
    sluit();
  }
  const gezien = new Set<string>();
  return [...namen, ...losse]
    .map(netjes)
    .filter((w) => {
      const k = w.toLowerCase();
      if (gezien.has(k) || [...gezien].some((g) => g.includes(k))) return false;
      gezien.add(k);
      return true;
    })
    .slice(0, 10);
}

// Zonder bruikbare vraagzin: het goede antwoord als reserve (geen kaal getal)
function woordenUitAntwoord(v: {
  correct_text_answers?: string[] | null;
  answer_options?: { text?: string | null; is_correct?: boolean }[] | null;
}): string[] {
  const goed = v.answer_options?.find((o) => o.is_correct)?.text ?? v.correct_text_answers?.find((a) => a?.trim());
  return goed?.trim() && !isGetal(goed) ? [netjes(goed)] : [];
}

// Alle naamvoorstellen voor een vraag: woorden uit de zin, anders het goede antwoord
export function naamWoorden(v: {
  question_text?: string | null;
  correct_text_answers?: string[] | null;
  answer_options?: { text?: string | null; is_correct?: boolean }[] | null;
}): string[] {
  const woorden = woordenUitVraag(v.question_text);
  return woorden.length ? woorden : woordenUitAntwoord(v);
}
