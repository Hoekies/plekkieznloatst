# Grafische audit — PointRush

Datum: 26 oktober 2026. Beoordeeld door Codex op verzoek van René.

## Oordeel en afbakening

De vormgeving heeft een herkenbare identiteit: paars, geel/cyaan, ronde spelletters en opvallende scores. De spelersvragen hebben ruime antwoordknoppen. Het beheer heeft bruikbare patronen zoals een vaste opslaanbalk en tekst naast veel iconen. De belangrijkste verbeteringen zijn mobiele bereikbaarheid van acties en leesbaarheid. Daarna verdienen rust, duidelijke prioriteiten en een betrouwbaar spelersvoorbeeld aandacht.

Dit is een grafische audit met browsermetingen van componentvoorbeelden, geen volledige toegankelijkheidsverklaring of praktijktest van de liveapp. Er zijn **24 browserweergaven** gemaakt: login, dashboard, route-editor, vraag-editor, livekaart, finish, spelersvraag en een overzicht van bestaande knopstijlen, elk op 360, 390 en 1366 CSS-pixels breed. Telefoonvoorbeelden zijn 844 pixels hoog, desktopvoorbeelden 900 pixels.

De voorbeelden gebruiken de bestaande React-componenten, CSS, lokaal beschikbare lettertypen en fictieve teams. Navigatie en gegevensbronnen zijn vervangen door lokale voorbeelden. De omringende beheer-/spelerslayout is vereenvoudigd, kaarten en grafieken zijn placeholders en er is geen interactieve React-hydratatie uitgevoerd. Daardoor zijn bijvoorbeeld het echte kaartbeeld, het standaard inklappen van de mobiele teamlijst, login, scrollherstel na navigatie en gedrag van het telefoontoetsenbord niet beoordeeld. De bevindingen hieronder steunen op de genoemde component/CSS of een expliciete meting; de placeholders zijn geen ontwerpgebrek van de app.

Er zijn **8 bevindingen: 2 hoge prioriteit, 5 middelhoge prioriteit en 1 ontwerpaanbeveling**. Er is niets aan de vormgeving gerepareerd.

## G01 — Hoge prioriteit: dashboardacties vallen op de telefoon buiten beeld

**Locatie:** `styles/globals.css:1674` en `:2738`; `components/admin/SpelLeider.tsx`, actierij.

Bij een viewport van 390 pixels is het binnenpaneel 321 pixels breed, maar de actierij met Pauze, Stand, Eindtijd, Afronden en Opruimen is circa 444 pixels breed. Opruimen begint op x=396 en valt volledig buiten het scherm. Afronden valt al buiten het paneel. De pagina krijgt geen horizontale scrollbar die de ontbrekende actie vanzelf bereikbaar maakt.

De latere mobiele CSS dwingt `flex-wrap: nowrap` af, terwijl de knoppen samen niet passen. Dit is een probleem met de bestaande actierij, onafhankelijk van de nagebootste kaart.

**Aanpak:** gebruik twee rijen of een expliciet actiemenu. Houd de belangrijkste lopende-spelacties direct zichtbaar en plaats Afronden/Opruimen in een herkenbare tweede groep. Verklein de tekst niet verder om alles op één regel te persen.

[Screenshot mobiel dashboard](audit-grafisch/dashboard-390.png). Exacte rechthoeken staan in [details.json](audit-grafisch/details.json).

## G02 — Hoge prioriteit: drie antwoordkleuren geven onvoldoende tekstcontrast

**Locatie:** `components/speler/VraagPopup.tsx:439` en de witte antwoordtekst daaronder; dezelfde kleurkeuze in het editorvoorbeeld.

De browser toont witte antwoordtekst van 16 pixels, gewicht 600. De gemeten CSS-kleurparen hebben deze berekende contrastverhouding:

| Antwoordkleur | Achtergrond | Witte tekst |
|---|---|---:|
| Geel/oranje | `#F59E0B` | 2,15:1 |
| Blauw | `#1E40AF` | 8,72:1 |
| Rood | `#EF4444` | 3,76:1 |
| Groen | `#16A34A` | 3,30:1 |

Voor deze tekstgrootte is 4,5:1 de relevante WCAG-AA-grens; geel, rood en groen halen die niet. De grote knoppen compenseren het kleurcontrast van de tekst niet. Zie de [W3C-uitleg van tekstcontrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Aanpak:** kies donkere tekst op geel en voldoende donkere varianten van rood en groen bij witte tekst. Controleer de gekozen, ingedrukte en uitgeschakelde toestanden apart. Behoud A/B/C/D, zodat de keuzes ook zonder kleur te onderscheiden blijven.

[Screenshot spelersvraag](audit-grafisch/vraag-390.png). De werkelijke tekstkleur en grootte zijn opgenomen in [details.json](audit-grafisch/details.json).

## G03 — Middelhoge prioriteit: belangrijke labels zijn op mobiel erg klein

**Locatie:** `styles/globals.css:2816`, `:3778` en diverse compacte labels in het beheer.

De labels onder de dashboardtellers worden 9,28 pixels hoog ingesteld qua lettergrootte. De gereedschapslabels in de mobiele editor zijn 10,24 pixels. Ook meerdere tijd-, afstand- en voortgangslabels zijn circa 11,52 pixels. Dit zijn betekenisvolle gegevens en functies, niet alleen versiering. Ze zijn op een desktop nog te ontcijferen, maar vragen buiten of tijdens lopen meer inspanning.

**Aanpak:** hanteer als ontwerprichtlijn 12–14 pixels voor belangrijke kleine labels en circa 16 pixels voor invoer en hoofdtekst. Laat labels liever afbreken of verdeel functies over meer ruimte. Dit zijn ontwerpdoelen; er wordt hier geen algemene WCAG-minimumlettergrootte van 12 of 16 pixels geclaimd.

[Screenshot dashboard](audit-grafisch/dashboard-390.png) en [screenshot editor](audit-grafisch/editor-390.png).

## G04 — Middelhoge prioriteit: enkele tikvlakken zijn onnodig klein

**Locatie:** `styles/globals.css:1805`, `app/login/page.tsx:139`, `components/admin/VraagEditorPagina.tsx:575`.

De sluitknop van de editortip meet ongeveer 17 × 19 pixels. Het oogje bij het wachtwoord meet circa 24 × 18 pixels. De goed/fout-rondjes in de vraag-editor meten 22 × 22 pixels. Andere editorfuncties hebben op de telefoon een hoogte van 28–34 pixels. Juist kleine pictogrammen zijn lastiger raak te tikken dan de grote antwoordknoppen bij spelers.

**Aanpak:** vergroot het onzichtbare klikvlak rond kleine iconen en kies voor veelgebruikte mobiele bediening bij voorkeur 40–44 pixels of ruimer. Vergroot de rondjes desnoods met een ruimer label eromheen.

**Normnuance:** WCAG 2.2 AA noemt 24 × 24 pixels met uitzonderingen, waaronder voldoende afstand. Niet iedere knop onder 44 pixels is dus een WCAG-overtreding; deze bevinding betreft vooral bedieningscomfort. Voor de kleinste doelen moet ook de afstand tot andere doelen worden gecontroleerd. Zie [W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## G05 — Middelhoge prioriteit: minder beweging stopt de loginversiering niet

**Locatie:** `styles/globals.css:931` tot en met de logo-/knopanimaties; `app/login/page.tsx`.

Met `prefers-reduced-motion: reduce` ingeschakeld rapporteert de browser op het loginvoorbeeld nog elf oneindige animaties: vier sparkles, vier zwevende emoji, logogloed, logobeweging en knopglans. Elders bestaan al gerichte reduced-motionregels, maar deze set valt daar niet onder.

**Aanpak:** voeg voor deze decoratieve animaties een statische variant toe. Behoud noodzakelijke voortgangsfeedback als rustige tekst of een niet-bewegend symbool. Controleer ook de bestaande schuivende labels apart; die zijn in deze test niet geactiveerd.

De emulatie en gevonden animatienamen staan in [details.json](audit-grafisch/details.json).

## G06 — Middelhoge prioriteit: het spelersvoorbeeld is geen getrouwe weergave

**Locatie:** `components/admin/VraagEditorPagina.tsx:750` en `:861`, tegenover `components/speler/VraagPopup.tsx`.

Onder “Zo ziet de speler het” staat een witte kaart met kleine tekst, een markering van het goede antwoord en een knop “Bevestig antwoord”. Het echte spelersvenster is paars, gebruikt grotere antwoordkaarten met A/B/C/D en dient een antwoord direct in na aantikken. Hierdoor kan een beheerder leesbaarheid, ruimte en de benodigde handelingen niet betrouwbaar uit het voorbeeld afleiden.

**Aanpak:** hergebruik dezelfde vraagcomponent in een afgebakend telefoonvoorbeeld met voorbeelddata en proefbeoordeling. Toon de goede antwoorden desgewenst in een aparte beheerlaag. Als dat niet direct kan, noem de bestaande kaart “Inhoudsvoorbeeld” en gebruik de testronde voor de werkelijke presentatie.

Vergelijk [editor op desktop](audit-grafisch/vraag-editor-1366.png) met de [spelersvraag op mobiel](audit-grafisch/vraag-390.png).

## G07 — Middelhoge prioriteit: lange teamnamen verdwijnen in de eindstand

**Locatie:** `components/speler/StandRij.tsx:49`.

De regel reserveert vaste breedte voor medaille, teamicoon en score en kapt de naam af op één regel. In het 390-pixelvoorbeeld worden normale teamnamen al “De fanatieke buit…” en “De omwegkampio…”. De volledige naam is daar niet via een zichtbaar uitklapmechanisme beschikbaar. Teams met hetzelfde eerste deel van hun naam zijn zo moeilijker te onderscheiden.

**Aanpak:** laat teamnamen op mobiel maximaal twee regels gebruiken, of zet de score op een tweede regel. Houd de score goed scanbaar, maar geef de teamidentiteit meer breedte. Test expliciet namen van 30 tekens en scores met vier cijfers of een minteken.

[Screenshot mobiele eindstand](audit-grafisch/finish-390-eindstand.png).

## G08 — Ontwerpaanbeveling: maak het beheer rustiger dan de spelpresentatie

**Locatie:** dashboardkaarten, `.pr-gem-*`, `.speler-kaart-klik`, actiestijlen en editorlabels.

Veel beheerelementen krijgen tegelijk een gradient, omlijning, schaduw of gloed, een ronde displayletter en soms een emoji naast een lijnicoon. In het dashboardvoorbeeld vallen zowel de winnaar, een team met hulpvraag, statustellers als algemene acties sterk op. Dat past bij een spel, maar vermindert het verschil tussen “leuk om te zien” en “dit vraagt nu actie”.

Dit is een ontwerpbeoordeling, geen functionele fout of gemeten normovertreding.

**Aanpak:** behoud de speelse merkstijl bij login, spelersvragen en finish. Gebruik in het beheer rustigere standaardpanelen, één duidelijke primaire actie per sectie en een beperkt aantal semantische accentkleuren. Reserveer sterke gloed voor een geselecteerd of urgent element. Gebruik in dezelfde beheerwerkbalk consequent de bestaande lijniconen.

## Bewijs, beperkingen en actuele bronstatus

- [Alle 24 meetrecords](audit-grafisch/metingen.json): afmetingen en zichtbare kleine tekst/bediening per voorbeeld.
- [Detailmetingen](audit-grafisch/details.json): dashboardactieposities, antwoordkleurparen en reduced-motioncontrole.
- De vijf opgenomen screenshots tonen fictieve gegevens. De bleke vakken met “Kaart / grafiek — alleen voorbeeld” zijn placeholders.
- In deze voorbeelden is geen horizontale paginaoverflow gemeten. G01 laat zien dat een pagina zonder horizontale scrollbar toch afgesneden onderdelen kan bevatten.
- Browsermetingen zijn in Chrome uitgevoerd. Safari/iPhone, toetsenbord, echte kaarttegels, kleurzichtsimulatie en alle dialoog-/fouttoestanden zijn niet volledig getest.

Tijdens deze audit veranderden buiten dit auditwerk `components/speler/FinishScherm.tsx`, `app/speler/finish/page.tsx` en `styles/globals.css`: ze staan niet meer als lokale wijzigingen in git en de koppeling met `finish-thema.ts` ontbreekt in het huidige finishscherm. De grafische audit heeft die externe wijziging niet teruggedraaid. De finishscreenshots betreffen dus de huidige gewone finish, niet de eerder gemaakte seizoensvariant. `lib/finish-thema.ts` en de eerdere overdracht staan nog in de map.

## Volgorde van verbeteren

1. Herstel G01 en G02: alle belangrijke acties bereikbaar en de antwoordtekst goed leesbaar.
2. Vergroot de kleine labels en tikvlakken en vul reduced-motionondersteuning aan.
3. Maak het editorvoorbeeld gelijk aan de spelersweergave en verbeter lange namen in de eindstand.
4. Voer daarna een ronde uit waarin het beheer visueel wordt vereenvoudigd, met behoud van de bestaande merkstijl.

Test de wijzigingen vervolgens op een echte telefoon buiten, met lange namen, een hulpvraag, meerdere beheerdersacties en de systeeminstelling “minder beweging”.
