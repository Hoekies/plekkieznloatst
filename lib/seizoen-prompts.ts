// ✨ Prompts om in ChatGPT of Gemini voor een thema de drie afbeeldingen te laten maken, in de stijl van de app.
// De voorbeeldbestanden gaan als bijlage mee: dat houdt de stijl het best vast. De gezamenlijke prompt noemt ze bij hun
// bestandsnaam, dus die moeten hier hetzelfde blijven. De voorbeeldlogo's staan in public/voorbeeld; de muts, voorwerpen en
// slingers daarop horen bij hun eigen thema, dus de prompts zeggen dat die vervangen worden.
const LOGO_REGELS = (thema: string) => `Houd precies hetzelfde:
- de opbouw van het logo en de plek van alle onderdelen
- het witte, vrolijke rennende poppetje, de zwarte bom met brandende lont en het boze paarse spookje
- de paarse blokjes met de oranje driehoek
- de tekst POINT RUSH (POINT wit, RUSH goud-oranje) en "by Hoekies" op de paarse band: exact deze spelling
- de spreekwolken met +100, +50, +200 en +25, in dezelfde stijl
- paars en goud-oranje als hoofdkleuren

Vervang voor het thema ${thema}:
- wat het poppetje draagt: geef het iets dat bij het thema past (bijvoorbeeld een muts, bril of kostuum)
- alle andere voorwerpen en slingers uit het voorbeeld: zet er vrolijke voorwerpen voor in de plaats die bij het thema passen, in een rijke rand om en achter het logo; ze mogen de tekst niet bedekken

Stijl: glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning en felle kleuren.
Geen extra tekst, geen rand en geen slagschaduw op de achtergrond. Effen witte achtergrond (de app knipt die zelf weg).`;

const ACHTERGROND_REGELS = (thema: string) => `Inhoud:
- een sfeervol, sprookjesachtig landschap of straatbeeld dat past bij het thema ${thema}, geschilderd in warme, gouden lichtval
- voorwerpen die bij het thema passen op de voorgrond
- een pad van gloeiende gouden stippen dat door het beeld slingert naar een schat of ander doel in de verte

Opbouw (belangrijk):
- staand formaat 9:16
- het beeld staat alleen in het bovenste deel; rond het midden loopt het vloeiend over in effen donkerpaars (#1C0C45)
- het onderste deel is helemaal effen donkerpaars, zonder details: daar komt het inlogvak van de app

Geen tekst, geen logo's en geen mensen.`;

// Gemini: elke opdracht als één lopende beschrijving (zo raadt Google het aan), met de rol van de bijlage, het formaat
// in de tekst, de exacte tekst, en wat gelijk moet blijven. In dezelfde chat, zodat de versiering gelijk blijft.
const GEMINI_LOGO = (thema: string) => `Gebruik de bijgevoegde afbeelding als het logo dat je aanpast, en houd de stijl en opbouw precies zo: een glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning en felle kleuren, in paars en goud-oranje. Het witte, vrolijke rennende poppetje, de zwarte bom met brandende lont, het boze paarse spookje, de paarse blokjes met de oranje driehoek en de spreekwolken met +100, +50, +200 en +25 blijven staan waar ze staan. De tekst is letterlijk POINT RUSH, met POINT in wit en RUSH in goud-oranje, en daaronder "by Hoekies" op een paarse band; er staat geen andere tekst in de afbeelding, behalve die spreekwolken. Pas de rest aan voor het thema ${thema}: geef het poppetje iets dat bij ${thema} past, zoals een muts, bril of kostuum, en vervang alle andere voorwerpen en slingers uit het voorbeeld door vrolijke voorwerpen die bij ${thema} passen, in een rijke rand om en achter het logo, zonder dat ze de tekst bedekken. De achtergrond is egaal wit, zonder rand en zonder schaduw.`;

// De drie afbeeldingen, logo's eerst: wat vooraan staat, bepaalt in ChatGPT het sterkst wat er gemaakt wordt
export const SEIZOEN_VOORBEELDEN = [
  {
    label: "Logo", bestand: "/voorbeeld/logo.webp", naam: "pointrush-logo.webp",
    kop: "VIERKANT LOGO",
    los: (thema: string) => `Maak van het bijgevoegde PointRush-logo een versie voor het thema: ${thema}.\n\n${LOGO_REGELS(thema)}\n\nFormaat: vierkant (1:1).`,
    opdracht: (thema: string) => `Maak van het voorbeeld een logo voor het thema ${thema}.\n\n${LOGO_REGELS(thema)}\n\nFormaat: vierkant (1:1).`,
    gemini: (thema: string) => `${GEMINI_LOGO(thema)} Maak de afbeelding vierkant, in beeldverhouding 1:1.`,
  },
  {
    label: "Logo breed", bestand: "/voorbeeld/logo-breed.webp", naam: "pointrush-logo-breed.webp",
    kop: "BREED LOGO",
    los: (thema: string) => `Maak van het bijgevoegde PointRush-logo een versie voor het thema: ${thema}.\n\n${LOGO_REGELS(thema)}\n\nFormaat: breed en laag (ongeveer 8:3), met het poppetje links en POINT RUSH op één regel rechts ernaast. Laat de voorwerpen niet ver boven of onder het logo uitsteken.`,
    opdracht: (thema: string) => `Maak van het voorbeeld een breed logo voor het thema ${thema}, met hetzelfde poppetje en dezelfde voorwerpen als afbeelding 1.\n\nDezelfde regels als afbeelding 1, maar: formaat breed en laag (ongeveer 8:3), met het poppetje links en POINT RUSH op één regel rechts ernaast. Laat de voorwerpen niet ver boven of onder het logo uitsteken.`,
    gemini: (thema: string) => `${GEMINI_LOGO(thema)} Maak de afbeelding breed en laag, in beeldverhouding 21:9, met het poppetje links en POINT RUSH op één regel rechts ernaast, en houd de voorwerpen dicht bij het logo. Gebruik hetzelfde poppetje en dezelfde voorwerpen als in het vierkante logo uit deze chat, als dat er is.`,
  },
  {
    label: "Achtergrond", bestand: "/seizoenen/zomer-achtergrond.webp", naam: "pointrush-achtergrond.webp",
    kop: "ACHTERGROND",
    los: (thema: string) => `Maak in exact dezelfde stijl als de bijgevoegde afbeelding een nieuwe achtergrond voor het welkomstscherm van een speurtocht-game, met als thema: ${thema}.\n\n${ACHTERGROND_REGELS(thema)}`,
    opdracht: (thema: string) => `Maak in de stijl van het voorbeeld een achtergrond voor het welkomstscherm van een speurtocht-game, met als thema: ${thema}. Dit is geen logo.\n\n${ACHTERGROND_REGELS(thema)}`,
    gemini: (thema: string) => `Gebruik de bijgevoegde afbeelding als voorbeeld voor de schilderstijl, de warme gouden lichtval en de opbouw. Maak een nieuwe achtergrond voor het welkomstscherm van een speurtocht-game, met als thema ${thema}, in staand formaat met beeldverhouding 9:16. Het bovenste deel is een sfeervol, sprookjesachtig landschap of straatbeeld dat bij ${thema} past, met voorwerpen die bij het thema passen op de voorgrond, en een pad van gloeiende gouden stippen dat door het beeld slingert naar een schat of ander doel in de verte. Rond het midden loopt het beeld vloeiend over in effen donkerpaars (#1C0C45), en de onderste helft is één egaal vlak in die kleur, want daar komt het inlogvak van de app. Het beeld bestaat alleen uit landschap en voorwerpen, zonder tekst, logo's of mensen.`,
  },
];

// Eén prompt voor alle drie. Zonder deze nadruk maakt ChatGPT soms drie varianten van dezelfde afbeelding.
export function seizoenPrompt(thema: string): string {
  const delen = SEIZOEN_VOORBEELDEN.map((v, i) => `=== AFBEELDING ${i + 1} VAN 3: ${v.kop} ===
Voorbeeld: ${v.naam}
${v.opdracht(thema)}`);
  return `Je maakt voor het thema ${thema} DRIE VERSCHILLENDE afbeeldingen voor een speurtocht-game: een vierkant logo, een breed logo en een achtergrond.

BELANGRIJK:
- Dit zijn geen drie varianten van één afbeelding. Elke afbeelding is iets anders.
- Gebruik de beeldgenerator drie keer apart, telkens alleen met de opdracht en de bijlage van die afbeelding.
- Begin met afbeelding 1. Ga daarna zonder iets te vragen door met 2 en daarna met 3.
- Je bent pas klaar als er 1 vierkant logo, 1 breed logo en 1 achtergrond zijn. Ontbreekt er een, maak die dan alsnog.

${delen.join("\n\n")}`;
}
