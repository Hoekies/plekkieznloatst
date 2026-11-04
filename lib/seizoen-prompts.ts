// ✨ Prompts om in ChatGPT of Gemini voor een thema de afbeeldingen te laten maken, in de stijl van de app.
// De logo's komen uit één masterprompt (twee afbeeldingen, in dezelfde stijl), met twee referentielogo's als bijlage.
// Die tekst is de aangeleverde prompt: de regel met het thema wordt ingevuld, en wat alleen bij het vriendenweekend hoort
// (pet, zonnebril, bierglas) staat er met "bij vriendenweekend" bij, zodat andere thema's eigen kleding krijgen.
// De achtergrond heeft een eigen prompt en voorbeeld.
export const THEMA_INVUL = "[VUL HIER 1 TOT 4 WOORDEN IN]";

// De bijlagen bij de logoprompt, in de volgorde waarin de prompt ze noemt (Referentie 1 en 2)
export const LOGO_REFERENTIES = [
  { label: "Referentie 1", bestand: "/logo-breed-strak.webp", naam: "pointrush-referentie-1-breed.webp" },
  { label: "Referentie 2", bestand: "/voorbeeld/logo.webp", naam: "pointrush-referentie-2-mascotte.webp" },
];
export const ACHTERGROND_VOORBEELD = { label: "Voorbeeld", bestand: "/seizoenen/zomer-achtergrond.webp", naam: "pointrush-achtergrond.webp" };

export const logoPrompt = (thema: string) => `# POINT RUSH – MASTER LOGO GENERATOR V2

## THEMA: ${thema}

Gebruik de twee bijgevoegde originele POINT RUSH-logo's als visuele referentie.

**Referentie 1:** Het originele brede POINT RUSH-logo met de herkenbare kleuren, typografie, het witte poppetje, het paarse spookje en de zwarte bom.

**Referentie 2:** Het POINT RUSH-logo met de expressieve witte 3D-cartoonmascotte, vrolijke uitstraling, kleding en grote gezichtsuitdrukking.

Maak op basis van het opgegeven thema **TWEE AFZONDERLIJKE AFBEELDINGEN** die samen één consistente, professionele POINT RUSH-thema-editie vormen.

De afbeeldingen moeten eruitzien als hoogwaardige, vrijstaande 3D-gaminglogo's met een volledig transparante achtergrond.

---

## 1. ABSOLUTE PRIORITEIT – DE MERKNAAM

De naam **POINT RUSH** is het belangrijkste onderdeel van beide afbeeldingen.

### Verplichte regels

- De tekst moet exact **POINT RUSH** zijn.
- De volledige merknaam moet groot, dominant en onmiddellijk leesbaar zijn.
- De merknaam krijgt minimaal 50% van de visuele aandacht.
- Geen enkel personage of voorwerp mag letters afdekken.
- Gebruik dikke, krachtige, glanzende 3D-gamingletters.
- Gebruik sterke contrasten en diepe paarse of donkere contourlijnen.
- Houd voldoende ruimte tussen de letters.
- Geen vervormde, samengevoegde, ontbrekende of verkeerd gespelde letters.
- De tekst moet ook op kleine afbeeldingen goed leesbaar blijven.

**Breed logo:** POINT RUSH op één horizontale regel.

**Vierkant logo:** POINT boven RUSH, groot en centraal.

### Vaste letterkleuren

- **POINT:** glanzend wit met subtiele lichtgrijze 3D-schaduwen.
- **RUSH:** helder geel met warme oranje onderzijde.
- Beide woorden krijgen dikke, donkerpaarse contouren en een glanzende 3D-afwerking.

De tekst **by Hoekies** moet in beide afbeeldingen exact gespeld en duidelijk leesbaar zijn op een glanzende paarse banner onder de merknaam.

**BELANGRIJK: De merknaam heeft altijd voorrang op mascottes, decoratie en thema-effecten.**

---

## 2. VASTE POINT RUSH-IDENTITEIT

Behoud de herkenbare uitstraling van het originele POINT RUSH-logo.

Kenmerken:

- Speelse, energieke casual-gamingstijl.
- Premium 3D-cartoonillustratie.
- Grote, krachtige 3D-typografie.
- Dikke donkerpaarse contourlijnen.
- Glanzende letterafwerking.
- Paarse, gele, oranje en witte basiskleuren.
- Expressieve cartoonpersonages.
- Dieptewerking, zachte schaduwen en heldere highlights.
- Professionele, vrolijke en kleurrijke uitstraling.

Het resultaat moet direct herkenbaar zijn als een officiële POINT RUSH-thema-editie.

---

## 3. HOOFDMASCOTTE

Gebruik een expressieve witte 3D-cartoonmascotte, geïnspireerd op referentie 2.

### Vast uiterlijk

- Wit, rond en schattig cartoonkarakter.
- Groot, expressief gezicht.
- Duidelijk zichtbare ogen en mond.
- Brede, vrolijke glimlach.
- Zachte afgeronde vormen.
- Glanzende witte 3D-afwerking.
- Dikke donkere contourlijnen.
- Dynamische armen en benen.
- Speelse en enthousiaste lichaamshouding.

### Thema-aanpassing

Pas de mascotte aan het opgegeven thema aan door middel van:

- Gezichtsuitdrukking.
- Houding.
- Kleding.
- Hoofddeksel.
- Accessoires.
- Kleine thematische details.

### Voor het thema vriendenweekend

De mascotte:

- Draagt een paarse pet achterstevoren.
- Heeft een zonnebril op de pet.
- Draagt paarse kleding met gele accenten.
- Heeft eventueel een kleine rugzak.
- Lacht uitbundig.
- Houdt een groot goudkleurig bierglas met wit schuim omhoog.
- Heeft een feestelijke, enthousiaste houding.

Gebruik in beide logo's dezelfde mascotte-identiteit, kleding, accessoires en kleurstelling.

---

## 4. DRIE VERPLICHTE GAME-ELEMENTEN

In beide afbeeldingen moeten altijd de volgende drie elementen aanwezig zijn.

### A. PAARS SPOOKJE

- Herkenbare paarse cartoonspookvorm.
- Groot, vrolijk en expressief gezicht.
- Glanzende 3D-afwerking.
- Dikke donkere contourlijnen.
- Mag thematische accessoires dragen.
- Mag een klein voorwerp vasthouden dat bij het thema past (bij vriendenweekend: een klein bierglas).
- Moet duidelijk zichtbaar blijven.

### B. GELE BANAAN

- Duidelijk herkenbare gele cartoonbanaan.
- Vrolijk gezicht met grote mond.
- Draagt bij het vriendenweekend een zwarte zonnebril.
- Mag een voorwerp vasthouden dat bij het thema past (bij vriendenweekend: een bierglas).
- Mag een duim omhoog steken.
- Glanzende gele 3D-afwerking.
- Moet als banaan herkenbaar blijven.

### C. ZWARTE BOM

- Zwarte ronde cartoonbom.
- Duidelijk zichtbare lont.
- Kleine heldere geel-oranje vonk.
- Expressief cartoongezicht.
- Glanzende zwarte 3D-afwerking.
- Dikke contourlijnen.

### Belangrijke voorwaarden

- Alle drie de elementen zijn verplicht.
- Ze mogen niet verdwijnen of worden vervangen.
- Ze mogen geen letters afdekken.
- Ze worden compact rondom de hoofdnaam geplaatst.
- Ze zijn duidelijk herkenbaar, maar ondergeschikt aan POINT RUSH.

---

## 5. AUTOMATISCHE THEMA-INTERPRETATIE

Gebruik het opgegeven thema om het logo creatief aan te passen.

Pas uitsluitend de volgende onderdelen thematisch aan:

- Kleding van de mascotte.
- Accessoires van de personages.
- Gezichtsuitdrukkingen.
- Houding en beweging.
- Kleine decoraties direct rondom de letters.
- Lichteffecten op de figuren.
- Kleine voorwerpen die de mascottes vasthouden.
- Subtiele details op de paarse banner.

### Voorbeelden

**Vriendenweekend:** Bierglazen, zonnebrillen, feestelijke kleding, uitbundig lachen en vrolijke groepssfeer.

**Valentijn:** Hartjes, roze accenten, romantische accessoires en liefdevolle gezichtsuitdrukkingen.

**Halloween:** Kleine pompoenen, heksenhoedjes, paarse en oranje highlights en speels griezelige gezichten.

**Kerst:** Kerstmutsen, cadeautjes, kleine sneeuwaccenten en feestelijke accessoires.

**Zomerfeest:** Zonnebrillen, tropische drankjes, zomerse kleding en vrolijke kleuren.

### Cruciale regel

**Het thema mag nooit worden uitgebeeld met een landschap of achtergrondscène.**

Dus bij een vriendenweekend:

- Wel bierglazen, zonnebrillen en feestelijke mascottes.
- Geen campinglandschap.
- Geen tenten op de achtergrond.
- Geen bomen.
- Geen lucht of zonsondergang.
- Geen grasveld.
- Geen complete feestlocatie.

Het thema moet herkenbaar zijn door de figuren en hun accessoires.

Voeg de themanaam NIET als extra tekst toe.

Alleen deze teksten zijn toegestaan:

**POINT RUSH**

**by Hoekies**

---

## 6. ABSOLUTE PRIORITEIT – GEEN ACHTERGROND

Dit onderdeel is verplicht voor beide afbeeldingen.

### Transparantie

Maak een **vrijstaand 3D-logo met een volledig transparante achtergrond (alpha channel)**.

Het ontwerp bestaat uitsluitend uit:

1. De grote POINT RUSH-letters.
2. De paarse by Hoekies-banner.
3. De witte mascotte.
4. Het paarse spookje.
5. De gele banaan.
6. De zwarte bom.
7. Kleine thematische accessoires direct rondom de figuren en letters.

### VERBODEN ACHTERGRONDELEMENTEN

Voeg GEEN van de volgende elementen toe:

- Lucht.
- Zonsondergang.
- Wolken.
- Sterrenhemel.
- Bomen.
- Bossen.
- Bergen.
- Landschap.
- Grasveld.
- Grond.
- Tentenkamp.
- Kampeeromgeving.
- Gebouwen.
- Feestlocatie.
- Achtergrondverlichting.
- Lichtgevende achtergrondvlakken.
- Gekleurde rechthoeken.
- Cirkelvormige achtergronden.
- Decoratieve achtergrondpanelen.
- Achtergrondframes.
- Achtergrondbanners achter het complete logo.

### Belangrijk onderscheid

De paarse banner met **by Hoekies** hoort bij het logo en moet behouden blijven.

Ook de paarse 3D-contouren en schaduwen direct achter de letters horen bij het logo.

Deze zijn toegestaan.

Een groot vlak achter de totale compositie is NIET toegestaan.

### Gewenste visuele uitstraling

Het resultaat moet lijken op een professioneel uitgesneden 3D-gaminglogo of een hoogwaardige digitale sticker.

De buitencontour van de afbeelding volgt nauwkeurig de letters, mascottes en accessoires.

Alles buiten deze contour moet volledig transparant zijn.

**Geen witte achtergrond, geen zwarte achtergrond, geen gekleurde achtergrond en geen schaakbordpatroon dat als afbeelding is meegetekend.**

---

## 7. AFBEELDING 1 – BREED LOGO

### Formaat

- Horizontale compositie.
- Beeldverhouding ongeveer 3:1.
- Hoge resolutie.
- PNG met transparante achtergrond.

### Compositie

Plaats de onderdelen als volgt:

**LINKS:**

- Grote witte mascotte.
- Lachend en in een feestelijke houding.
- Kleding, hoofddeksel en accessoires passend bij het thema (bij vriendenweekend: paarse pet achterstevoren, zonnebril op de pet en bierglas met schuim omhoog).

**MIDDEN:**

- Zeer grote tekst POINT RUSH.
- Beide woorden naast elkaar op exact één horizontale regel.
- POINT in glanzend wit.
- RUSH in geel-oranje 3D.
- Dikke paarse contourlijnen.

**BOVEN DE LETTERS:**

- Vrolijk paars spookje.
- Gele banaan met een accessoire passend bij het thema (bij vriendenweekend: zonnebril).
- Eventueel kleine feestelijke details.

**RECHTS:**

- Zwarte bom met brandende lont en heldere vonk.

**ONDER DE LETTERS:**

- Paarse banner met exact de tekst by Hoekies.

### Verhoudingen

- POINT RUSH blijft de belangrijkste blikvanger.
- De mascotte is prominent, maar niet groter dan de hoofdnaam.
- Het spookje en de banaan zijn duidelijk herkenbaar.
- De bom staat compact tegen de rechterzijde.
- De by Hoekies-banner is goed leesbaar.
- Geen onderdelen worden afgesneden.

### Achtergrond

Volledig transparant.

Er mag GEEN landschap, lucht, boom, tent, grasveld of ander achtergrondobject zichtbaar zijn.

De illustratie moet een compacte, vrijstaande compositie vormen.

---

## 8. AFBEELDING 2 – VIERKANT LOGO

### Formaat

- Ongeveer vierkante compositie.
- Beeldverhouding ongeveer 1:1.
- Hoge resolutie.
- PNG met transparante achtergrond.

### Compositie

Ontwerp een aparte compositie voor dit formaat.

**NIET simpelweg het brede logo bijsnijden.**

### BOVENSTE DEEL

- Grote witte mascotte centraal.
- Kleding, hoofddeksel en accessoires passend bij het thema (bij vriendenweekend: paarse pet achterstevoren, zonnebril op de pet en bierglas met schuim omhoog).
- Vrolijk gezicht.
- Paars spookje links van de mascotte.
- Gele banaan rechts van de mascotte.

### MIDDEN

Plaats de merknaam groot op twee regels:

**POINT**

**RUSH**

- POINT in glanzend wit.
- RUSH in geel-oranje.
- Dikke paarse contouren.
- Sterke 3D-dieptewerking.
- Goed leesbaar op kleine afmetingen.

### RECHTERZIJDE

- Zwarte bom met brandende lont.
- Duidelijk zichtbaar naast de tekst.
- Geen letters afdekken.

### ONDERSTE DEEL

- Paarse banner met exact de tekst by Hoekies.

### Verhoudingen

- POINT RUSH blijft visueel dominant.
- De vier personages zijn duidelijk herkenbaar.
- Compacte, uitgebalanceerde compositie.
- Geen onnodige lege ruimtes.
- Geen afgesneden onderdelen.

### Achtergrond

Volledig transparant.

De buitencontour volgt de figuren, letters en banner.

Er mag geen vierkant achtergrondvlak worden gemaakt.

Het logo moet vrijstaand zijn, net als een uitgesneden 3D-sticker.

---

## 9. VISUELE STIJL EN KWALITEIT

Gebruik voor beide ontwerpen:

- Premium 3D-cartoonillustratie.
- Professionele casual-gamingstijl.
- Heldere, krachtige kleuren.
- Glanzende materialen.
- Subtiele highlights.
- Zachte 3D-schaduwen.
- Dikke donkerpaarse contourlijnen.
- Sterk contrast.
- Scherpe en vloeiende afwerking.
- Expressieve gezichten.
- Vrolijke, energieke uitstraling.
- Hoge detailkwaliteit.
- Strakke vrijstaande buitencontouren.

### Vermijd

- Fotorealisme.
- Platte minimalistische iconen.
- Onscherpe details.
- Vervormde letters.
- Onleesbare tekst.
- Te veel decoratie.
- Landschappen.
- Achtergrondscènes.
- Achtergrondvlakken.
- Extra woorden.
- Watermerken.
- Afgesneden figuren.
- Losse voorwerpen ver buiten de hoofdcompositie.

---

## 10. CONSISTENTIE TUSSEN BEIDE LOGO'S

De twee afbeeldingen moeten duidelijk onderdeel zijn van dezelfde POINT RUSH-thema-editie.

Gebruik in beide afbeeldingen:

- Dezelfde witte mascotte.
- Dezelfde kleding en hetzelfde hoofddeksel.
- Dezelfde accessoires.
- Dezelfde kleurstelling.
- Dezelfde gezichtsuitdrukking of vergelijkbare vrolijke expressie.
- Dezelfde 3D-letterstijl.
- Hetzelfde paarse spookje.
- Dezelfde gele banaan.
- Dezelfde zwarte bom.
- Dezelfde voorwerpen die de figuren vasthouden.
- Dezelfde stijl voor de by Hoekies-banner.
- Dezelfde glans, schaduwen en contourlijnen.

Alleen de plaatsing, houding en schaal van de onderdelen mogen veranderen om de formaten goed te vullen.

**Maak geen twee verschillende interpretaties van hetzelfde thema.**

---

## 11. VERPLICHTE KWALITEITSCONTROLE

Controleer beide ontwerpen voor oplevering.

### Tekst

- [ ] POINT RUSH exact gespeld.
- [ ] by Hoekies exact gespeld.
- [ ] Beide teksten volledig zichtbaar.
- [ ] POINT RUSH groot en dominant.
- [ ] Breed logo: POINT RUSH op één regel.
- [ ] Vierkant logo: POINT boven RUSH.
- [ ] Geen letters bedekt door accessoires.

### Personages

- [ ] Expressieve witte mascotte aanwezig.
- [ ] Paars spookje aanwezig.
- [ ] Gele banaan aanwezig.
- [ ] Zwarte bom met lont aanwezig.
- [ ] Dezelfde kleding en accessoires in beide afbeeldingen.

### Achtergrond

- [ ] Volledig transparante achtergrond.
- [ ] Geen lucht.
- [ ] Geen bomen.
- [ ] Geen landschap.
- [ ] Geen grasveld.
- [ ] Geen achtergrondscène.
- [ ] Geen rechthoekig of rond achtergrondvlak.
- [ ] Buitencontour volgt de logo-elementen.
- [ ] Transparantie daadwerkelijk aanwezig in het PNG-bestand.

### Vormgeving

- [ ] Thema duidelijk herkenbaar.
- [ ] Consistente stijl tussen beide afbeeldingen.
- [ ] Breed logo ongeveer 3:1.
- [ ] Vierkant logo ongeveer 1:1.
- [ ] Geen afgesneden elementen.
- [ ] Geen extra teksten.

Als elementen elkaar overlappen of de compositie te druk wordt, verklein dan de accessoires of personages.

**Verklein nooit POINT RUSH om meer decoratie mogelijk te maken.**

---

## 12. DEFINITIEVE GENERATIEOPDRACHT

Genereer precies **TWEE LOSSE AFBEELDINGEN**.

### OUTPUT 1 – POINT RUSH BREED

- Ongeveer 3:1.
- POINT RUSH groot op één regel.
- Witte mascotte links.
- Paars spookje en gele banaan boven of naast de letters.
- Zwarte bom rechts.
- by Hoekies op paarse banner onder de hoofdnaam.
- Thema verwerkt in kleding, gezichten en accessoires.
- Volledig transparante achtergrond.
- Geen landschap of achtergronddecoratie.

### OUTPUT 2 – POINT RUSH VIERKANT

- Ongeveer 1:1.
- POINT boven RUSH.
- Grote mascotte boven de tekst.
- Paars spookje links.
- Gele banaan rechts.
- Zwarte bom naast de letters.
- by Hoekies op paarse banner.
- Identieke mascotte en themastijl.
- Volledig transparante achtergrond.
- Geen landschap of achtergronddecoratie.

**Genereer twee afzonderlijke PNG-bestanden. Plaats de logo's niet samen in één afbeelding.**

Maak bij voorkeur eerst het brede logo en gebruik dit als aanvullende visuele referentie voor de vierkante versie.

### HOOGSTE PRIORITEIT

1. POINT RUSH groot en correct gespeld.
2. by Hoekies volledig leesbaar.
3. Dezelfde expressieve witte mascotte.
4. Paars spookje, gele banaan en zwarte bom.
5. Thema zichtbaar via personages en accessoires.
6. Geen achtergrond of omgeving.
7. Transparante PNG-bestanden.
8. Twee consistente composities.

### EINDRESULTAAT

Twee professionele, vrijstaande POINT RUSH 3D-gaminglogo's met een transparante achtergrond.

De afbeeldingen moeten eruitzien als hoogwaardige, glanzende, uitgesneden gamingstickers.

**GEEN ACHTERGRONDSCÈNE. ALLEEN HET LOGO, DE MASCOTTES, DE GAME-ELEMENTEN EN DIRECT BIJBEHORENDE ACCESSOIRES.**`;

// Eén logo per bericht: voor Gemini, en als reserve als ChatGPT er maar één maakt. Dezelfde prompt, met onderaan wat nu moet.
export const logoBreedPrompt = (thema: string) => `${logoPrompt(thema)}

---

## MAAK IN DIT BERICHT ALLEEN OUTPUT 1 – POINT RUSH BREED

Maak nu alleen het brede logo, als één afbeelding van ongeveer 3:1. Het vierkante logo volgt in een volgend bericht.`;

export const logoVierkantPrompt = (thema: string) => `${logoPrompt(thema)}

---

## MAAK IN DIT BERICHT ALLEEN OUTPUT 2 – POINT RUSH VIERKANT

Maak nu alleen het vierkante logo, als één afbeelding van ongeveer 1:1. Staat het brede logo al in deze chat, gebruik dat dan als extra referentie, met dezelfde mascotte en dezelfde thematische uitstraling.`;

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
