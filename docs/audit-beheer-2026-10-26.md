# Audit dashboard, editor, livekaart en spelersbeheer

Datum: 26 oktober 2026. Uitgevoerd door Codex op verzoek van René.

## Reikwijdte en bewijs

Beoordeeld: dashboard en gedeelde livegegevens, route- en vraag-editor, routewijzigingen tijdens het spel, livekaart, afronden/opruimen, helpers en spelersbeheer inclusief inlogkaartjes. “Spelerd” uit de opdracht is geïnterpreteerd als spelersbeheer. De spelersapp zelf heeft een afzonderlijk rapport: `docs/audit-spelersgedeelte-2026-10-26.md`.

Er zijn twaalf lokale controles uitgevoerd met de echte handlers, helpers, middleware en live-hook. Supabase, netwerk, authenticatie en React-hooks zijn waar nodig vervangen door mocks. Bij de importcontrole is ook de echte spelerspagina uitgevoerd op de tussentijdse databaseweergave. Alle twaalf controles bevestigden het beschreven codegedrag. Ze bewijzen niet welke afwijkende rechten of constraints op de live database zijn geïnstalleerd.

Geen livegegevens gewijzigd, geen echte accounts aangemaakt, geen wachtwoorden veranderd, geen berichten verstuurd en geen spelcode gerepareerd. Er is geen interactieve browser- of telefoontest uitgevoerd. Bestaande lokale seizoenswijzigingen zijn behouden.

P1 = hoge prioriteit: gegevensverlies, toegangsproblemen of verstoring van een spel. P2 = middelhoge prioriteit: onjuiste weergave of een beperktere functionele fout. Er zijn zeven P1- en vijf P2-bevindingen; geen P0 vastgesteld binnen deze reikwijdte.

## Bevindingen

### B01 — P1: oude QR-inlogkaartjes blijven geldig voor de volgende groep

**Onderdeel:** spelersbeheer / Afronden → Opruimen → Volgende groep.

**Locatie:** `app/api/admin/groepen/kaartjes/route.ts:27`, `:36` en `:42`; gebruik van bestaande links: `app/l/[code]/route.ts`.

“Nieuwe groep” verandert het wachtwoord en maakt een nieuwe QR-inloglink, maar trekt bestaande `inlog_links` niet in. De oude QR-code werkt onafhankelijk van het wachtwoord: de linkhandler genereert bij gebruik een nieuwe magic-link voor hetzelfde account. Een deelnemer uit de vorige groep kan daardoor tijdens de resterende geldigheid opnieuw in het teamaccount van de volgende groep komen. De interface zegt juist dat de oude kaartjes niet meer werken.

**Lokaal bevestigd:** het wachtwoord verandert, maar de bestaande link houdt `ingetrokken: false`. De verdere inlogroute is in de code gecontroleerd; geen echte inlog uitgevoerd.

**Herstel:** trek alle bestaande links in bij de groepswissel, beëindig toegang van de vorige groep en geef daarna pas de nieuwe kaartjes uit. Controleer hierbij ook de centrale toegangscontrole uit F04 van de spelersaudit.

### B02 — P1: mislukte vraagopslag kan oude antwoorden kwijtmaken

**Onderdeel:** vraag-editor.

**Locatie:** `app/api/admin/routes/[id]/punten/[pid]/vraag/route.ts:69`, `:80` en `:100`; antwoordverwijzing: `supabase/migrations/001_schema.sql:170`.

De handler wijzigt eerst de vraag, verwijdert daarna alle antwoordopties en voegt vervolgens nieuwe opties toe. Deze stappen vormen geen transactie. Als de laatste stap mislukt, zijn de oude opties weg terwijl de nieuwe vraagtekst al is opgeslagen. Een foutmelding betekent hier dus niet dat de vorige versie behouden is.

Daarnaast verwijst `player_point_progress.selected_answer_id` volgens het schema naar bestaande opties zonder `ON DELETE SET NULL`. Bij een eerder beantwoorde vraag kan het verwijderen van de opties daardoor al op een foreign key vastlopen, nadat de vraagtekst gewijzigd is.

**Lokaal bevestigd:** gesimuleerde invoegfout → HTTP 500, nieuwe vraagtekst opgeslagen, oude opties verdwenen. Het foreign-keygeval is vastgesteld uit het schema, niet tegen een echte database uitgevoerd.

**Herstel:** sla de vraag en opties transactioneel op. Behoud bestaande optie-ids waar mogelijk en spreek expliciet af hoe historische antwoorden en reeds geopende vragen worden behandeld.

### B03 — P1: bulkimport tijdens een spel kan teams hun sessie laten verliezen

**Onderdeel:** route-editor / punten importeren tijdens een lopend spel.

**Locatie:** `app/api/admin/routes/[id]/punten/meerdere/route.ts:71`, `lib/route-sessies.ts:16` en `:20`, `app/speler/kaart/page.tsx:65`.

Alle geïmporteerde routepunten worden tegelijk toegevoegd. Daarna worden de teamvolgordes punt voor punt aangepast. Na ieder afzonderlijk punt verstuurt de helper al het signaal om te vernieuwen. Bij twee nieuwe punten kan de spelerspagina dus vijf routepunten en slechts vier punten in de eigen volgorde zien. De pagina behandelt dit als een ongeldige sessie en zet deze op `vervallen`.

**Lokaal bevestigd:** import van twee punten op een route met drie punten geeft eerst een vernieuwsignaal bij 5 routepunten en 4 teampunten. De echte spelerspagina verklaart die sessie vervolgens vervallen.

**Herstel:** werk de route en alle teamvolgordes als één consistente wijziging bij. Verstuur één vernieuwsignaal na afronding. Vervang bovendien het definitief laten vervallen van een sessie bij een tijdelijke mismatch door herstel of gecontroleerd opnieuw proberen.

### B04 — P1: opruimen meldt succes wanneer databasewijzigingen mislukken

**Onderdeel:** dashboard / Nieuw spel voorbereiden.

**Locatie:** `app/api/admin/reset/route.ts:39`, `:51` en `:63`.

Vrijwel alle verwijder- en updateopdrachten negeren het Supabase-resultaat. Supabase geeft databasefouten doorgaans terug als `error`; het ontbreken van een exception betekent geen succes. Ook bij mislukte verwijderingen kan de handler HTTP 200 en `ok: true` teruggeven. Een gedeeltelijk geslaagde reset kan bijvoorbeeld foto's uit de opslag verwijderen terwijl bijbehorende gegevens achterblijven.

**Lokaal bevestigd:** alle databasemutaties laten mislukken → nog steeds HTTP 200 met succesantwoord.

**Herstel:** controleer iedere stap en gebruik een transactie voor de database. Regel opslagopruiming apart, met een herhaalbare taak en een zichtbaar resultaat, zodat een opslagfout of databasefout geen onzichtbare gedeeltelijke reset oplevert.

### B05 — P1: nieuw spel voorbereiden laat de oude eindtijd en spelstatus staan

**Onderdeel:** dashboard / opruimen en volgende ronde starten.

**Locatie:** `app/api/admin/reset/route.ts:61`; startcontrole: `app/api/speler/sessie/route.ts`.

Reset wist sessies, maar zet op de route alleen de tussenstandtrigger en uitslagvrijgave terug. Een verstreken `eindtijd` blijft staan. De volgende speler kan daardoor niet starten en krijgt “Het spel is afgelopen”. Ook `gepauzeerd_sinds` blijft staan; bij een reset tijdens pauze begint de nieuwe ronde dus niet vrij. De per-vraagstatus `stem_gesloten` wordt evenmin teruggezet, hoewel de stemmen zelf zijn verwijderd.

**Lokaal bevestigd:** reset geeft HTTP 200; de oude eindtijd blijft staan; een daaropvolgende echte sessiestart geeft HTTP 400. Pauze en stemstatus zijn via code-inspectie vastgesteld.

**Herstel:** onderscheid vaste route-instellingen van status van een speelronde. Initialiseer eindtijd, pauze, stemstatus en overige rondegebonden velden expliciet voor een nieuwe ronde. Maak duidelijk welke instellingen de beheerder opnieuw moet kiezen.

### B06 — P1: een mislukte routewisseling schakelt de huidige route toch uit

**Onderdeel:** dashboard / route activeren.

**Locatie:** `app/api/admin/routes/[id]/activeren/route.ts:21` en `:25`.

De handler zet eerst alle routes uit en probeert daarna de gekozen route aan te zetten. Als het doel intussen verwijderd is, of de tweede update mislukt, blijft het systeem zonder actieve route achter. De foutmelding herstelt de oorspronkelijke route niet. Dit kan ook gebeuren nadat de beheerder bewust heeft bevestigd dat een lopende route mag worden vervangen.

**Lokaal bevestigd:** tweede update laten mislukken → HTTP 500, bestaande route toch gedeactiveerd.

**Herstel:** valideer het doel vooraf en voer de wissel in één database-transactie uit met behoud van de unieke-actieve-routebeperking. Bij mislukking moet de vorige route actief blijven.

### B07 — P1: de pagina-allowlist voor helpers laat alle beheerpagina's door

**Onderdeel:** rollen en paginatoegang.

**Locatie:** `middleware.ts:6` en `:59`; concreet getroffen pagina: `app/admin/rapport/page.tsx:8`.

De allowlist bevat `/admin`. De controle staat daarnaast ieder pad toe dat met een toegestaan pad plus `/` begint. Daardoor valt ook `/admin/rapport` onder `/admin`. Pagina's met een eigen admincontrole, zoals de route-editor, blokkeren de helper alsnog. Het rapport heeft die controle niet en haalt via de service-role gegevens en deelbare kaart-/albumlinks op. Het verbergen van het menu voorkomt deze directe toegang niet.

**Lokaal bevestigd:** de echte middleware laat een helper door naar `/admin/rapport`. De ontbrekende paginacontrole en gegevensopbouw zijn via code-inspectie vastgesteld. De admincontroles op schrijf-API's blijven afzonderlijk bestaan; dit geeft geen algemene schrijfrechten.

**Herstel:** behandel `/admin` uitsluitend als exacte match. Sta subpaden alleen toe waar dat expliciet nodig is, en controleer de rol ook op gevoelige serverpagina's.

### B08 — P2: profiel wissen voor de volgende groep faalt op `icon: null`

**Onderdeel:** spelersbeheer / Volgende groep.

**Locatie:** `app/api/admin/groepen/kaartjes/route.ts:30`; constraint: `supabase/migrations/001_schema.sql:137`.

De profielreset schrijft `icon: null`, terwijl het lokale schema `players.icon NOT NULL` voorschrijft. De hele update van die speler faalt dan: ook naam, telefoon en apparaatbinding blijven staan. De fout wordt genegeerd. Het antwoord aan de browser zet de naam wel op null en wekt zo de indruk dat het wissen gelukt is.

**Lokaal bevestigd met de schemaconstraint in de mock:** HTTP 200 en nieuwe kaartjes, maar de oude profielgegevens blijven staan. De constraint op productie is niet gecontroleerd.

**Herstel:** gebruik een geldig standaardicoon of maak de kolom bewust nullable via een migratie. Controleer de update voordat nieuwe inloggegevens worden teruggegeven.

### B09 — P2: de livekaart wijst naar het laatst bereikte punt

**Onderdeel:** dashboard en livekaart.

**Locatie:** `lib/admin-live.ts:264` en `:267`; gebruik op de kaart: `components/admin/AdminLiveLeaflet.tsx:149` en `:253`.

`volgend_punt_id` en de doelcoördinaten worden afgeleid van `current_point_id`. Dat veld bevat het laatst bereikte punt; het schuift niet automatisch door bij het beantwoorden. Na vertrek kan de stippellijn dus terug naar het vorige punt wijzen. Ook “op weg naar dit punt” gebruikt dan de verkeerde bestemming.

**Lokaal bevestigd:** een team met een afgerond startpunt krijgt datzelfde startpunt terug als volgend doel.

**Herstel:** bereken het doel uit de eigen teamvolgorde en verwerkte voortgang, inclusief verspreid-modus en banaanwijzigingen. Hergebruik daarvoor dezelfde regels als de spelersapp; maak onderscheid tussen een vraag die nog openstaat en een volgend te bezoeken punt.

### B10 — P2: oude liveantwoorden kunnen een nieuwere stand overschrijven

**Onderdeel:** dashboard en livekaart.

**Locatie:** `components/admin/useLiveData.ts:16`, `:18` en `:28`.

Polling en realtime-events starten onafhankelijk nieuwe verzoeken. Er is geen beperking op overlappende verzoeken en geen controle op de volgorde waarin antwoorden binnenkomen. Een langzaam oud verzoek kan daardoor na een nieuwer verzoek de volledige stand vervangen. Dezelfde oude gegevens worden ook naar de gedeelde beheerstatus gestuurd.

**Lokaal bevestigd met de echte hook en gecontroleerde antwoordvolgorde:** eerst verschijnt score 20; daarna overschrijft het oudere antwoord die met 10. De database hoeft daarbij niet te veranderen.

**Herstel:** voeg gelijktijdige verversingen samen en accepteer alleen het antwoord van de nieuwste geldige aanvraag, of gebruik een oplopende serverversie. Ruim lopende verzoeken op bij vertrek van de pagina.

### B11 — P2: volgorde opslaan meldt succes bij mislukte updates

**Onderdeel:** route-editor / punten verslepen.

**Locatie:** `app/api/admin/routes/[id]/punten/volgorde/route.ts:17`, `:23` en `:28`; optimistische weergave: `components/admin/RouteEditorShell.tsx:1080`.

De handler zet eerst tijdelijke nummers en daarna definitieve nummers, maar controleert geen van de updateresultaten. Hij geeft altijd `ok: true`. De editor heeft de lokale lijst dan al omgezet. De beheerder kan dus “Opgeslagen” zien terwijl de database de oude volgorde of tijdelijke nummers heeft. Het verzoek controleert bovendien niet of de lijst alle routepunten precies eenmaal bevat.

**Lokaal bevestigd:** iedere update laten mislukken → HTTP 200 met succesantwoord.

**Herstel:** valideer een volledige, unieke lijst van punten van de route, sla de volgorde transactioneel op en retourneer de opgeslagen versie. Herstel de lokale lijst bij een fout.

### B12 — P2: de eindstand wordt zichtbaar vóór de laatste afrekening

**Onderdeel:** dashboard / Uitslag vrijgeven.

**Locatie:** `app/api/admin/uitslag/route.ts:18`, `:28` en `:30`.

De route krijgt eerst `uitslag_vrijgegeven: true`. Pas daarna worden stem- en puzzelpunten verwerkt en items afgehandeld. Een speler kan in dat tijdvenster een eindstand en podium ophalen waarin die punten nog ontbreken. Bij een fout tijdens de afrekening blijft de vrijgave al opgeslagen.

**Lokaal bevestigd:** tijdens het begin van de afrekening staat de vrijgavevlag al op true.

**Herstel:** rond afrekening en itemafhandeling eerst succesvol af en publiceer daarna. Voorkom gelijktijdige dubbele afrekening met dezelfde transacties en idempotentie die in de spelersaudit bij scoreverwerking zijn aanbevolen.

## Aanbevolen vervolg

1. Herstel B01 en B07 voor betrouwbare grenzen tussen groepen en rollen.
2. Herstel B02/B03/B04/B06 met consistente, gecontroleerde databasemutaties. Combineer dit met de eerdere score- en idempotentiebevindingen uit de spelersaudit.
3. Definieer een speelronde-initialisatie en herstel daarmee B05/B08/B12.
4. Herstel B09/B10/B11 en test daarna de vier beheeronderdelen samen met meerdere telefoons en een aparte testdatabase.

Controleer bij die vervolgstap de daadwerkelijk geïnstalleerde constraints, grants en policies. De simulaties hebben geen productieconfiguratie uitgelezen. Test vooral: meerdere beheerders tegelijk, een vraag wijzigen na eerdere antwoorden, import tijdens een lopend spel, een reset na eindtijd/pauze, en opnieuw inloggen met een kaartje van de vorige groep.
