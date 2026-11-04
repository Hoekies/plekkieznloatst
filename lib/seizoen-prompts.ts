// ✨ Prompts om in ChatGPT of Gemini voor een thema de afbeeldingen te laten maken, in de stijl van de app.
// De logo's komen uit één masterprompt (twee afbeeldingen, in dezelfde stijl), met twee referentielogo's als bijlage.
// De achtergrond heeft een eigen prompt en voorbeeld.
export const THEMA_INVUL = "[VUL HIER 1 TOT 4 WOORDEN IN]";

// De bijlagen bij de logoprompt, in de volgorde waarin de prompt ze noemt (Referentie 1 en 2)
export const LOGO_REFERENTIES = [
  { label: "Referentie 1", bestand: "/logo-breed-strak.webp", naam: "pointrush-referentie-1-breed.webp" },
  { label: "Referentie 2", bestand: "/voorbeeld/logo.webp", naam: "pointrush-referentie-2-mascotte.webp" },
];
export const ACHTERGROND_VOORBEELD = { label: "Voorbeeld", bestand: "/seizoenen/zomer-achtergrond.webp", naam: "pointrush-achtergrond.webp" };

export const logoPrompt = (thema: string) => `# POINT RUSH – MASTER LOGO GENERATOR

## THEMA: ${thema}

Gebruik de twee bijgevoegde originele POINT RUSH-logo's als visuele referentie.

**Referentie 1:** Het originele brede POINT RUSH-logo, met de herkenbare kleuren, typografie, het witte poppetje, het paarse spookje en de zwarte bom.

**Referentie 2:** Het POINT RUSH-logo met de expressieve witte 3D-cartoonmascotte, vrolijke uitstraling, kleding en grote gezichtsuitdrukking.

Maak op basis van het ingevulde thema **TWEE AFZONDERLIJKE AFBEELDINGEN** die samen één consistente, professionele POINT RUSH-thema-editie vormen.

---

## 1. ABSOLUTE PRIORITEIT – DE MERKNAAM

De naam **POINT RUSH** is het belangrijkste onderdeel van beide afbeeldingen.

### Verplichte regels

- De tekst moet exact **POINT RUSH** zijn.
- De volledige merknaam moet groot, dominant en onmiddellijk leesbaar zijn.
- De merknaam krijgt minimaal 50% van de visuele aandacht.
- Geen enkel personage, voorwerp of decoratief element mag letters afdekken.
- Gebruik dikke, krachtige, glanzende 3D-gamingletters.
- Gebruik sterke contrasten en duidelijke paarse of donkere contourlijnen.
- Houd voldoende ruimte tussen de letters.
- Geen vervormde, samengevoegde, ontbrekende of verkeerd gespelde letters.
- De tekst moet ook op kleinere afbeeldingen goed leesbaar blijven.

**Breed logo:** POINT RUSH op één horizontale regel.

**Vierkant logo:** bij voorkeur POINT boven RUSH, groot en centraal.

De tekst **by Hoekies** moet in beide afbeeldingen exact gespeld en duidelijk leesbaar onder de hoofdnaam staan.

**BELANGRIJK:** De hoofdnaam heeft ALTIJD voorrang op mascottes, thema-effecten en decoratie.

---

## 2. VASTE POINT RUSH-IDENTITEIT

Behoud de herkenbare uitstraling van het originele POINT RUSH-logo.

Kenmerken:

- Speelse, energieke casual-gamingstijl.
- Krachtige 3D-typografie.
- Dikke donkere of paarse contourlijnen.
- Glanzende letterafwerking.
- Dynamische achtergrondvormen.
- Paarse, gele en oranje basiskleuren.
- Professionele, vrolijke en kleurrijke cartoonillustraties.

De themaversie mag een andere sfeer of kleuraccenten krijgen, maar moet altijd herkenbaar blijven als een officiële POINT RUSH-editie.

Het resultaat mag niet lijken op een compleet ander merk.

---

## 3. HOOFDMASCOTTE

Vervang het eenvoudige witte lopende poppetje uit referentie 1 door een expressieve 3D-cartoonmascotte geïnspireerd op referentie 2.

### Uiterlijk

- Wit, rond en schattig cartoonkarakter.
- Groot, expressief gezicht.
- Duidelijk zichtbare ogen en mond.
- Vriendelijke, speelse uitstraling.
- Zachte afgeronde vormen.
- Glanzende 3D-afwerking.
- Dikke, duidelijke contourlijnen.
- Dynamische houding met armen en benen.

### Thema-aanpassing

De mascotte mag afhankelijk van het thema veranderen in:

- Gezichtsuitdrukking.
- Houding en beweging.
- Kleding.
- Hoofddeksel.
- Accessoires.
- Kleine thematische details.

De basisvorm en identiteit van de mascotte moeten in alle thema-edities herkenbaar blijven.

### Consistentie

Gebruik in het brede en vierkante logo exact dezelfde mascotte-identiteit, kleding, accessoires en kleurstelling.

De mascotte mag van positie of houding veranderen om beter in het formaat te passen.

---

## 4. DRIE VERPLICHTE GAME-ELEMENTEN

In BEIDE afbeeldingen moeten ALTIJD de volgende drie elementen zichtbaar zijn.

### A. PAARS SPOOKJE

- Herkenbare paarse cartoonspookvorm.
- Schattig en expressief gezicht.
- Mag thematische accessoires dragen.
- Mag een andere gezichtsuitdrukking krijgen.
- Moet duidelijk zichtbaar blijven.

### B. GELE BANAAN

- Duidelijk herkenbare gele cartoonbanaan.
- Mag armen, ogen, mond of accessoires krijgen.
- Mag grappig, vrolijk of thematisch aangekleed zijn.
- Moet als banaan herkenbaar blijven.

### C. ZWARTE BOM

- Zwarte ronde cartoonbom.
- Duidelijk zichtbare lont.
- Kleine heldere vonk bij de lont.
- Mag thematische details krijgen.
- Moet duidelijk herkenbaar blijven als bom.

### Belangrijke voorwaarden

- Alle drie de elementen zijn verplicht in beide formaten.
- Ze mogen niet verdwijnen.
- Ze mogen niet door andere voorwerpen worden vervangen.
- Ze mogen de tekst POINT RUSH nooit bedekken.
- Plaats ze als ondersteunende onderdelen rondom de hoofdcompositie.

---

## 5. AUTOMATISCHE THEMA-INTERPRETATIE

Gebruik het opgegeven thema om de volledige uitstraling automatisch aan te passen.

Pas waar passend aan:

- Kleuren en kleuraccenten.
- Kleding en accessoires van de mascotte.
- Gezichtsuitdrukking.
- Achtergronddecoratie.
- Lichteffecten.
- Kleine thematische illustraties.
- Sfeer en uitstraling.
- Details aan de letters en banner.

### Voorbeelden

**Valentijn**
Romantische sfeer, hartjes, rood-roze accenten, liefdevolle mascotte en subtiele glanzende harten.

**Vriendenweekend**
Vrolijke groepssfeer, feestelijke accessoires, confetti, gezelligheid, humor, avontuur en eventueel kampeeraccenten.

**Halloween**
Paarse en oranje gloed, pompoenen, spinnenwebben, speels griezelige mascotte en mysterieuze lichtaccenten.

**Kerst**
Sneeuw, kerstmuts, feestverlichting, warme kleuren en winterse decoratie.

**Zomerfeest**
Zonnebril, tropische accenten, vrolijke kleuren, zomerse accessoires en feestelijke details.

### Belangrijk

De AI moet het opgegeven thema zelfstandig creatief interpreteren.

Voeg de themanaam NIET als extra tekst toe aan het logo.

Alleen de volgende teksten zijn toegestaan:

**POINT RUSH**

**by Hoekies**

---

## 6. AFBEELDING 1 – BREED LOGO

### Formaat

- Horizontaal.
- Beeldverhouding 3:1.
- Hoge resolutie.
- Transparante achtergrond indien mogelijk.

### Compositie

- Grote POINT RUSH-tekst centraal en richting rechts.
- Beide woorden naast elkaar op één regel.
- Mascotte prominent links van de tekst.
- by Hoekies duidelijk leesbaar op een paarse banner onder de hoofdnaam.
- Paars spookje, gele banaan en zwarte bom rondom de compositie.
- Thematische decoraties geïntegreerd in de achtergrond.
- Dynamische vormen en speelse beweging.

### Verhoudingen

- De merknaam is visueel dominant.
- De mascotte is duidelijk herkenbaar, maar ondergeschikt aan de tekst.
- De drie game-elementen zijn goed zichtbaar zonder de compositie te overbelasten.
- Geen grote lege ruimtes.
- Geen afgesneden onderdelen.

Het brede logo moet geschikt zijn voor websiteheaders, banners, game-introschermen en promotiemateriaal.

---

## 7. AFBEELDING 2 – VIERKANT LOGO

### Formaat

- Vierkant.
- Beeldverhouding 1:1.
- Hoge resolutie.
- Transparante achtergrond indien mogelijk.

### Compositie

Ontwerp een nieuwe compositie speciaal voor het vierkante formaat.

**NIET simpelweg het brede logo bijsnijden.**

### Tekstindeling

Plaats de merknaam bij voorkeur op twee regels:

**POINT**

**RUSH**

Gebruik grote, dikke, duidelijk leesbare 3D-letters.

Plaats **by Hoekies** op een kleinere paarse banner onder de merknaam.

### Mascotte en spelelementen

- Mascotte boven of links van de merknaam.
- De mascotte mag gedeeltelijk achter de tekst staan, maar nooit letters bedekken.
- Paars spookje, gele banaan en zwarte bom compact rondom de tekst.
- Zorg dat alle vier de figuren duidelijk herkenbaar blijven.
- Gebruik dezelfde thematische details als in het brede logo.

### Prioriteit

De naam POINT RUSH moet ook in het vierkante logo de belangrijkste blikvanger blijven.

Maak de mascotte en decoratie kleiner wanneer dat nodig is.

Het logo moet goed leesbaar zijn als app-icoon, game-tegel, socialmedia-profielfoto of thumbnail.

---

## 8. VISUELE STIJL EN KWALITEIT

Gebruik voor beide ontwerpen:

- Premium 3D-cartoonillustratie.
- Professionele casual-gamingstijl.
- Krachtige en heldere kleuren.
- Subtiele glans en highlights.
- Zachte 3D-schaduwen.
- Diepe paarse en donkere contouren.
- Sterk contrast.
- Scherpe en vloeiende afwerking.
- Energieke, vrolijke uitstraling.
- Hoogwaardige digitale illustratie.

Vermijd:

- Fotorealisme.
- Minimalistische platte iconen.
- Onscherpe details.
- Onleesbare teksten.
- Overmatige decoratie.
- Extra woorden.
- Watermerken.
- Afgesneden letters of figuren.

---

## 9. CONSISTENTIE TUSSEN BEIDE LOGO'S

De twee afbeeldingen moeten duidelijk onderdeel zijn van dezelfde POINT RUSH-thema-editie.

Gebruik in beide logo's:

- Dezelfde mascotte.
- Dezelfde kleding en accessoires.
- Dezelfde kleurstelling.
- Dezelfde 3D-letterstijl.
- Dezelfde thematische sfeer.
- Hetzelfde paarse spookje.
- Dezelfde gele banaan.
- Dezelfde zwarte bom.
- Dezelfde stijl voor de by Hoekies-banner.

Alleen de plaatsing en schaal van de onderdelen mogen worden aangepast voor het betreffende formaat.

**Maak geen twee verschillende interpretaties van het thema.**

---

## 10. VERPLICHTE KWALITEITSCONTROLE

Controleer beide ontwerpen voor oplevering.

### Tekst

- [ ] POINT RUSH exact gespeld.
- [ ] by Hoekies exact gespeld.
- [ ] Beide teksten volledig zichtbaar.
- [ ] POINT RUSH groot en dominant.
- [ ] Geen letters bedekt door decoratie.

### Personages en objecten

- [ ] Expressieve witte mascotte aanwezig.
- [ ] Paars spookje aanwezig.
- [ ] Gele banaan aanwezig.
- [ ] Zwarte bom met lont aanwezig.

### Vormgeving

- [ ] Thema duidelijk herkenbaar.
- [ ] Zelfde mascotte en stijl in beide afbeeldingen.
- [ ] Breed logo correct in 3:1.
- [ ] Vierkant logo correct in 1:1.
- [ ] Geen afgesneden elementen.
- [ ] Geen extra teksten.

Als elementen botsen, verklein dan de decoratie of mascotte. Verklein nooit de merknaam ten gunste van decoratie.

---

## 11. DEFINITIEVE GENERATIEOPDRACHT

Genereer precies **TWEE LOSSE AFBEELDINGEN**:

### OUTPUT 1 – POINT RUSH BREED
- Formaat 3:1.
- POINT RUSH groot op één regel.
- Mascotte links.
- by Hoekies onder de hoofdnaam.
- Spookje, banaan en bom zichtbaar.
- Volledig aangepast aan het opgegeven thema.

### OUTPUT 2 – POINT RUSH VIERKANT
- Formaat 1:1.
- POINT boven RUSH.
- by Hoekies onder de hoofdnaam.
- Zelfde expressieve mascotte.
- Zelfde spookje, banaan en bom.
- Exact dezelfde thematische uitstraling als output 1.

**Genereer twee afzonderlijke afbeeldingsbestanden. Plaats de twee logo's niet samen in één afbeelding.**

Maak bij voorkeur eerst het brede logo en gebruik dat resultaat als aanvullende visuele referentie voor het vierkante logo.

**HOOGSTE PRIORITEIT:**

1. POINT RUSH groot en volledig leesbaar.
2. by Hoekies correct en duidelijk zichtbaar.
3. Dezelfde herkenbare expressieve mascotte.
4. Het paarse spookje, de gele banaan en de zwarte bom.
5. Een duidelijke, consistente thema-uitvoering.
6. Twee afzonderlijke professionele logo's in 3:1 en 1:1.

**EINDRESULTAAT:** Twee direct herkenbare, professioneel afgewerkte POINT RUSH-gaminglogo's die eruitzien als officiële speciale thema-edities van hetzelfde spel.`;

// Eén logo per bericht: voor Gemini, en als reserve als ChatGPT er maar één maakt. Dezelfde prompt, met onderaan wat nu moet.
export const logoBreedPrompt = (thema: string) => `${logoPrompt(thema)}

---

## MAAK IN DIT BERICHT ALLEEN OUTPUT 1 – POINT RUSH BREED

Maak nu alleen het brede logo, als één afbeelding in beeldverhouding 3:1. Het vierkante logo volgt in een volgend bericht.`;

export const logoVierkantPrompt = (thema: string) => `${logoPrompt(thema)}

---

## MAAK IN DIT BERICHT ALLEEN OUTPUT 2 – POINT RUSH VIERKANT

Maak nu alleen het vierkante logo, als één afbeelding in beeldverhouding 1:1. Staat het brede logo al in deze chat, gebruik dat dan als extra referentie, met dezelfde mascotte en dezelfde thematische uitstraling.`;

export const achtergrondPrompt = (thema: string) => `Maak in exact dezelfde stijl als de bijgevoegde afbeelding een nieuwe achtergrond voor het welkomstscherm van een speurtocht-game, met als thema: ${thema}.

Inhoud:
- een sfeervol, sprookjesachtig landschap of straatbeeld dat past bij het thema ${thema}, geschilderd in warme, gouden lichtval
- voorwerpen die bij het thema passen op de voorgrond
- een pad van gloeiende gouden stippen dat door het beeld slingert naar een schat of ander doel in de verte

Opbouw (belangrijk):
- staand formaat 9:16
- het beeld staat alleen in het bovenste deel; rond het midden loopt het vloeiend over in effen donkerpaars (#1C0C45)
- het onderste deel is helemaal effen donkerpaars, zonder details: daar komt het inlogvak van de app

Geen tekst, geen logo's en geen mensen.`;

// Gemini: één lopende beschrijving (zo raadt Google het aan), met de rol van de bijlage en het formaat in de tekst
export const achtergrondPromptGemini = (thema: string) => `Gebruik de bijgevoegde afbeelding als voorbeeld voor de schilderstijl, de warme gouden lichtval en de opbouw. Maak een nieuwe achtergrond voor het welkomstscherm van een speurtocht-game, met als thema ${thema}, in staand formaat met beeldverhouding 9:16. Het bovenste deel is een sfeervol, sprookjesachtig landschap of straatbeeld dat bij ${thema} past, met voorwerpen die bij het thema passen op de voorgrond, en een pad van gloeiende gouden stippen dat door het beeld slingert naar een schat of ander doel in de verte. Rond het midden loopt het beeld vloeiend over in effen donkerpaars (#1C0C45), en de onderste helft is één egaal vlak in die kleur, want daar komt het inlogvak van de app. Het beeld bestaat alleen uit landschap en voorwerpen, zonder tekst, logo's of mensen.`;
