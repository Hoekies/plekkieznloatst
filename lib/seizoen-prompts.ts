import type { SeizoenSoort } from "@/lib/seizoenen";

// ✨ Prompts om in ChatGPT (met beeldgeneratie) een nieuwe seizoensafbeelding te laten maken in de stijl van de app.
// Beschreven vanaf de bestaande afbeeldingen. Het voorbeeldbestand gaat als bijlage mee: dat houdt de stijl het best vast.
type SeizoenPrompt = { voorbeeld: string; voorbeeldNaam: string; tekst: (thema: string) => string };

const LOGO_VAST = (thema: string) => `Maak van het bijgevoegde PointRush-logo een versie voor het thema: ${thema}.

Houd precies hetzelfde:
- de opbouw van het logo en de plek van alle onderdelen
- het witte rennende poppetje, de zwarte bom met lont, het boze paarse spookje en de paars-oranje speelvakjes
- de tekst POINT RUSH (POINT wit, RUSH goud-oranje) en "by Hoekies" op de paarse band: exact deze spelling
- de labels met de punten, in dezelfde stijl

Voeg toe voor het thema ${thema}:
- iets op of aan het poppetje dat bij het thema past (bijvoorbeeld een muts, bril of kostuum)
- een rijke rand van vrolijke voorwerpen die bij het thema passen, om en achter het logo; ze mogen de tekst niet bedekken

Stijl: glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning en felle kleuren.`;

const LOGO_EIND = "Geen extra tekst, geen rand en geen slagschaduw op de achtergrond. Effen witte achtergrond (de app knipt die zelf weg).";

export const SEIZOEN_PROMPTS: Record<SeizoenSoort, SeizoenPrompt> = {
  logo: {
    voorbeeld: "/logo.webp",
    voorbeeldNaam: "pointrush-logo.webp",
    tekst: (thema) => `${LOGO_VAST(thema)}

Formaat: vierkant (1:1). ${LOGO_EIND}`,
  },
  logo_breed: {
    voorbeeld: "/logo-breed-strak.webp",
    voorbeeldNaam: "pointrush-logo-breed.webp",
    tekst: (thema) => `${LOGO_VAST(thema)}

Formaat: breed en laag (ongeveer 8:3), met het poppetje links en POINT RUSH op één regel rechts ernaast. Laat de voorwerpen niet ver boven of onder het logo uitsteken. ${LOGO_EIND}`,
  },
  achtergrond: {
    voorbeeld: "/seizoenen/zomer-achtergrond.webp",
    voorbeeldNaam: "pointrush-achtergrond-voorbeeld.webp",
    tekst: (thema) => `Maak in exact dezelfde stijl als de bijgevoegde afbeelding een nieuwe achtergrond voor het welkomstscherm van een speurtocht-game, met als thema: ${thema}.

Inhoud:
- een sfeervol, sprookjesachtig landschap of straatbeeld dat past bij het thema ${thema}, geschilderd in warme, gouden lichtval
- voorwerpen die bij het thema passen op de voorgrond
- een pad van gloeiende gouden stippen dat door het beeld slingert naar een schat of ander doel in de verte

Opbouw (belangrijk):
- staand formaat 9:16
- het beeld staat alleen in het bovenste deel; rond het midden loopt het vloeiend over in effen donkerpaars (#1C0C45)
- het onderste deel is helemaal effen donkerpaars, zonder details: daar komt het inlogvak van de app

Geen tekst, geen logo's en geen mensen.`,
  },
};
