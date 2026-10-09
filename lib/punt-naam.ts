// Bedenkt een korte puntnaam uit de vraag (voorstel via de 💡-knop in de route-editor).

const STOPWOORDEN = new Set([
  "de", "het", "een", "van", "in", "op", "met", "en", "of", "is", "zijn", "wat", "wie", "welk", "welke",
  "waar", "hoe", "hoeveel", "wanneer", "waarom", "we", "wij", "je", "jij", "jullie", "u", "dit", "deze",
  "die", "dat", "er", "noem", "maak", "neem", "foto", "1", "één", "tot", "voor", "bij", "naar", "aan",
  "werden", "werd", "staat", "staan", "heet", "heten", "hier", "daar", "graag", "had", "hebben", "heeft",
  "gehad", "kun", "kunnen", "kan", "jou", "jouw", "ons", "onze", "zie", "ziet", "zien", "vind", "vindt", "gaat", "nog",
]);

// Standaardnamen die de app zelf geeft; alleen die worden automatisch vervangen
export function isStandaardNaam(naam: string | null | undefined): boolean {
  return !naam || /^punt\s*\d*$/i.test(naam.trim()) || /^nieuw punt$/i.test(naam.trim());
}

// Een kaal getal ("75") is geen bruikbare naam: dan liever het kernwoord uit de vraag
const isGetal = (t: string) => /^[\d\s.,%€-]+$/.test(t.trim());

function netjes(tekst: string): string {
  const t = tekst.trim().replace(/[?!.:]+$/, "").replace(/\s+/g, " ");
  const kort = t.length > 24 ? t.slice(0, 23).trimEnd() + "…" : t;
  return kort.charAt(0).toUpperCase() + kort.slice(1);
}

// Kernwoorden uit de vraagtekst, bijvoorbeeld "Maak een foto van het kruisbeeld" → "Kruisbeeld"
function kernUitVraag(vraag: string): string | null {
  const woorden = vraag.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter(Boolean);
  const kern = woorden.filter((w) => !STOPWOORDEN.has(w.toLowerCase()));
  if (!kern.length) return null;
  return kern.slice(-2).join(" ");
}

// Naamvoorstel: een kernwoord uit de vraag ("Welke gemeente zijn we?" → "Gemeente").
// Alleen als de vraag niets bruikbaars oplevert, het goede antwoord als reserve.
export function naamUitVraag(v: {
  type: string;
  question_text?: string | null;
  correct_text_answers?: string[] | null;
  numeric_answer?: number | null;
  answer_options?: { text?: string | null; is_correct?: boolean }[] | null;
}): string | null {
  const kern = v.question_text ? kernUitVraag(v.question_text) : null;
  if (kern) return netjes(kern);
  const goed = v.answer_options?.find((o) => o.is_correct)?.text ?? v.correct_text_answers?.find((a) => a?.trim());
  return goed?.trim() && !isGetal(goed) ? netjes(goed) : null;
}
