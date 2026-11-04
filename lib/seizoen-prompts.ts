// ✨ Prompts om in ChatGPT of Gemini voor een thema de drie afbeeldingen te laten maken, in de stijl van de app.
// De voorbeeldbestanden gaan als bijlage mee: dat houdt de stijl het best vast. De gezamenlijke prompt noemt ze bij hun
// bestandsnaam, dus die moeten hier hetzelfde blijven. Het vierkante voorbeeldlogo staat in public/voorbeeld; de muts, voorwerpen
// en slingers daarop horen bij hun eigen thema, dus de prompts zeggen dat die vervangen worden, en dat het rustiger moet dan het
// voorbeeld. Het brede logo staat klein in de bovenbalk: dat is het rustigst (eigen regels, en het strakke logo als voorbeeld),
// anders is de naam niet te lezen.
const LOGO_REGELS = (thema: string) => `Houd hetzelfde:
- de opbouw van het logo
- het witte, vrolijke rennende poppetje, de zwarte bom met brandende lont en het boze paarse spookje
- de paarse blokjes met de oranje driehoek
- de tekst POINT RUSH (POINT wit, RUSH goud-oranje) en "by Hoekies" op de paarse band: exact deze spelling
- drie spreekwolken, +100, +50 en +25, in dezelfde stijl
- paars en goud-oranje als hoofdkleuren

Pas aan voor het thema ${thema}, en houd het rustiger dan het voorbeeld:
- wat het poppetje draagt: geef het iets dat bij het thema past (bijvoorbeeld een muts, bril of kostuum)
- vervang alle andere voorwerpen en slingers uit het voorbeeld door zes tot acht vrolijke voorwerpen die bij het thema passen, om het logo heen met hier en daar wat ruimte ertussen; hooguit één slinger boven het logo en geen dichte rand
- POINT RUSH blijft het grootste onderdeel en is goed leesbaar: niets op of achter de letters

Stijl: glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning en felle kleuren.
Geen extra tekst, geen rand en geen slagschaduw op de achtergrond. Effen witte achtergrond (de app knipt die zelf weg).`;

const BREED_REGELS = (thema: string) => `Dit logo staat klein in de bovenbalk van een telefoon: de naam moet in één oogopslag te lezen zijn. Rust gaat voor versiering.

Houd hetzelfde:
- de tekst POINT RUSH op één regel (POINT wit, RUSH goud-oranje), met dikke donkere omlijning, en "by Hoekies" op de paarse band: exact deze spelling
- het witte, rennende poppetje links van de tekst
- paars en goud-oranje als hoofdkleuren

Houd het rustig:
- POINT RUSH is veruit het grootste onderdeel: minstens twee derde van de breedte en bijna de volle hoogte
- niets op, achter, boven of onder de letters: geen voorwerpen, slingers, patronen of vlakken
- geen spreekwolken, bom, spookje, blokjes of rand
- thema ${thema}: alleen iets dat het poppetje draagt (bijvoorbeeld een muts, bril of kostuum) en hooguit twee kleine voorwerpen naast het poppetje

Stijl: glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met felle kleuren.
Geen extra tekst, geen rand en geen slagschaduw op de achtergrond. Effen witte achtergrond (de app knipt die zelf weg).
Formaat: breed en laag (ongeveer 8:3).`;

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
const GEMINI_LOGO = (thema: string) => `Gebruik de bijgevoegde afbeelding als het logo dat je aanpast, en houd de stijl en opbouw zo: een glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning en felle kleuren, in paars en goud-oranje. Het witte, vrolijke rennende poppetje, de zwarte bom met brandende lont, het boze paarse spookje, de paarse blokjes met de oranje driehoek en drie spreekwolken, +100, +50 en +25, blijven staan. De tekst is letterlijk POINT RUSH, met POINT in wit en RUSH in goud-oranje, en daaronder "by Hoekies" op een paarse band; er staat geen andere tekst in de afbeelding, behalve die spreekwolken. POINT RUSH blijft het grootste onderdeel en is goed leesbaar, met niets op of achter de letters. Pas de rest aan voor het thema ${thema} en houd het rustiger dan het voorbeeld: geef het poppetje iets dat bij ${thema} past, zoals een muts, bril of kostuum, en vervang alle andere voorwerpen en slingers uit het voorbeeld door zes tot acht vrolijke voorwerpen die bij ${thema} passen, om het logo heen met hier en daar wat ruimte ertussen, met hooguit één slinger boven het logo en zonder dichte rand. De achtergrond is egaal wit, zonder rand en zonder schaduw.`;

const GEMINI_BREED = (thema: string) => `Gebruik de bijgevoegde afbeelding als voorbeeld voor het lettertype en de stijl: een glanzend, vrolijk 3D-cartoonlogo van een mobiele game, met dikke donkere omlijning, in paars en goud-oranje. Dit logo staat klein in de bovenbalk van een telefoon, dus de naam moet in één oogopslag te lezen zijn en rust gaat voor versiering. De tekst is letterlijk POINT RUSH op één regel, met POINT in wit en RUSH in goud-oranje, en daaronder "by Hoekies" op een paarse band; er staat geen andere tekst in de afbeelding. POINT RUSH is veruit het grootste onderdeel: minstens twee derde van de breedte en bijna de volle hoogte. Links van de tekst staat alleen het witte, rennende poppetje. Voor het thema ${thema} draagt het poppetje iets dat daarbij past, zoals een muts, bril of kostuum, met hooguit twee kleine voorwerpen naast het poppetje. Er staat niets op, achter, boven of onder de letters: geen voorwerpen, slingers, patronen of vlakken, en ook geen spreekwolken, bom, spookje, blokjes of rand. De achtergrond is egaal wit, zonder schaduw. Maak de afbeelding breed en laag, in beeldverhouding 21:9.`;

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
    label: "Logo breed", bestand: "/logo-breed-strak.webp", naam: "pointrush-logo-breed.webp",
    kop: "BREED LOGO",
    los: (thema: string) => `Maak van het bijgevoegde PointRush-logo een rustige versie voor het thema: ${thema}.\n\n${BREED_REGELS(thema)}`,
    opdracht: (thema: string) => `Maak van het voorbeeld een rustig, breed logo voor het thema ${thema}, met hetzelfde poppetje als afbeelding 1. Neem de voorwerpen en spreekwolken van afbeelding 1 niet over.\n\n${BREED_REGELS(thema)}`,
    gemini: (thema: string) => `${GEMINI_BREED(thema)} Gebruik hetzelfde poppetje als in het vierkante logo uit deze chat, als dat er is, maar neem de voorwerpen en spreekwolken daarvan niet over.`,
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
