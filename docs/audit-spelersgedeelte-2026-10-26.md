# Audit spelersgedeelte — 26 oktober 2026

Uitgevoerd door Codex op verzoek van René. Alleen onderzoek; geen reparaties uitgevoerd.

## Reikwijdte en methode

Beoordeeld: spelerautorisatie en apparaatcontrole, kaart en GPS-detectie, vragen, voortgang, foto's, items, scoreberekening, offlinewachtrij, finish, puzzel en relevante databaseregels.

Negen lokale controles zijn uitgevoerd met de echte TypeScript-functies en API-handlers, geladen met de aanwezige TypeScript-transpiler. Supabase, authenticatie, opslag en netwerk zijn daarbij vervangen door lokale mocks. Bij de banaan handhaaft de mock de UNIQUE-regel uit het SQL-schema. Er zijn geen verzoeken naar de productiedatabase gestuurd. Dit bevestigt gedrag van de onderzochte code, niet de feitelijke databaseconfiguratie op productie.

Geen mobiele browsertest, GPS-praktijktest of penetratietest van de liveomgeving uitgevoerd. De lokale, nog niet gecommitte seizoenswijzigingen zijn aanwezig gebleven. Algemene build- en lintresultaten uit de voorafgaande finishwijziging zijn geen bewijs dat onderstaande spelgedragingen correct werken.

P1 = hoge prioriteit: beïnvloedt spelintegriteit, toegangscontrole of betrouwbare voortgang. P2 = middelhoge prioriteit: fout onder specifieke gebruiksomstandigheden. Geen P0 vastgesteld binnen deze reikwijdte.

## Bevindingen

### F01 — P1: banaan wordt verbruikt zonder de volgorde te wijzigen

**Locatie:** `app/api/speler/speciaal/effect/route.ts:246`, `supabase/migrations/001_schema.sql:188`.

De twee volgende punten worden met twee afzonderlijke updates omgewisseld. De database eist echter een unieke combinatie van `session_id` en `route_point_id`. De eerste update probeert een punt te gebruiken dat nog op de andere rij staat en faalt; de omgekeerde update faalt om dezelfde reden. De fouten worden niet gelezen. Vervolgens wordt het item als gebruikt opgeslagen en krijgt de speler een succesantwoord.

**Lokaal gereproduceerd:** HTTP 200, twee UNIQUE-fouten, ongewijzigde puntvolgorde en een verbruikte banaan.

**Herstel:** voer de wissel in één databasefunctie/transactie uit met een strategie die de unieke beperking respecteert, bijvoorbeeld een uitstelbare constraint. Verbruik het item alleen als de wissel slaagt. Alleen `Promise.all` vervangen door opeenvolgende updates lost de unieke beperking niet op.

### F02 — P1: gelijktijdige scorewijzigingen overschrijven elkaar

**Locatie:** `lib/score.ts:17`. Hetzelfde lees-dan-schrijfpatroon komt ook rechtstreeks voor in de itemhandler en puzzelafrekening.

`telBijScore` leest de huidige score en schrijft daarna een berekend totaal terug. Een antwoord en een bom, of een foto-keuring en bonus, kunnen dezelfde oorspronkelijke score lezen. De laatste update wist dan de andere wijziging.

**Lokaal gereproduceerd:** vanaf 100 leveren gelijktijdige wijzigingen van +10 en +20 een score van 120 op in plaats van 130.

**Herstel:** gebruik een atomaire SQL-increment (`score = score + delta`) via een databasefunctie. Gebruik voor diefstal en scorewissels een transactie over beide teams en controleer alle databasefouten.

### F03 — P1: één antwoord kan gelijktijdig tweemaal worden verwerkt

**Locatie:** `app/api/speler/voortgang/verwerk/route.ts:44` en `:230`. Vergelijkbaar patroon voor itemgebruik: `app/api/speler/speciaal/effect/route.ts:41` en `:335`.

De controle op `answered_at` staat los van het opslaan. Twee verzoeken kunnen allebei een nog open punt lezen, allebei voortgang opslaan en allebei punten toekennen. Dit kan ook optreden bij de vraagtimer en een net op dat moment ingediend antwoord. Bij items wordt `used_at` pas na de effecten gezet, zonder voorwaardelijke reservering van het item.

**Lokaal gereproduceerd voor antwoorden:** twee gelijktijdige verzoeken krijgen beide HTTP 200 en roepen beide de scorebijschrijving aan. De uiteindelijke score hangt daarnaast af van F02. Het vergelijkbare itemprobleem is via code-inspectie vastgesteld.

**Herstel:** claim een onbeantwoord punt of ongebruikt item atomair, met een voorwaardelijke update en controle op precies één gewijzigde rij. Voer claim, effecten, score en voortgang samen in een transactie uit, zodat een fout geen half verwerkte actie achterlaat. Herhaalde verzending moet hetzelfde resultaat teruggeven zonder nieuwe punten.

### F04 — P1: uitschakelen en toegang intrekken worden niet centraal afgedwongen

**Locatie:** `lib/speler-sessie.ts:10`, `app/api/auth/device-check/route.ts:24` en `:32`, `app/api/admin/groepen/[id]/schakel/route.ts`.

De centrale spelerhelper controleert alleen de identiteit en het bestaan van een speler. `is_uitgeschakeld`, `force_logout_at`, `toegang_tot` en de apparaatbinding worden daar niet gecontroleerd. De laatste drie worden via een afzonderlijk verzoek van de browser gecontroleerd; `device-check` controleert `is_uitgeschakeld` zelfs helemaal niet. De beheerdersknop voor uitschakelen verandert alleen die databasevlag.

Een reeds ingelogde, uitgeschakelde speler kan daardoor blijven spelen. Een cliënt die de apparaatcontrole overslaat kan de API blijven aanroepen met een nog geldige authenticatiesessie, ook na het verlopen van de inloglink of een uitlogopdracht.

**Lokaal gecontroleerd:** de centrale helper selecteert uitsluitend `id` en geeft toegang zonder enige toegangsstatus op te vragen. Het pad van beheeractie naar speler-API is in de code nagegaan.

**Herstel:** dwing de relevante spelerstatus bij ieder beschermd serververzoek af. Koppel tijdslimieten aan de betreffende authenticatiesessie, zodat een controle of een nieuwe login op één apparaat de beperking van een ander apparaat niet ongemerkt kan opheffen.

### F05 — P1: punten kunnen zonder bezoek worden bereikt

**Locatie:** `app/api/speler/voortgang/bereik/route.ts:11` en `:76`; itemclaim: `app/api/speler/speciaal/claim/route.ts:13`.

De bereik-API controleert route en volgorde, maar geen GPS-afstand. Een geldig QR-geheim is alleen vereist wanneer de aanvrager zelf een geheim meestuurt. Alleen een punt-id is voldoende om voortgang te openen. De browser ontvangt de routepunten vooraf en kan de ids dus kennen. Itemclaims controleren evenmin de afstand tot het item; de meegegeven locatie dient alleen voor het logboek.

**Lokaal gereproduceerd voor bereiken:** HTTP 200 met alleen `route_point_id`, zonder positie of QR-geheim. De ontbrekende afstandscontrole bij itemclaims is via code-inspectie vastgesteld.

**Herstel:** maak GPS-bereik of een geldige alternatieve vrijgave een servervoorwaarde. Houd rekening met de bestaande mogelijkheid om stille doorlooppunten te passeren. Gebruik een expliciete, gecontroleerde vrijgave voor organisatiehulp. GPS-gegevens van een browser blijven manipuleerbaar; deze controle is geen garantie tegen vervalste GPS.

### F06 — P1: het puzzelwoord is volgens het schema rechtstreeks leesbaar

**Locatie:** `supabase/migrations/001_schema.sql:339`, `:399` en `:824`.

Spelers hebben een SELECT-policy voor de actieve route. Later wordt `puzzelwoord` aan dezelfde tabel toegevoegd. De expliciete SELECT-intrekkingen beschermen wel vragen, antwoorden, routepunten en items, maar niet `routes`. Row-level security beperkt rijen; deze policy verbergt de puzzelwoordkolom niet. Met de gebruikelijke Supabase-tabelrechten kan een ingelogde speler het volledige woord daardoor rechtstreeks opvragen, buiten de gefilterde puzzel-API om.

**Bewijsniveau:** vastgesteld in het volledige lokale migratiebestand; de daadwerkelijke grants en policies op de live database zijn niet gecontroleerd. Deze bevinding vervalt als de live database aanvullende kolomrechten of een andere toegangsscheiding heeft.

**Herstel:** bewaar het antwoord in een tabel die alleen de server kan lezen, of trek directe routetoegang in en bied uitsluitend veilige routevelden aan. Controleer daarbij eerst alle bestaande browser- en realtime-afhankelijkheden.

### F07 — P1: offline antwoorden zijn niet aan een team of sessie gekoppeld

**Locatie:** `lib/wachtrij.ts:6` en `:7`, `app/api/auth/uitloggen/route.ts`.

Alle spelers delen de lokale sleutel `pr_wachtrij`. Een opdracht bevat URL, body en tijd, maar geen speler- of sessie-identiteit. Na uitloggen en inloggen als een ander team wordt de resterende wachtrij met de nieuwe login verstuurd. De API kiest de sessie uit die nieuwe login. Op dezelfde route kan een antwoord daardoor bij het verkeerde team terechtkomen; anders kan het worden afgewezen en verwijderd. Hetzelfde risico geldt na een spelreset met een nieuwe sessie.

**Lokaal gereproduceerd:** antwoord opgeslagen voor Team A tijdens een verbindingsfout; na accountwissel verstuurd onder Team B.

**Herstel:** geef elke opdracht een speler- en sessie-id, bewaar wachtrijen per sessie en controleer die identiteit ook op de server. Verstuur een oude wachtrij nooit automatisch voor een nieuwe sessie. Geef de speler zicht op nog niet gesynchroniseerde antwoorden bij wisselen van account of spel.

### F08 — P2: afgewezen offline antwoorden verdwijnen zonder herstelmogelijkheid

**Locatie:** `lib/wachtrij.ts:29` en `:43`.

De wachtrij verwijdert een opdracht na vrijwel elke 4xx-respons. Een 400 met “Punt nog niet bereikt” wordt bijvoorbeeld verwijderd alsof de opdracht afgehandeld is, terwijl een afhankelijke bereikstap mogelijk mislukte. De speler had lokaal al de melding gekregen dat het antwoord bewaard was. Er blijft geen foutstatus of opnieuw-versturenoptie over.

**Lokaal gereproduceerd:** een opgeslagen antwoord verdwijnt bij HTTP 400 volledig uit de wachtrij.

**Herstel:** maak onderscheid tussen aantoonbaar al verwerkte opdrachten, tijdelijke fouten en blijvende conflicten. Bewaar mislukte opdrachten met hun reden en bied een herstelpad. Verwerk afhankelijke stappen pas als de voorgaande stap bevestigd is.

### F09 — P2: de tijdslimiet van een vraag wordt alleen door de browser gehandhaafd

**Locatie:** `components/speler/VraagPopup.tsx:140`, `app/api/speler/voortgang/verwerk/route.ts:24` en `:76`.

De browser begint de klok bij het tonen van de vraag en meldt zelf `te_laat`. De server controleert de verstreken vraagtijd niet. Herladen start de browserklok opnieuw; een eigen verzoek zonder `te_laat` krijgt ook na de limiet nog punten. De globale eindtijd van het spel wordt wel apart gecontroleerd in deze antwoordhandler; dit probleem betreft de tijdslimiet per vraag.

**Lokaal gereproduceerd:** een vraag met een limiet van tien seconden en een oud bereikt-tijdstip krijgt nog punten wanneer `te_laat` ontbreekt.

**Herstel:** leg het werkelijke startmoment van de vraag serverzijdig vast en beoordeel de deadline daar, met een expliciete afspraak voor offline antwoorden en pauzes. Gebruik niet blind `reached_at`: de startvraag wordt bewust pas na een stukje lopen getoond.

### F10 — P2: bijgewerkte vragen blijven uit de oude cache komen

**Locatie:** `lib/vraag-cache.ts:5` en `:8`, `components/speler/SpelerKaart.tsx:584`.

De vraagcache is alleen op punt-id geïndexeerd en kent geen vervaldatum of invalidatie. “Wijzigingen naar spelers sturen” doet een `router.refresh()`, wat deze modulecache niet leegt. Een vooraf opgehaalde vraag blijft daardoor oud als de beheerder de vraag of antwoorden wijzigt. Het team kan een oude vraag zien terwijl de server de nieuwe inhoud beoordeelt.

**Lokaal gereproduceerd:** twee keer dezelfde vraag ophalen geeft de oude versie terug en doet maar één netwerkverzoek, ook wanneer de netwerkbron inmiddels nieuwe inhoud heeft.

**Herstel:** koppel cache-items aan een route- of vraagversie en invalideer ze bij het vernieuwsignaal. Bepaal ook hoe een reeds geopende vraag tijdens een wijziging moet worden afgehandeld.

## Aanbevolen volgorde

1. F01 repareren en F02/F03 gezamenlijk oplossen met transacties en herhaalbare acties zonder dubbele bijwerkingen.
2. F04/F05 centraal afdwingen; de live databaserechten uit F06 controleren en zo nodig beperken.
3. F07/F08 gezamenlijk herstellen met sessiegebonden, herstelbare offlineopslag.
4. F09/F10 afwerken en daarna op echte telefoons een volledige ronde testen, inclusief slecht bereik, herladen, accountwissel, itemgebruik en wijzigingen door de beheerder.

Voor de vervolgreview: controleer de echte Supabase-grants/policies en reproduceer de herstelde transacties tegen een aparte testdatabase. De lokale mocks vervangen die databasecontrole niet.
