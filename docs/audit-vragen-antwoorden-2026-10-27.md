# Audit vragen en antwoorden

Datum: 27 oktober 2026. Scope: vraag-editor en API, ophalen en beantwoorden door spelers, foto-opdrachten, stemmen, handmatig nakijken, feedback en terugkijken. Alleen onderzoek; geen applicatiecode gewijzigd.

## Resultaat

**14 gegroepeerde bevindingen: 6 hoog, 8 middel.** De gewone antwoordcontrole werkt in de geteste standaardgevallen. De grootste problemen ontstaan bij gedeeltelijke databasefouten, gelijktijdige verzoeken en de afwijkende verwerking van foto's en stemmen. Daardoor kunnen antwoorden verdwijnen, vragen worden overgeslagen en scores afwijken van de opgeslagen voortgang.

## Methode en afbakening

- Broncode van de actuele handlers, helpers en betrokken componenten onderzocht.
- **40 lokale controles** uitgevoerd met echte TypeScript-handlers/helpers in een VM en een gesimuleerde Supabase-client. Daarbij zijn fouten, gelijktijdige verzoeken, vraagtypen en scoreovergangen opgewekt. Drie controles gebruiken een geëxtraheerde clientfunctie of de echte vraag-cache.
- Uitvoeren vanuit de projectmap: `node docs/audit-vragen-antwoorden/proeven.cjs`. De proeven gebruiken de lokale simulator uit `docs/audit-items/proeven.cjs`.
- [Resultaten per controle](audit-vragen-antwoorden/resultaten.json); [reproduceerbaar script](audit-vragen-antwoorden/proeven.cjs).

Alle 40 controles bevestigden hun verwachting. **Een geslaagde proef met `FOUT:` bevestigt een huidig gebrek; dit betekent niet dat de applicatie dat scenario goed afhandelt.** Na herstel moeten deze verwachtingen worden aangepast.

Geen productiegegevens, echte uploads, accounts of externe berichten gebruikt. De simulator is geen PostgreSQL-server: niet alle constraints, triggers, RLS, transactie-isolatie en Storage-gedrag worden nagebootst. Het lokale SQL-schema is als aanvullende bron gelezen; productie-instellingen zijn niet gecontroleerd. De concurrencyproeven tonen mogelijke request-interleavings, geen kansberekening voor productie. Geen nieuwe interactieve browser- of telefoontest uitgevoerd. Terugkijkbevindingen zijn broncodebevindingen.

## QA01 — Hoog: vraag opslaan kan bestaande antwoorden verliezen

**Locatie:** `app/api/admin/routes/[id]/punten/[pid]/vraag/route.ts:65`–`:113`.

De API wijzigt eerst de vraag, verwijdert daarna alle antwoordopties en voegt nieuwe opties toe. Bij een fout in die laatste stap is de vraagtekst al veranderd en zijn de oude antwoorden weg. De lokale proef eindigt met HTTP 500, nieuwe vraagtekst en nul antwoordopties.

Bij reeds gespeelde vragen speelt bovendien de foreign key `player_point_progress.selected_answer_id → answer_options.id` mee (`supabase/migrations/001_schema.sql:170`). Het lokale schema heeft geen cascade voor die relatie: verwijderen van gebruikte opties kan daardoor worden geblokkeerd nadat de vraagtekst al is gewijzigd. Deze FK-situatie is uit het schema afgeleid en niet met echte PostgreSQL uitgevoerd.

**Opdracht:** sla de volledige wijziging transactioneel op, behoud stabiele antwoord-ID's en bepaal expliciet hoe wijzigingen aan gespeelde vragen omgaan met historische antwoorden. **Acceptatie:** een mislukte wijziging laat de volledige oude vraag intact; bestaande spelersantwoorden blijven herleidbaar. Overlap met B02 uit de beheeraudit.

## QA02 — Hoog: beantwoording en nakijken kunnen punten verliezen of dubbel toekennen

**Locaties:** `app/api/speler/voortgang/verwerk/route.ts:36`, `:220`–`:238`; `lib/score.ts`; `lib/antwoord-keuren.ts:15`, `:30`–`:32`.

De controle op `answered_at` is gescheiden van de update. Twee gelijktijdige antwoorden worden in de proef beide met HTTP 200 geaccepteerd. Welke score daarbij resteert hangt ook af van de aparte scoreupdates; de proef bewijst geen gegarandeerde verdubbeling bij iedere interleaving.

Bij een mislukte scoreupdate kan de API toch succes geven: voortgang vermeldt 40 punten, de teamscore blijft 100 en opnieuw indienen geeft 409. Bij handmatig goedkeuren is de schade ook reproduceerbaar:

- Voortgang bijwerken mislukt, maar er komen wel 40 punten bij. Opnieuw goedkeuren voegt nog eens 40 toe: 180 in plaats van 140.
- Voortgang wordt wel goedgekeurd, scoreupdate mislukt: score blijft 100. Een herstelpoging wordt geblokkeerd met `Dit antwoord is al goed`.

**Opdracht:** combineer reservering van het antwoord, voortgang en scoremutatie in één database-transactie, met een unieke boeking per beantwoording/correctie. Controleer databasefouten en maak retries veilig. **Acceptatie:** één verwerking per antwoord; score en voortgang blijven consistent bij fouten en gelijktijdige verzoeken. Overlap met F02/F03 uit de speleraudit.

## QA03 — Hoog: fout bij vraag ophalen laat het punt zonder antwoord afronden

**Locatie:** `app/api/speler/voortgang/verwerk/route.ts:65`–`:75`; vraag-aanmaak in de admin-API; `supabase/migrations/001_schema.sql:109`.

De verwerkingsroute controleert de queryfout niet. `data=null` wordt opgevat als 'geen vraag', waarna het punt als informatiepunt wordt afgerond. Met een gesimuleerde leesfout op een meerkeuzevraag geeft een verzoek zonder antwoord HTTP 200 en 10 puntpunten; het punt is definitief verwerkt.

Ook twee gelijktijdige aanmaakverzoeken kunnen twee vragen aan één routepunt hangen. Het lokale schema heeft hier alleen een gewone index, geen unieke beperking. De daaropvolgende `.maybeSingle()` levert bij twee vragen een fout; de verwerkingsroute valt opnieuw terug op afronden zonder vraag. Beide stappen zijn lokaal gereproduceerd.

**Opdracht:** onderscheid ontbrekende data van een queryfout; blokkeer verwerking bij fouten. Maak `questions.route_point_id` uniek na gecontroleerde opschoning van eventuele duplicaten en maak aanmaken concurrencybestendig. **Acceptatie:** een leesfout of dubbele vraag levert geen afronding of punten op.

## QA04 — Hoog: foto-API controleert vraagtype en eindtijd onvoldoende

**Locatie:** `app/api/speler/foto/route.ts:12`, `:28`–`:45`; vergelijking met gewone antwoorden in `voortgang/verwerk/route.ts:14`–`:19`.

De foto-API controleert route, bereikt punt en pauze, maar niet of de vraag daadwerkelijk `foto_opdracht` is. In de proef kan een gewone meerkeuzevraag zonder antwoord worden afgerond door een foto in te sturen. Na goedkeuring krijgt het team 40 punten. Hiervoor is een rechtstreeks API-verzoek nodig; de gewone interface biedt die uploadknop niet bij meerkeuze.

Daarnaast controleert de foto-API alleen pauze. Een foto na de ingestelde eindtijd wordt nog geaccepteerd zolang de sessie nog actief is en een ander verzoek deze nog niet heeft afgesloten. Een gewoon antwoord wordt in dezelfde situatie wel geweigerd.

**Opdracht:** vereis een echte foto-opdracht en gebruik dezelfde centrale controle op eindtijd en sessiestatus als bij gewone beantwoording. **Acceptatie:** foto bij een ander vraagtype geeft 400; na eindtijd geen nieuwe inzending, voortgang of score.

## QA05 — Hoog: gedeeltelijke fotoverwerking kan een team vastzetten

**Locaties:** `app/api/speler/foto/route.ts:72`–`:96`; `app/api/admin/foto/[id]/route.ts:35`–`:83`.

De foto-inzending wordt opgeslagen vóór de voortgang. Een fout bij die voortgang wordt genegeerd: HTTP 200 met `voortgang=null`. De speler krijgt vervolgens een knop om door te gaan, maar de client heeft geen voortgang om door te geven. Opnieuw uploaden geeft 409 omdat de inzending al bestaat.

Ook bij keuren zijn status, voortgang en score losse updates waarvan fouten grotendeels worden genegeerd. De proef met negatieve fotopunten toont daarnaast een concrete afwijking: voortgang krijgt −15, maar de teamscore blijft 100 omdat alleen positieve punten worden bijgeteld. Als negatieve fotopunten niet zijn toegestaan, moet de API deze weigeren; nu meldt zij succes.

**Opdracht:** maak inzenden en beoordelen herstelbaar en idempotent; controleer alle writes. Regel compensatie/opschoning voor Storage als de databasebewerking mislukt. Valideer de toegestane fotopunten en houd dezelfde scoreboeking aan als elders. **Acceptatie:** na elke fout kan het team veilig opnieuw proberen; geen inzending zonder bruikbare voortgang en geen afwijkende score. Het eerdere itemrapport I05 beschrijft apart dat foto- en stempunten de verdubbeling niet consequent gebruiken.

## QA06 — Hoog: stemmen na sluiten veranderen de meerderheid zonder consistente uitslag

**Locaties:** `app/api/speler/voortgang/verwerk/route.ts:95`–`:106`; `lib/stemmen.ts:10`–`:42`.

Een gesloten stemvraag accepteert nog nieuwe stemmen. De beoordeling gebruikt de bestaande telling vóór opslag van die nieuwe stem. Eerder toegekende punten worden niet automatisch opnieuw berekend.

**Proef:** A en B hebben elk één stem; sluiten beloont beide teams. Daarna stemt een derde team B. De actuele telling heeft alleen B als winnaar, terwijl team A nog steeds als goed met 40 punten staat. De stemuitslag en scoreadministratie spreken elkaar tegen.

**Opdracht:** kies een expliciete sluitregel: na sluiten geen nieuwe stemmen, of een vastgelegde uitslag waar latere antwoorden niets meer aan veranderen. Verwerk sluiten en puntentoekenning transactioneel en veilig bij herhalen. **Acceptatie:** een late stem verandert geen vastgestelde winnaar en veroorzaakt geen tegenstrijdige beoordelingen. Opeenvolgend tweemaal sluiten zonder nieuwe stemmen werkte in de standaardproef wel correct.

## QA07 — Middel: tijdslimiet wordt alleen door de spelerclient gehandhaafd

**Locaties:** `components/speler/VraagPopup.tsx:142`–`:155`; `app/api/speler/voortgang/verwerk/route.ts:24`, `:76`.

De client start zelf een deadline en stuurt `te_laat=true` wanneer deze verloopt. De server bewaart of controleert geen deadline voor het openen van deze vraag. Een verzoek zonder die vlag krijgt gewoon punten, ongeacht de ingestelde vraaglimiet. De proef bevestigt dit bij een 10-secondenvraag met oude voortgang; deze oude `reached_at` is op zichzelf geen bewijs van het exacte moment waarop de vraag werd geopend.

**Opdracht:** leg serverzijdig vast wanneer de beantwoordingstijd begint en beoordeel op die deadline, met een expliciete regel voor pauze en offline indienen. **Acceptatie:** aanpassen of weglaten van `te_laat` verlengt de toegestane tijd niet. Overlap met F09.

## QA08 — Middel: servervalidatie laat onbruikbare vragen en onduidelijke getallen toe

**Locaties:** admin-vraag-API `:26`–`:46`; `components/admin/VraagEditorPagina.tsx:288`–`:339`; `lib/geo.ts:48`–`:51`.

De editor valideert meer dan de API. Een directe PUT slaat een open vraag op met lege vraagtekst en zonder geaccepteerde antwoorden. De normale speler kan deze vervolgens niet goed beantwoorden. De numerieke parser gebruikt `parseFloat`: `123xyz` wordt 123 en `1/2` wordt 1. De editor gebruikt eveneens gedeeltelijke numerieke parsing. Dit kan een invoer anders interpreteren dan de maker of speler bedoelt.

**Opdracht:** valideer per vraagtype dezelfde eisen op de server: tekst, eindige punten/getallen, geldige tolerantie, geaccepteerde antwoorden en volledige opties. Definieer toegestane numerieke notaties expliciet; parse de volledige invoer of geef een duidelijke fout. **Acceptatie:** onvolledige vragen worden met 400 geweigerd zonder writes; ongeldige of dubbelzinnige getalinvoer wordt niet stil afgekapt.

## QA09 — Middel: ophalen en verwijderen melden geen databasefout

**Locatie:** `app/api/admin/routes/[id]/punten/[pid]/vraag/route.ts:10`–`:18`, `:145`–`:149`; overeenkomstig ophalen door de speler in `app/api/speler/vraag/[pid]/route.ts`.

Een leesfout bij de admin-vraag-API geeft HTTP 200 met `null`, precies zoals een punt zonder vraag. De editor kan daardoor een leeg formulier tonen terwijl er wel een vraag bestaat. Verwijderen geeft ook bij een mislukte delete `{ok:true}`, terwijl de vraag blijft bestaan. Beide gevallen zijn gereproduceerd.

**Opdracht:** geef fouten door met een passende foutstatus en behoud bestaande editorinhoud bij een mislukte laadactie. Controleer bij verwijderen ook de daadwerkelijke uitkomst. **Acceptatie:** de interface kan 'niet geladen' en 'geen vraag' onderscheiden en meldt alleen geslaagde verwijderingen als succes. Verwant aan E03.

## QA10 — Middel: enige gehusselde vraag verliest de instelling bij opslaan

**Locatie:** admin-vraag-API `:119`–`:128`.

Opslaan neemt `antwoorden_husselen` over van andere vragen op de route. Wanneer alleen de huidige vraag die instelling draagt, wordt deze daardoor `false`. De proef met één vraag slaat succesvol op maar zet husselen uit.

**Opdracht:** maak de route-instelling de bron voor husselen of behoud de eigen waarde als er geen andere bron is. **Acceptatie:** een route met één vraag behoudt de gekozen husselinstelling na een tekstwijziging.

## QA11 — Middel: sommige clientfouten krijgen geen zichtbare uitleg

**Locaties:** `components/speler/VraagPopup.tsx:125`–`:138`, `:222`–`:257`.

`verwerkDirect` doet niets met `stuur(...).status='fout'`. De gebruiker drukt op Doorgaan en blijft zonder uitleg staan, bijvoorbeeld bij een serverweigering. Fotoverwerking heeft wel `finally`, maar geen `catch`: als `createImageBitmap` de gekozen afbeelding niet kan lezen, eindigt de laadstatus zonder foutmelding. Beide clientpaden zijn geïsoleerd uitgevoerd met dezelfde responsevormen als de bestaande wachtrijfunctie.

**Opdracht:** toon concrete herstelbare foutmeldingen bij serverweigeringen, afbeeldingsconversie en netwerkfouten. **Acceptatie:** de gebruiker ziet waarom indienen niet lukt en kan opnieuw proberen met behoud van invoer/foto.

## QA12 — Middel: feedback na tijdoverschrijding is onvolledig en de proef wijkt af

**Locaties:** `app/api/speler/voortgang/verwerk/route.ts:76`; `components/speler/VraagPopup.tsx:702`–`:798`; `lib/vraag-proef.ts:22`–`:23`.

De te-late-tak slaat de gewone feedbackopbouw over. De response bevat geen juiste optie-ID's of juiste open antwoorden. De UI heeft wel de sectie `Het juiste antwoord`, maar krijgt daarvoor geen inhoud. De proefmodus behandelt bovendien een verlopen stemvraag als een nog open stem (`is_correct=null`), terwijl de echte server deze fout rekent (`is_correct=false`).

**Opdracht:** stel de feedbackgegevens onafhankelijk van de scorebeoordeling samen en deel beoordelingsregels tussen server en proefmodus. **Acceptatie:** na tijdoverschrijding verschijnt het correcte antwoord als dat de productregel is; proef en echte sessie tonen hetzelfde resultaat voor ieder vraagtype.

## QA13 — Middel: terugkijken toont niet alle goede antwoorden

**Locatie:** `app/speler/terugkijk/page.tsx:81`–`:85`, `:150`–`:168`.

Broncodebevinding: het overzicht kiest bij meerkeuze slechts de eerste optie met `is_correct`. Bij een fout open antwoord wordt de juiste tekst expliciet `null`, omdat geaccepteerde tekst en numerieke waarde niet zijn opgehaald. Stemopties hebben geen `is_correct`; hun winnaar wordt voor dit overzicht niet afzonderlijk bepaald. Het terugkijkscherm kan daardoor geen volledige uitleg van de uitslag geven.

**Opdracht:** gebruik een gedeeld feedbackmodel met alle juiste opties, tekst/getal plus tolerantie en de vastgelegde stemuitslag. **Acceptatie:** terugkijken verklaart de beoordeling voor alle vijf vraagtypen en blijft consistent met de feedback direct na beantwoorden. Deze samenstelling is niet end-to-end gerenderd in deze audit.

## QA14 — Middel: vraag-cache houdt oude antwoord-ID's vast na wijzigingen

**Locatie:** `lib/vraag-cache.ts:5`–`:13`; vervangen van opties in de admin-vraag-API.

De cache wordt alleen op punt-ID opgeslagen en heeft geen versie of verversing. De proef haalt na wijziging opnieuw de oude antwoord-ID op zonder een nieuwe fetch. Omdat opslaan antwoordopties vervangt, kan de speler daardoor een inmiddels ongeldig antwoord insturen en `Ongeldig antwoord` krijgen. Een algemene router-refresh hoeft deze modulecache niet te wissen.

**Opdracht:** versieer vragen/cache, invalideer bij routewijzigingen en bied bij verouderde opties een herstelpad dat de actuele vraag opnieuw ophaalt. Stem dit af met het bewaren van antwoord-ID's uit QA01. **Acceptatie:** een speler kan na een beheerwijziging verder zonder volledige app-herstart. Overlap met F10.

## Wat in de controles goed werkte

| Onderdeel | Bevestigd gedrag |
|---|---|
| Meerkeuze tekst en afbeelding | Geldige optie wordt beoordeeld; vreemde optie geweigerd |
| Meerkeuze punten | Normale punten, minpunten en meerdere goede keuzes ondersteund |
| Open tekst | Hoofdletters/accents worden genormaliseerd; lege invoer geweigerd |
| Open numeriek | Decimale komma en tolerantie werken bij gewone geldige invoer |
| Voortgang | Niet bereikt punt en tweede opeenvolgende beantwoording worden geweigerd |
| Pauze | Gewone antwoorden en foto's worden geblokkeerd |
| Eindtijd | Gewone antwoorden worden geweigerd na de eindtijd |
| Foto standaardpad | Team speelt na inzenden door; punten volgen bij goedkeuring |
| Handmatig goedkeuren | Het verschil met eerder toegekende minpunten wordt correct berekend bij succesvolle writes |
| Stemvraag standaardpad | Gelijke koplopers krijgen punten; opeenvolgend herhalen zonder nieuwe stemmen telt niet dubbel |

## Aanvullende presentatie- en gebruikspunten

Het eerdere [grafische rapport](audit-grafisch-2026-10-26.md) bevat al een contrastbevinding voor de gekleurde antwoordknoppen. Dat is hier niet opnieuw in de browser gemeten. In de huidige broncode zijn daarnaast deze aandachtspunten zichtbaar: de vraagafbeelding wordt vierkant uitgesneden met `object-fit: cover` zonder vergrotingsknop; relevante details kunnen daardoor buiten beeld vallen. Afbeeldingsantwoorden hebben lege altteksten en gebruiken A/B/C/D als zichtbare knoptekst, zodat de inhoud voor iemand die het plaatje niet ziet niet wordt beschreven. Bespreek een toegankelijk alternatief zonder het antwoord te verklappen.

De bestaande editorgebruikaudit E06 blijft ook relevant: geluid en tijdslimiet ontbreken in de vergelijking voor 'niet opgeslagen wijzigingen' (`VraagEditorPagina.tsx:211`). Pas bij het oplossen van deze audit ook die bestaande bevinding toe; zij telt hier niet opnieuw mee.

## Werkvolgorde voor Claude

Begin met QA01–QA05: voorkom verlies en onjuiste scoremutaties, en sluit de foto-omweg. Leg daarna de sluitregel van stemmen vast (QA06). Werk vervolgens validatie, deadlines, foutmeldingen, feedback en cache af. Dedupliceer de genoemde overlap met eerdere rapporten. Controleer de oplossingen met echte PostgreSQL en één volledige spelerssessie per vraagtype, inclusief fouten/retries. Pas de `FOUT:`-proeven aan zodat zij na herstel het gewenste gedrag bewaken.
