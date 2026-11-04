// ✨ Eén prompt om in ChatGPT (met beeldgeneratie) voor een thema alle drie de afbeeldingen te laten maken, in de stijl
// van de app. Beschreven vanaf de bestaande afbeeldingen. De voorbeeldbestanden gaan als bijlage mee: dat houdt de stijl
// het best vast. De prompt noemt ze bij hun bestandsnaam, dus die moeten hier hetzelfde blijven.
export const SEIZOEN_VOORBEELDEN = [
  { label: "Achtergrond", bestand: "/seizoenen/zomer-achtergrond.webp", naam: "pointrush-achtergrond.webp" },
  { label: "Logo", bestand: "/logo.webp", naam: "pointrush-logo.webp" },
  { label: "Logo breed", bestand: "/logo-breed-strak.webp", naam: "pointrush-logo-breed.webp" },
];

const LOGO_REGELS = (thema: string) => `Houd bij beide logo's precies hetzelfde:
- de opbouw van het logo en de plek van alle onderdelen
- het witte rennende poppetje, de zwarte bom met lont, het boze paarse spookje en de paars-oranje speelvakjes
- de tekst POINT RUSH (POINT wit, RUSH goud-oranje) en "by Hoekies" op de paarse band: exact deze spelling
- de labels met de punten, in dezelfde stijl

Voeg bij beide logo's toe voor het thema ${thema}:
- iets op of aan het poppetje dat bij het thema past (bijvoorbeeld een muts, bril of kostuum); bij beide logo's hetzelfde
- een rijke rand van vrolijke voorwerpen die bij het thema passen, om en achter het logo; ze mogen de tekst niet bedekken

Stijl: glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning en felle kleuren.
Geen extra tekst, geen rand en geen slagschaduw op de achtergrond. Effen witte achtergrond (de app knipt die zelf weg).`;

export function seizoenPrompt(thema: string): string {
  return `Maak drie afbeeldingen voor het thema: ${thema}. Ze horen bij een speurtocht-game. Gebruik de drie bijgevoegde afbeeldingen als voorbeeld en houd exact die stijl.

Maak ze één voor één, in deze volgorde, en ga na elke afbeelding meteen door met de volgende, zonder iets te vragen.

AFBEELDING 1: ACHTERGROND (voorbeeld: pointrush-achtergrond.webp)
- een sfeervol, sprookjesachtig landschap of straatbeeld dat past bij het thema ${thema}, geschilderd in warme, gouden lichtval
- voorwerpen die bij het thema passen op de voorgrond
- een pad van gloeiende gouden stippen dat door het beeld slingert naar een schat of ander doel in de verte
- staand formaat 9:16
- het beeld staat alleen in het bovenste deel; rond het midden loopt het vloeiend over in effen donkerpaars (#1C0C45)
- het onderste deel is helemaal effen donkerpaars, zonder details: daar komt het inlogvak van de app
- geen tekst, geen logo's en geen mensen

AFBEELDING 2: VIERKANT LOGO (voorbeeld: pointrush-logo.webp)
- maak van het voorbeeld een versie voor het thema ${thema}
- formaat: vierkant (1:1)

AFBEELDING 3: BREED LOGO (voorbeeld: pointrush-logo-breed.webp)
- maak van het voorbeeld een versie voor het thema ${thema}
- formaat: breed en laag (ongeveer 8:3), met het poppetje links en POINT RUSH op één regel rechts ernaast
- laat de voorwerpen niet ver boven of onder het logo uitsteken

${LOGO_REGELS(thema)}`;
}
