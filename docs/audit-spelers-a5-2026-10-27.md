# Audit spelershandleiding A5

Datum: 27 oktober 2026. Onderzocht: de daadwerkelijke kaart `public/handleiding.jpg`, bronafbeelding `extra info/instructiekaart/instructiekaart.png`, miniatuur, ontwerpprompt, aanbieden/delen en de printfunctie. Alleen audit; geen bestaande kaart, spelcode of spelregels aangepast.

## Oordeel

De kaart is herkenbaar, vriendelijk en logisch verdeeld over twee vouwhelften. Alle tien itemtypen zijn opgenomen en de uitlegknop, kaartkleuren, kompasbediening en hulpknop zijn terug te vinden in de huidige app. **De kaart is bruikbaar als korte introductie, maar de iteminstructie en enkele tips moeten preciezer.** Voor de volgende versie verdient leesbaarheid voorrang boven decoratie.

Er zijn **9 bevindingen: 7 middel en 2 laag**. Dit zijn inhoudelijke en vormgevingspunten; geen claim dat een kort instructiekaartje alle appfuncties moet uitleggen.

## Bewijs en methode

- De actuele JPG visueel bekeken op de oorspronkelijke 1024 × 1536 pixels en op een A5-voorbeeld in Chrome.
- De echte `printKaart`-functie uit `components/admin/InfoKnop.tsx` uitgevoerd in een geïsoleerde omgeving om de print-HTML te verkrijgen. Alleen het afbeeldingsadres is vervangen door een lokaal bestandsadres. Chrome heeft met de bestaande print-CSS een PDF gemaakt.
- PDF heeft één pagina en een MediaBox van 420 × 594,95996 punten: ongeveer 148,17 × 209,89 mm, met browserafronding rond A5.
- Bron, distributiebestand en miniatuur op afmetingen en visuele overeenkomst gecontroleerd. JPG is 259.765 bytes; miniatuur is 240 × 360 pixels en 18.796 bytes. De bestanden tonen dezelfde kaart; verschillen door verkleinen/compressie zijn te verwachten.
- Kaartteksten vergeleken met de huidige spelerscomponenten en helpers voor items, puzzel en teamfoto.

Artikelen in deze map: [printproef als PDF](audit-spelers-a5/spelers-a5-printproef.pdf), [A5-pasvorm](audit-spelers-a5/a5-pasvorm.png), [metingen](audit-spelers-a5/metingen.json), [printcontrolescript](audit-spelers-a5/printcontrole.cjs). Het script vereist een lokale Chrome-debugsessie op poort 9470.

Geen fysieke printer, gevouwen papieren exemplaar, gebruikerstest of daadwerkelijke WhatsApp-verzending getest. Geen formele toegankelijkheids- of contrastmeting uitgevoerd. Leesbaarheidsadviezen zijn een beoordeling van de voorbeelden; ze moeten met een afdruk op 100% worden bevestigd.

## A5-01 — Middel: de algemene iteminstructie klopt niet voor alle items

**Op de kaart:** 'Loop over een item om het te pakken. Tik onderin op het item om het te gebruiken.'

**Werkelijke werking:** de ster en het vraagteken worden normaal direct uitgevoerd. Plek zooi is een onzichtbare val en komt niet als inzetbaar item in de balk. Andere items kunnen ook als startpakket worden uitgedeeld na het lopen; niet alles hoeft op de kaart te worden opgepakt. De korte toelichting bij de ster noemt wel 'meteen', maar corrigeert de algemene instructie slechts gedeeltelijk.

**Bronnen:** `components/speler/SpelerKaart.tsx:290` en `:763`–`:806`; `lib/startitems.ts`; `components/speler/SpeciaalItemLegende.tsx:26`–`:36`.

**Voorstel:** 'Loop langs items om ze te pakken. Ster en vraagteken werken meteen. Andere items gebruik je via de balk onderin. Plek zooi is een onzichtbare val.' Als de ruimte krap is, maak een aparte korte regel 'Sommige items krijg je bij de start'.

**Acceptatie:** een beginner begrijpt waarom ster, vraagteken en val niet als normale knop in de balk verschijnen. Geen exacte punten of valduur op de generieke kaart vastleggen: die kunnen per route verschillen. De bekende uitvoeringsfouten uit de itemaudit horen in de app te worden opgelost; pas de speluitleg niet aan om die fouten als spelregel te presenteren.

## A5-02 — Middel: puzzelwoordtip stelt een instelbare regel als vast feit

**Op de kaart:** 'Puzzelwoord: elke goede vraag = een letter' en 'Bij de finish: tik Start en raad het woord in 1 minuut'.

De puzzel kan uitstaan. De beheerder kan per vraag nul, één of twee letters kiezen. Bij een volledig gevonden/opgelost woord hoeft het team niet meer te raden; de Start-knop verschijnt dan niet. Ook ontbreekt in de kaarttip dat het team maar **één poging** heeft. Dat heeft meer invloed op spelersgedrag dan de details van de letterverdeling.

**Bronnen:** `lib/puzzel.ts:24`–`:29`; `lib/puzzel-server.ts:15`–`:31`; `components/speler/PuzzelWoord.tsx:98`–`:115`.

**Voorstel:** 'Puzzel aan? Goede antwoorden kunnen letters opleveren. Nog letters over? Tik bij de finish op Start: 1 minuut, één poging.'

**Acceptatie:** de kaart werkt met puzzel aan én uit, belooft niet precies één letter per vraag en maakt de eenmalige gok duidelijk. Laat technische migratievarianten buiten de spelerskaart.

## A5-03 — Middel: een finishfoto is niet automatisch een podiumfoto

**Op de kaart:** 'Finish: groepsfoto of selfie = jullie foto op het podium'.

Alleen een **goedgekeurde** foto bij het eindpunt wordt als teamfoto gebruikt. De organisatie kan de finishopdracht aanpassen of verwijderen. Bovendien toont het podium alleen de eerste drie plaatsen; ook andere teams kunnen hun foto terugzien in andere onderdelen, zoals hun eigen finishscherm of oorkonde. De huidige formulering wekt een onvoorwaardelijke verwachting.

**Bron:** `lib/teamfoto.ts:7`–`:33`; `components/speler/Podium.tsx:11`; `components/speler/FinishScherm.tsx:109` en `:131`.

**Voorstel:** 'Foto-opdracht bij de finish? Na goedkeuring verschijnt jullie foto bij de uitslag.'

**Acceptatie:** spelers verwachten geen zichtbare foto vóór keuring en geen gegarandeerde plek op het podium.

## A5-04 — Middel: de startstappen sluiten niet precies aan op de schermvolgorde

**Op de kaart:** stap 3 'Zet locatie en geluid aan', stap 4 'Druk op "Op pad!"'.

In het introductiescherm bedient de speler eerst **OK, BEGREPEN**. Dit ontgrendelt/test audio en vraagt locatietoegang; bij succes start de sessie normaal automatisch. **GA OP PAD** is daar een terugvalknop. Later kan bij het startpunt een welkomstscherm met **Op pad!** verschijnen. De kaart haalt deze momenten samen, waardoor een speler een specifieke knop kan zoeken die nog niet zichtbaar is. De oranje stippellijn bij de startvraag is eveneens afhankelijk van de route/startvraag.

**Bronnen:** `components/speler/IntroScherm.tsx:90`, `:290`–`:324`; `components/speler/VraagPopup.tsx:570`–`:580`; startvraagafhandeling in `SpelerKaart.tsx`.

**Voorstel voor stappen 3–4:** 'Tik op OK, begrepen. Sta locatie toe en controleer het geluid.' / 'Volg de startuitleg en loop naar het aangegeven punt.' De specifieke knop `Op pad!` kan als voorbeeld blijven staan als duidelijk is wanneer die verschijnt.

**Acceptatie:** loop de kaart naast een nieuwe teamlogin door, zowel met als zonder startvraag. Elke stap moet naar de eerstvolgende zichtbare handeling leiden.

## A5-05 — Middel: 2:3 is geen A5-verhouding

De afbeelding is 1024 × 1536, verhouding 0,6667. A5 is 148 × 210 mm, verhouding ongeveer 0,7048. De bestaande printfunctie gebruikt `object-fit: contain` en behoudt de verhouding. Het beeld wordt daardoor ongeveer **140 × 210 mm**, met circa **4 mm witte ruimte aan weerszijden**. De inhoud wordt kleiner dan bij gebruik van de volle A5-breedte. De ontwerpprompt vraagt expliciet 2:3 én noemt dat A5: de afwijking zit dus ook in de specificatie.

**Bronnen:** `docs/afbeelding-prompt-spelers-a5.md:13`; `components/admin/InfoKnop.tsx:24`–`:35`; lokale Chrome-meting: afbeelding 529,33 pixels breed in een viewport van 559 pixels.

De huidige printproef heeft **geen afgekapt paneel en geen tweede pagina**. Witte zijranden zijn op zichzelf niet fout als ze bewust gewenst zijn; ze moeten dan als ontwerpkeuze worden vastgelegd.

**Opdracht:** kies expliciet voor exact A5 of de huidige verhouding met zijranden. Voor exact A5: maak de master op 148 × 210 mm; bijvoorbeeld ongeveer 1748 × 2480 pixels bij 300 ppi. Rondingen van één pixel zijn normaal. Update tegelijk de prompt en printinstructies.

**Acceptatie:** afdruk op 100%, één A5-pagina, bewuste marges en vouwlijn op 105 mm. Controleer ook op een printer met niet-bedrukbare randen; randloos papier is niet door de huidige proef bewezen.

## A5-06 — Middel: veel kleine tekst in de onderste helft

De items en tips bevatten veel zinnen in twee smalle kolommen. Meerdere teksten lopen door naar een tweede regel, bijvoorbeeld Spook, Banaan, Vraagteken en de finishfoto. Op de A5-preview is dit merkbaar compacter dan de vier startstappen. Het logo, de grote bovenruimte en de twee sloganbalken nemen tegelijk een flink deel van de beschikbare ruimte in.

Dit is **geen gemeten lettergrootte**: de letters zitten in een rasterafbeelding, dus er zijn geen betrouwbare CSS-fontmaten beschikbaar. De effectieve resolutie bij 210 mm hoogte is ongeveer 186 ppi. Een grotere pixelmaster kan de scherpte verbeteren, maar maakt fysiek kleine tekst niet groter.

**Opdracht:** verkort zinnen en maak logo/bovenruimte en onderste slogan compacter, zodat bodytekst en regelafstand kunnen groeien. Gebruik bij heropmaak als ontwerpdoel ongeveer 10–11 pt bodytekst, of groter als de doelgroep dat vraagt. Dit is een leesbaarheidsadvies, geen wettelijke minimumeis.

**Acceptatie:** print op 100%, vouw dubbel en laat een nieuwe speler de start, een item en de eenmalige puzzelpoging zonder zoomen aanwijzen/lezen. Controleer in normaal daglicht; een vergrote schermweergave is onvoldoende.

## A5-07 — Middel: kernregel en herstelhulp verdienen ruimte

De kaart vertelt hoe je begint en noemt alle items, maar zegt niet expliciet **hoe je wint**. De onderste slogan 'Pak de punten en maak het woord!' kan bovendien suggereren dat het woord verplicht is, terwijl de puzzel uit kan staan. De kaart noemt wel 'Niet bereikbaar?', maar geeft geen hulp bij geweigerde locatie of een ontbrekende vraag door geen bereik.

Een A5-kaart hoeft geen volledige foutencatalogus te worden. Eén kernregel en één herstelregel zijn nuttiger dan nog meer functiedetails.

**Bronnen:** `components/speler/SpeciaalItemLegende.tsx:47`–`:62` ('Het team met de meeste punten wint'); `components/speler/IntroScherm.tsx:342`–`:354`; `components/speler/VraagPopup.tsx:526`–`:534`.

**Voorstel:** bovenin 'Beantwoord vragen, verzamel punten. Het team met de meeste punten wint.' Onderaan 'Vraag niet geladen? Probeer opnieuw bij bereik. Locatie geweigerd? Vraag hulp aan de organisatie.' Overweeg daarnaast kort 'Houd het spel open'.

**Acceptatie:** een nieuwe speler kan na het lezen het doel van het spel benoemen en weet wat te doen als starten of laden niet lukt. Beloof geen foutloos offline spelen; de eerdere speleraudit beschrijft nog herstelproblemen in de app.

## A5-08 — Laag: de digitale kaart is uitsluitend een rasterafbeelding

De gedeelde spelerskaart is een JPG; de gegenereerde print-PDF bevat eveneens een afbeelding. De tekst is daarin niet als gewone tekst te selecteren, doorzoeken of aan te passen aan grotere systeemletters. Eventuele automatische tekstherkenning verschilt per toestel en is geen vervanging voor een tekstversie. De miniatuur heeft een alttekst met de titel, geen tekstalternatief voor de instructies.

**Bronnen:** `components/admin/InfoKnop.tsx:16`, `:90`; `components/admin/WhatsAppVenster.tsx:42`; bestaande tekstbron `docs/spelersinstructies.md`.

**Opdracht:** bied naast de afbeelding een voor spelers bereikbare, actuele HTML-tekstversie aan en deel de link mee. Gebruik bij een volgende printmaster echte tekst, bijvoorbeeld in een HTML/SVG/PDF-opmaak, zodat wijzigingen controleerbaar blijven. Een nieuwe AI-afbeelding is niet nodig om deze audit op te lossen.

**Acceptatie:** dezelfde kernuitleg is ook leesbaar met tekstvergroting en voorlezen; kaart en tekstversie spreken elkaar niet tegen. De bestaande Markdown in de repository is nog geen aantoonbaar bereikbare spelerspagina.

## A5-09 — Laag: donkere achtergrond is minder geschikt voor veel printen

De paarse achtergrond bedekt vrijwel het volledige beeld. Dat past bij de spelstijl, maar vraagt veel inkt/toner en kan bij een snelle of zwart-witafdruk minder onderscheid geven tussen panelen, tekst en glansranden. Dit is een praktisch ontwerppunt; verbruik en grijswaardencontrast zijn niet op een echte printer gemeten.

**Opdracht:** behoud deze kleurrijke versie voor digitaal delen en overweeg een lichte printvariant met dezelfde indeling en symbolen. Gebruik tekst/symbolen naast kleur. Bied de varianten duidelijk benoemd aan.

**Acceptatie:** een gewone zwart-witafdruk blijft begrijpelijk en de printvariant hoeft geen grote donkere vlakken te vullen.

## Wat goed zit

- De hoofdindeling 'start → kaart → items → tips' is snel te herkennen.
- Beide helften blijven vrij van tekst/panelen over de vouwlijn; de lijn ligt op de helft van de afbeelding.
- De panelen hebben visuele buitenmarges en voldoende afstand tot de vouwlijn.
- Alle tien itemtypen staan met herkenbare namen en iconen op de kaart.
- Geen vaste bom-/sterpunten of instelbare spook-/valduur: de kaart blijft daardoor op dat punt bruikbaar voor verschillende routes.
- De oranje `?`-knop bestaat daadwerkelijk; de kaart hoeft op dit punt niet naar een `i`-knop te worden gewijzigd. De lopende teksthandleiding noemt elders nog wel `i`.
- De kompasactie 'tik op de afstand' en de knop 'Niet bereikbaar?' komen overeen met de app.
- Het distributiebestand blijft onder de 600 KB uit de prompt; de miniatuur is klein en wordt afzonderlijk geladen.

## Compacte tekstbasis voor Claude

Dit is een voorstel voor de kernteksten, geen vervanging van de bestaande kaart:

**Doel:** Beantwoord vragen en verzamel punten. Het team met de meeste punten wint.

**Start:** Scan je teamkaartje. Kies teamnaam en icoon. Tik op OK, begrepen en sta locatie toe. Controleer het geluid en volg de startuitleg.

**Items:** Ster en vraagteken werken meteen. Andere items gebruik je via de balk onderin. Pas op voor onzichtbare vallen. Je kunt ook startitems krijgen.

**Puzzel:** Puzzel aan? Goede antwoorden kunnen letters opleveren. Nog letters over? Tik bij de finish op Start: 1 minuut, één poging.

**Foto:** Foto-opdracht bij de finish? Na goedkeuring verschijnt jullie foto bij de uitslag.

**Hulp:** Punt niet bereikbaar? Tik op Niet bereikbaar? Vraag niet geladen? Probeer opnieuw bij bereik of vraag de organisatie om hulp.

Werk eerst deze tekstcorrecties uit en beslis daarna over exact A5 en de printvariant. Bewaar de goede vouwverdeling. Vervang bij een latere goedgekeurde heropmaak bronbestand, JPG én miniatuur tegelijk en controleer de printproef opnieuw.
