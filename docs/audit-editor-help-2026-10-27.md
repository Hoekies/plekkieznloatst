# Audit helpfunctie van de editor

Datum: 27 oktober 2026. Scope: de rechter hulpkolom, selecteren van handleidingtekst, aanwijzen van knoppen, herstel na laadfouten, toetsenbord, schermruimte en aansluiting op de editor. Inline uitleg, tooltips en Eerste stappen zijn als context bekeken. Geen applicatiecode gewijzigd.

## Oordeel

De gedeelde Markdown-bron, uitklapbare hoofdstukken en het kunnen aanwijzen van knoppen zijn een bruikbare basis. De hulp is echter vooral gekoppeld aan de URL, terwijl veel editorwerk in vensters binnen dezelfde URL gebeurt. Juist bij vragen invullen verdwijnt de hulpkolom achter het venster. Daarnaast zijn herstel na fouten, knopverwijzingen en toetsenbordbediening onvolledig.

**11 bevindingen: 8 middel en 3 laag.** Er zijn geen databasewijzigingen of externe acties uitgevoerd.

## Onderzoek en bewijs

- **14 lokale controles** met de echte hulp-API en geëxtraheerde DOM-zoekfunctie. React-effecten zijn apart uitgevoerd met gemockte hooks/fetch. [Proeven](audit-editor-help/proeven.cjs), [resultaten](audit-editor-help/resultaten.json).
- De bestaande zelftest is via lokale TypeScript-transpilatie uitgevoerd: **9 onderdelen geslaagd**, inclusief de controle op knopnamen.
- Vier Chrome-voorbeelden op **390, 769, 1024 en 1366 pixels breed**, hoogte 900. Actuele RouteEditorShell, hulptekst uit de echte API, CSS en beschikbare fonts. Header/zijbalk zijn vereenvoudigd; hulpkolom is opgebouwd met de echte klassen en actuele inhoud. Kaart is een placeholder. Geen volledige React-hydratatie of echte Leaflet-interactie.
- Een laagcontrole met de bestaande vraagvensterstijl (`fixed`, `inset:0`, `z-index:2000`) bevestigt dat dit boven de hulp verschijnt. Dit is een geïsoleerde DOM-laagcontrole; geen volledige interactietest van de vraag-editor.
- [Browsermetingen](audit-editor-help/browsermetingen.json), [voorbeeld 1024 px](audit-editor-help/editor-help-1024.png), [voorbeeld 1366 px](audit-editor-help/editor-help-1366.png). De gegenereerde [hulp-HTML](audit-editor-help/editor-hulp.html) is een auditkopie, geen nieuwe bron voor de app.

Alle 14 proeven bevestigen hun verwachting. **`FOUT:` betekent dat een bestaand gebrek is gereproduceerd; een geslaagde proef betekent dan niet dat dit gedrag goed is.** Geen certificering van toegankelijkheid of prestaties; geen gebruikersonderzoek. Metingen van beschikbare werkruimte horen bij de beschreven voorbeeldshell en moeten na herstel in de volledige app worden gecontroleerd.

## EH01 — Middel: hulp verdwijnt achter de vraag-editor

**Locaties:** `app/admin/layout.tsx:85`; `styles/globals.css:1401`, `:3355`; `components/admin/RouteEditorShell.tsx:2520`; `components/admin/editor/AlleVragenVenster.tsx:51`.

De hulp staat in de vaste headerhoek met stacking context 900. De kolom zelf heeft z-index 950 binnen die context. De gewone vraag-editor en Alle vragen zijn schermvullende vensters met z-index 2000. Ze bedekken dus zowel de hulp als de hulpknop. Een hoger z-indexgetal uitsluitend op de hulpkolom is hiervoor geen betrouwbare oplossing, omdat de bovenliggende stacking context blijft gelden.

**Gevolg:** uitleg over antwoordtypen, punten en QR-testen is niet naast het betreffende formulier te gebruiken. De gebruiker moet het formulier verlaten om de hulp te lezen.

**Opdracht:** bied hulp binnen het vraagvenster of reserveer daar ruimte voor een gedeelde hulpkolom. Houd sluiten, focus en niet-opgeslagen invoer intact. **Acceptatie:** hulp openen en gebruiken terwijl een vraag of Alle vragen openstaat, zonder het formulier te sluiten of wijzigingen kwijt te raken.

## EH02 — Middel: hulp volgt de editorhandeling niet

**Locaties:** `app/api/admin/uitleg/route.ts:12`–`:14`; `components/admin/HulpKolom.tsx:35`, `:80`–`:89`.

Alle routes onder `/admin/routes/` krijgen dezelfde vier hoofdstukken: route aanmaken, speltype/instellingen, items en extra's. Ook een afzonderlijke vraag-editor-URL krijgt exact dezelfde inhoud en titel als de algemene route-editor. Het openen van instellingen, items, een punt of Alle vragen binnen dezelfde URL geeft bovendien geen nieuwe context door.

In de browservoorbeelden staat bij een bestaande actieve route eerst een lange uitleg over een nieuwe lege route. De maker moet zelf zoeken naar het relevante onderdeel; er is geen zoekveld of taakselectie in de kolom.

**Opdracht:** geef een beperkte context mee, bijvoorbeeld kaart/punt/vraag/items/instellingen/controle. Open daarbij het relevante onderwerp en toon bovenaan een korte taakgerichte uitleg; houd de volledige handleiding bereikbaar. **Acceptatie:** bij een open vraag staat vraaghulp bovenaan en bij items itemhulp, zonder handmatig door de uitleg over route-aanmaak te scrollen.

## EH03 — Middel: een laadfout wordt als geladen hulp bewaard

**Locatie:** `components/admin/HulpKolom.tsx:80`–`:89`.

Ook na een mislukte fetch wordt `hulp.pad` op het huidige pad gezet, met een fouttekst als HTML. Daarna voorkomt `hulp?.pad === pad` een nieuwe fetch. Sluiten en opnieuw openen op dezelfde pagina helpt niet. De proef bevestigt één fetch na falen plus sluiten/heropenen. Een padwissel kan wel een nieuwe poging starten.

Ook wordt `res.ok` niet gecontroleerd voordat de response als hulp wordt verwerkt. Er is geen knop Opnieuw proberen.

**Opdracht:** onderscheid laden/succes/fout en cache alleen geslaagde hulp. Voeg opnieuw proberen toe en verwerk HTTP-fouten expliciet. **Acceptatie:** na een tijdelijke verbindingsfout kan de gebruiker op dezelfde editorpagina herstellen zonder herladen of navigeren.

## EH04 — Middel: aanwijzen kan de verkeerde knop kiezen of een knop missen

**Locatie:** `components/admin/HulpKolom.tsx:12`–`:29`.

De zoekfunctie doorzoekt alle knoppen, links en labels op de pagina. Ze kiest op genormaliseerde tekst en neemt bij gelijke score de eerste DOM-match. Er is geen voorkeur voor het actieve editorpaneel of bovenste venster.

Lokale proeven:

- Twee knoppen `Instellingen`: de eerste wordt gekozen, ook als dat het hoofdmenu is en de bedoelde knop in de editor staat.
- De handleidingnaam `Vraag invullen / bewerken` matcht geen knop met alleen `Vraag invullen`.
- Een element met `visibility:hidden` en clientrects wordt als aanwezig beschouwd; de functie controleert alleen rects, niet CSS-zichtbaarheid of bedekking.

De eerste en derde proef gebruiken samengestelde DOM-mocks om de beperking van de echte zoekfunctie te isoleren; ze bewijzen niet dat iedere editorweergave die combinatie bevat. De gecombineerde vraagnaam staat wel daadwerkelijk in de handleiding.

**Opdracht:** gebruik stabiele hulpdoelen, bijvoorbeeld `data-help-id`, en zoek binnen de actieve editorcontext. Controleer zichtbaarheid en geef bij een gesloten paneel een duidelijke vervolgstap. **Acceptatie:** een verwijzing naar editorinstellingen wijst naar de editor; gecombineerde namen hebben afzonderlijke doelen; verborgen doelen worden niet als aanwijzing aangeboden.

## EH05 — Middel: aanklikbare woorden werken niet met Tab en Enter

**Locaties:** `components/admin/HulpKolom.tsx:55`–`:76`, `:104`; `styles/globals.css:3393`.

Vetgedrukte woorden krijgen een klasse, kleur, tooltip en wijzend icoon. De actie wordt uitgevoerd via een clickhandler op de omringende tekstcontainer. De woorden blijven gewone `<strong>`-elementen: geen knop, tabindex, toetsenbordhandler of toegankelijke actienaam. Ze kunnen daardoor met een muisklik werken, maar zijn niet op dezelfde manier met het toetsenbord bereikbaar.

**Opdracht:** maak van een daadwerkelijk bedienbare verwijzing een echte button/link met behoud van de opmaak. Maak ook de actie duidelijk, bijvoorbeeld 'Wijs Vraag opslaan aan'. **Acceptatie:** Tab bereikt de actie; Enter/Spatie wijst het juiste doel aan; de focus blijft zichtbaar en voorspelbaar. De bestaande `<details>/<summary>` voor hoofdstukken is wel een bruikbare native basis.

## EH06 — Middel: delen van de instellingenhulp zijn verouderd

**Locaties:** `docs/beheerdershandleiding.md:145`–`:151`; `components/admin/RouteEditorShell.tsx:2130`, `:2571`.

De hulptabel zegt nog dat het puzzelwoord in Instellingen → Spel staat. De editor vermeldt expliciet dat het daar niet meer staat en biedt een aparte puzzelknop/venster. Wie de hulp volgt, zoekt dus in het verkeerde paneel.

De handboekuitleg belooft verder dat weggaan met niet-opgeslagen vraagwijzigingen altijd een waarschuwing geeft. Eerder is al vastgesteld dat wijzigingen aan geluid en tijdslimiet niet in de dirty-vergelijking staan (`VraagEditorPagina.tsx:211`). Dit is een appgebrek dat de absolute belofte in de hulp onbetrouwbaar maakt; repareer het gedrag in plaats van dat als uitzondering normaal te verklaren.

**Opdracht:** loop de vier geselecteerde hulpstukken naast de actuele editor door en corrigeer locaties, labels en absolute beloften. **Acceptatie:** iedere beschreven instellingenroute leidt naar het actuele onderdeel; geluid/tijdslimiet vallen ook onder de bescherming tegen verlies. Overlap met editorgebruikaudit E06.

## EH07 — Middel: hoofdstuklinks missen een doel binnen de hulp

**Locaties:** `app/api/admin/uitleg/route.ts:39`–`:45`; gegenereerde hulp-HTML; verwijzing naar Het spel starten in de handleiding.

De routehulp bevat een link `#het-spel-starten`. Het corresponderende hoofdstuk zit niet in de geselecteerde hulp en er is geen element met dat id in de gegenereerde HTML. De link wordt ook niet omgezet naar de volledige handleiding. De lokale controle bevestigt de ontbrekende bestemming.

De footerlinks naar Snel aan de slag en de volledige handleiding navigeren bovendien naar een andere pagina. Ze hebben geen editor-specifieke controle op niet-opgeslagen wijzigingen. Voor formulieren die pas met Opslaan worden verstuurd verdient dat bescherming; niet alle editorwijzigingen zijn automatisch bewaard.

**Opdracht:** geef hoofdstukken stabiele ankers en stuur verwijzingen naar niet-geladen hoofdstukken naar een aantoonbaar werkende bestemming. Laat uitgebreidere hulp waar mogelijk naast of los van de huidige bewerking openen. **Acceptatie:** elke hulpverwijzing opent het juiste onderwerp; hulp raadplegen veroorzaakt geen verlies van invoer. Het risico bij footer-navigatie is uit code afgeleid, niet als volledig browserformulier gereproduceerd.

## EH08 — Middel: vaste hulpkolom drukt de editor sterk samen

**Locaties:** `styles/globals.css:3355`, `:3385`–`:3391`; vaste editorpanelen en werkbalk in `RouteEditorShell.tsx`.

De hulp neemt vanaf 769 pixels schermbreedte altijd 360 pixels in. In de voorbeeldshell met een zijbalk van 180 pixels blijft bij 769 pixels slechts **229 pixels** over voor de editor; bij 1024 pixels **484 pixels**. De gemeten editorinhoud heeft in deze voorbeelden 917 pixels scrollbreedte. De screenshots tonen horizontale overflow en een krap kaartgebied. Het verschil met een volledige appheader verandert niet dat 360 pixels op deze breedtes een groot deel van de werkruimte inneemt.

**Opdracht:** laat de hulp op kleine laptops als tijdelijke overlay of drawer openen, maak de kolom begrensd verstelbaar of klap andere panelen bewust in. Kies het omslagpunt op basis van de editorruimte, niet alleen het telefoonbreekpunt. **Acceptatie:** op 769 en 1024 pixels blijven bewerken, opslaan en sluiten bereikbaar; geen bediening die uitsluitend door horizontaal zoeken gevonden wordt. Controleer dit opnieuw in de volledige app met zijbalk open én ingeklapt.

## EH09 — Laag: op mobiel ontbreekt hulp bij de huidige editortaak

**Locatie:** `styles/globals.css:3389`; `components/admin/InfoKnop.tsx`.

Op maximaal 768 pixels worden zowel hulpkolom als hulpknop verborgen. Dat is een expliciete ontwerpkeuze; de volledige handleiding blijft via Info & uitleg beschikbaar. Er is alleen geen gelijkwaardige contextuele hulp bij het huidige editoronderdeel.

**Opdracht:** bied een compacte hulpdrawer of onderwerpknop bij de mobiele editor. **Acceptatie:** een spelerbeheerder op telefoon kan uitleg over het huidige formulier openen en zonder verlies terugkeren. Dit is een uitbreiding van bruikbaarheid, geen ontbrekende toegang tot alle documentatie.

## EH10 — Laag: aanwijspuls respecteert minder beweging niet

**Locaties:** `components/admin/HulpKolom.tsx:71`; `styles/globals.css:3396`–`:3398`.

Aanwijzen gebruikt smooth scrolling en vier pulsanimaties. De CSS heeft hiervoor geen uitzondering voor `prefers-reduced-motion`. Een geïsoleerde browsercontrole met deze voorkeur aan bevestigt een actieve `hulp-puls`-animatie.

**Opdracht:** gebruik bij minder beweging een statische markering en direct scrollen. **Acceptatie:** de aanwijzing blijft zichtbaar zonder puls en zonder geforceerd vloeiend scrollen.

## EH11 — Laag: de bestaande knopnamentest bewijst geen werkende verwijzingen

**Locatie:** `scripts/zelftest.ts:61`–`:76`.

De test zoekt namen in samengevoegde broncode uit app, components en lib. Een naam ergens in een string, commentaar of ander scherm is voldoende. De test splitst bovendien samengestelde namen op `/`, `→` en `en`, terwijl de runtime-zoekfunctie dat niet doet. Alle negen zelftests slagen, terwijl de echte aanwijzer `Vraag invullen / bewerken` niet herkent in de lokale proef.

**Opdracht:** behoud de snelle broncontrole, maar voeg gerichte controles van hulpdoelen toe voor de relevante editorcontexten. Met stabiele ids kan dat klein en betrouwbaar blijven. **Acceptatie:** de controle detecteert een verwijderd/verkeerd hulpdoel en een gecombineerde naam zonder werkende doelen. Gebruik geen groene broncontrole als bewijs dat alle knoppen daadwerkelijk worden aangewezen.

## Wat goed werkt

- Handleiding en hulpkolom delen één inhoudsbron.
- De route-editor krijgt eigen hulp en de geselecteerde hoofdstukken worden gevonden.
- Er is documentatie voor Eerste stappen en de beschikbare items.
- Uitklapbare hoofdstukken houden een lange tekst enigszins beheersbaar.
- Aanwijzen ondersteunt tekst, aria-label, data-tip en title; een exacte match wint van een langere gedeeltelijke match.
- De eigen hulpkolom en elementen zonder clientrects worden uitgesloten van de zoekactie.
- Een oude fetchrespons wordt genegeerd na opruimen van het effect; een padwissel kan nieuwe hulp ophalen.
- De hulpvoorkeur wordt lokaal onthouden; footer biedt toegang tot uitgebreide uitleg en instructiekaarten.

## Werkvolgorde voor Claude

Begin met hulp bereikbaar houden bij vraagbewerking (EH01), herstel na fouten (EH03) en betrouwbare, toetsenbordbedienbare verwijzingen (EH04/EH05). Corrigeer daarna de inhoud en links. Pak context en beschikbare schermruimte samen aan: relevante korte hulp is nuttiger dan een steeds grotere kolom. Controleer uiteindelijk kaart, instellingen, één vraag, Alle vragen en een mobiel scherm, inclusief niet-opgeslagen wijzigingen. De meegeleverde FOUT-proeven moeten na herstel op het gewenste gedrag worden aangepast.
