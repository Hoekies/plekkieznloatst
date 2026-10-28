# Grafische audit van het finishscherm

Datum: 27 oktober 2026. Scope: huidige `FinishScherm`, podium, scorekaarten, standregels en de presentatie rond het delen van de oorkonde. Alleen audit; geen applicatiecode aangepast.

## Oordeel

De finish is herkenbaar en feestelijk. De visuele volgorde kop → score → acties is duidelijk. Het belangrijkste defect zit in het mobiele podium: de buitenste teams vallen buiten beeld. Daarnaast worden tijdwaarden afgekapt en wordt de voorlopige status onvoldoende meegenomen in de oorkonde en de volgorde van informatie.

## Methode en grenzen

De huidige React-componenten zijn opnieuw gerenderd in lokale Chrome-voorbeelden met de actuele CSS en beschikbare projectfonts. Negen combinaties: normaal vrijgegeven, wachten op vrijgave en lange namen/hoge scores, ieder op 320, 390 en 1366 pixels breed bij 844 pixels hoogte. Per combinatie een afbeelding bovenaan en bij de uitslag: achttien screenshots. Metingen staan in [audit-finish-grafisch/metingen.json](audit-finish-grafisch/metingen.json).

Dit zijn statische componentvoorbeelden met fictieve teams, een vereenvoudigde spelersheader en zonder React-hydratatie. De score is voor de preview op zijn eindwaarde gezet; anders toont server-rendering de beginwaarde 0 van de teller. De viewportposities zijn dus indicatief voor de echte pagina. Binnen het podium en de scorekaarten worden de actuele componenten/CSS gebruikt. Geen echte accounts of databasewijzigingen. De puzzel, inventaris, itempop-up, uploadfoto's, share-API en de feitelijke PNG-export zijn niet interactief getest. Bevindingen over de oorkonde en seizoenkoppeling berusten op broncodeonderzoek. Geen volledige toegankelijkheids- of contrastcertificering.

## Bevindingen en concrete opdrachten voor Claude

### FG01 — Hoog: podium valt op mobiel buiten beeld

**Bewijs:** bij 390 pixels is de podiumcontainer 358 pixels breed, maar de inhoud heeft 381 pixels nodig. Met lange namen wordt dat 442 pixels. Bij 320 pixels heeft zelfs de normale stand 346 pixels inhoud in een container van 288 pixels. De screenshot laat links een afgekapte tweede plaats en rechts een afgesneden derde plaats zien. De buitenste finishcontainer verbergt overflow, waardoor de gebruiker het ontbrekende deel niet kan bekijken.

**Locatie:** `styles/globals.css:2530`–podiumregels, vooral `.podium-plek` op regel 2531 en `.podium-naam` op regel 2536; `components/speler/Podium.tsx:21`.

**Aanpassing:** geef de drie kolommen een expliciete mogelijkheid om onder hun minimale inhoudsbreedte te krimpen, bijvoorbeeld grid met `repeat(3, minmax(0, 1fr))` of flex met `min-width: 0` op de relevante kolommen en naamcontainers. Laat namen binnen die kolommen afbreken tot twee regels. Alleen overflow verbergen maskeert het probleem.

**Acceptatie:** drie volledige podiumblokken, medailles en scores op 320 en 390 pixels, ook bij lange namen; inhoudsbreedte niet groter dan podiumbreedte.

Voorbeeld: [normaal-390-uitslag.png](audit-finish-grafisch/normaal-390-uitslag.png).

### FG02 — Middel: volledige speeltijd verdwijnt achter puntjes

**Bewijs:** `1:00:00` heeft bij 320 pixels 91 pixels nodig, maar krijgt 75 pixels. Het scherm toont `1:00…`. Bij 390 pixels wordt ook `10:00:00` afgekapt: 106 pixels tekst in 99 pixels ruimte. Dit is een kerncijfer dat volledig leesbaar hoort te zijn.

**Locatie:** `styles/globals.css:3851` en `:3859`, `.finish-stats` en `.finish-stat-waarde`.

**Aanpassing:** gebruik een compactere lettergrootte voor tijd op smalle schermen, geef de tijdkaart meer ruimte of schakel de kaarten bij beperkte breedte om naar een andere indeling. Behoud de volledige waarde; pas dezelfde controle toe op negatieve en hoge scores.

**Acceptatie:** `1:00:00`, `10:00:00`, `123456` en een negatieve score volledig zichtbaar op 320 en 390 pixels zonder ellipsis.

### FG03 — Middel: gedeelde oorkonde noemt voorlopige punten zonder waarschuwing

**Bewijs uit code:** de knop `Oorkonde delen` verschijnt ook vóór vrijgave. De component ontvangt wel `plaats=null`, maar geen voorlopige status. Het kaartje vermeldt gewoon het puntenaantal, ook als nog foto's of itemeffecten kunnen volgen. Op het scherm staat wel `punten (voorlopig)`; op het deelbare kaartje ontbreekt die nuance.

**Locatie:** `components/speler/FinishScherm.tsx:130`; `components/speler/Oorkonde.tsx:9`, `:38` en `:56`.

**Aanpassing:** geef de vrijgavestatus door en toon duidelijk `Voorlopige score` op het kaartje en eventueel de knop. Alternatief: deel vóór vrijgave uitsluitend een finishbewijs zonder punten. Kies één consistente productregel.

**Acceptatie:** een afbeelding die vóór vrijgave wordt gedeeld, kan niet voor een definitieve uitslag worden aangezien. De definitieve versie toont plaats en definitieve punten.

### FG04 — Middel: uitleg over wachten staat pas onder de deel- en terugkijkacties

**Bewijs:** bij de wachtvariant staat de belangrijke uitleg over vrijgave en drie foto's in de keuring onder de oorkonde en twee terugkijkknoppen. Op het voorbeeld van 320 × 844 pixels begint het wachtvak pas onderin beeld. De sectie heet al `Eindstand` terwijl er nog geen vrijgegeven stand is.

**Locatie:** `components/speler/FinishScherm.tsx:130`–`:220`.

**Aanpassing:** zet een compacte statusmelding direct onder de scorekaarten: `Voorlopige score — 3 foto's in de keuring`. Laat de sectiekop vóór vrijgave bijvoorbeeld `Wachten op de uitslag` heten. Plaats delen en terugkijken daarna. De precieze fototeller moet actueel blijven als die als status wordt gepresenteerd; de huidige prop wordt niet door de leaderboardpoll ververst.

**Acceptatie:** direct bij de score is zichtbaar of deze definitief is en waarom het team wacht; vrijgave verwijdert de wachtstatus.

Voorbeeld: [wacht-320.png](audit-finish-grafisch/wacht-320.png).

### FG05 — Middel: lange teamnamen worden onherkenbaar

**Bewijs:** kop, podium en stand gebruiken afkappen met puntjes. In de stresstest krijgen teams met dezelfde beginwoorden vrijwel dezelfde zichtbare naam. In een standregel krijgt de naam bij een zescijferige score nog minder ruimte; `(jij)` kan eveneens uit beeld verdwijnen.

**Locatie:** `styles/globals.css:3848`, `:2536`; `components/speler/StandRij.tsx:46`–`:56`.

**Aanpassing:** toon teamnamen op maximaal twee regels, bied bij langere namen een toegankelijke manier om de volledige naam te bekijken en maak de eigen-teammarkering onafhankelijk van de afgekorte naam. Stem dit af met FG01.

**Acceptatie:** teams die alleen aan het einde van de naam verschillen zijn te onderscheiden; de eigen ploeg blijft herkenbaar bij lange namen en hoge scores.

### FG06 — Middel: finish gebruikt de aanwezige seizoenthema's nog niet

**Bewijs uit code:** de finishkop gebruikt vaste paars/roze/gouden kleuren en vaste finishvlaggen. `lib/finish-thema.ts` bevat de eerder voorbereide thema's, maar wordt nergens in `app` of `components` gebruikt. Er is geen thema-prop in het huidige finishscherm. Het seizoenslogo in de header maakt de finishkop zelf dus nog niet seizoensafhankelijk.

**Locatie:** `styles/globals.css:3829`–`:3847`; `components/speler/FinishScherm.tsx:18`; `app/speler/finish/page.tsx`; `lib/finish-thema.ts:22`.

**Aanpassing:** verbind de finish met dezelfde seizoenskeuze als de logo's, met een gedeeld palet voor achtergrond, accenten en confetti. Behoud leesbare scorekleuren en herkenbare gouden/zilveren/bronzen rangorde. Zie ook [de bestaande overdracht](overdracht-claude-finish-seizoenen.md).

**Acceptatie:** controleer ten minste herfst/Halloween, winter/Kerst en de standaardvariant; logo en finish gebruiken dezelfde geldende themakeuze. Dit is een ontbrekende gewenste vormgevingsfunctie, geen oorzaak van de mobiele fouten.

### FG07 — Middel: kleine cijferlabels vragen veel leesinspanning

**Bewijs:** de scorekaartlabels zijn gemeten op 11,2 pixels; ook het label `punten` rechts in de stand is 0,7rem. De belangrijke aanduiding `(voorlopig)` staat daardoor in de kleinste tekst van de scorekaart.

**Locatie:** `styles/globals.css:3861`; `components/speler/StandRij.tsx:76`; voorlopige labeltekst in `FinishScherm.tsx:121`.

**Aanpassing:** maak labels ongeveer 13–14 pixels en geef de voorlopige status een eigen leesbare regel of badge. Dit is een leesbaarheidsadvies voor telefoongebruik buiten; geen claim dat een specifieke minimale lettergrootte door WCAG wordt vereist.

**Acceptatie:** labels en status blijven goed leesbaar op 320 pixels zonder de cijfers te verdringen; controleer tevens met grotere systeemtekst op een echte telefoon.

### FG08 — Laag: live-stip blijft bewegen bij 'minder beweging'

**Bewijs:** bij alle negen previews met `prefers-reduced-motion: reduce` blijft precies één oneindige CSS-animatie actief: `puls-dot`. De hoofdanimaties van finish en podium worden wel uitgeschakeld. Ook de confettihulp en scoreteller respecteren de instelling in hun code.

**Locatie:** inline animatie en keyframes in `components/speler/FinishScherm.tsx:241`–`:250`; bestaande finish-uitzondering in `styles/globals.css:3866`.

**Aanpassing:** geef de stip een klasse en schakel de puls uit in de bestaande mediaquery. De statische stip kan blijven staan.

**Acceptatie:** bij minder beweging geen oneindige animaties in het finishvoorbeeld; de status blijft herkenbaar.

## Wat goed werkt

- De finishkop, teamidentiteit en drie hoofdstatistieken zijn duidelijk gegroepeerd.
- De belangrijkste actieknoppen in de getoonde voorbeelden hebben comfortabele hoogtes; op 320 pixels breekt de terugkijktekst binnen zijn knop af.
- De eigen ploeg heeft een duidelijke cyaanrand en accentkleur in de stand.
- De uitslag is op desktop netjes begrensd tot een leesbare inhoudsbreedte.
- Het inhoudsvak heeft een scrollmechanisme; de lange stand kan in de previews verticaal worden bekeken.
- De belangrijkste feestanimaties hebben al een uitzondering voor minder beweging.

## Aanbevolen volgorde

Los eerst FG01 en FG02 op. Pak daarna FG03/FG04 samen aan als één consistente presentatie van voorlopige versus definitieve resultaten. Werk daarna naamweergave, labels en seizoenen uit. Controleer alle wijzigingen opnieuw met lange namen op 320/390 pixels en voer aansluitend een echte mobiele sessie uit met puzzel, nog inzetbare items, foto en het delen van de oorkonde. Die interactieve onderdelen vallen buiten deze metingen.
