// ✨ Prompts om in ChatGPT (met beeldgeneratie) voor een thema de drie afbeeldingen te laten maken, in de stijl van de app.
// Beschreven vanaf de bestaande afbeeldingen. De voorbeeldbestanden gaan als bijlage mee: dat houdt de stijl het best vast.
// De gezamenlijke prompt noemt ze bij hun bestandsnaam, dus die moeten hier hetzelfde blijven.
const LOGO_REGELS = (thema: string) => `Houd precies hetzelfde:
- de opbouw van het logo en de plek van alle onderdelen
- het witte rennende poppetje, de zwarte bom met lont, het boze paarse spookje en de paars-oranje speelvakjes
- de tekst POINT RUSH (POINT wit, RUSH goud-oranje) en "by Hoekies" op de paarse band: exact deze spelling
- de labels met de punten, in dezelfde stijl

Voeg toe voor het thema ${thema}:
- iets op of aan het poppetje dat bij het thema past (bijvoorbeeld een muts, bril of kostuum)
- een rijke rand van vrolijke voorwerpen die bij het thema passen, om en achter het logo; ze mogen de tekst niet bedekken

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

// De drie afbeeldingen, logo's eerst: wat vooraan staat, bepaalt in ChatGPT het sterkst wat er gemaakt wordt
export const SEIZOEN_VOORBEELDEN = [
  {
    label: "Logo", bestand: "/logo.webp", naam: "pointrush-logo.webp",
    kop: "VIERKANT LOGO",
    los: (thema: string) => `Maak van het bijgevoegde PointRush-logo een versie voor het thema: ${thema}.\n\n${LOGO_REGELS(thema)}\n\nFormaat: vierkant (1:1).`,
    opdracht: (thema: string) => `Maak van het voorbeeld een logo voor het thema ${thema}.\n\n${LOGO_REGELS(thema)}\n\nFormaat: vierkant (1:1).`,
  },
  {
    label: "Logo breed", bestand: "/logo-breed-strak.webp", naam: "pointrush-logo-breed.webp",
    kop: "BREED LOGO",
    los: (thema: string) => `Maak van het bijgevoegde PointRush-logo een versie voor het thema: ${thema}.\n\n${LOGO_REGELS(thema)}\n\nFormaat: breed en laag (ongeveer 8:3), met het poppetje links en POINT RUSH op één regel rechts ernaast. Laat de voorwerpen niet ver boven of onder het logo uitsteken.`,
    opdracht: (thema: string) => `Maak van het voorbeeld een breed logo voor het thema ${thema}, met hetzelfde poppetje en dezelfde voorwerpen als afbeelding 1.\n\nDezelfde regels als afbeelding 1, maar: formaat breed en laag (ongeveer 8:3), met het poppetje links en POINT RUSH op één regel rechts ernaast. Laat de voorwerpen niet ver boven of onder het logo uitsteken.`,
  },
  {
    label: "Achtergrond", bestand: "/seizoenen/zomer-achtergrond.webp", naam: "pointrush-achtergrond.webp",
    kop: "ACHTERGROND",
    los: (thema: string) => `Maak in exact dezelfde stijl als de bijgevoegde afbeelding een nieuwe achtergrond voor het welkomstscherm van een speurtocht-game, met als thema: ${thema}.\n\n${ACHTERGROND_REGELS(thema)}`,
    opdracht: (thema: string) => `Maak in de stijl van het voorbeeld een achtergrond voor het welkomstscherm van een speurtocht-game, met als thema: ${thema}. Dit is geen logo.\n\n${ACHTERGROND_REGELS(thema)}`,
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
