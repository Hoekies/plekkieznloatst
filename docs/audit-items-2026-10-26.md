# Audit van alle spelitems

Datum: 26 oktober 2026. Uitgevoerd door Codex op verzoek van René.

## Conclusie

**Niet alle items werken betrouwbaar.** De gewone puntwerking van onder andere ster, bom, wissel en vraagteken klopt bij afzonderlijk gebruik. De banaan werkt volgens de lokale databaseregels niet. Andere problemen ontstaan bij meerdere actieve effecten, respawn, verschillende vraagsoorten en fouten tijdens het inzetten.

Alle tien typen zijn beoordeeld. Er zijn **50 lokale controles** uitgevoerd met de werkelijke API-handlers en helpers en enkele geïsoleerde clientfuncties. Hieronder staan elf bevindingen: zes met hoge en vijf met middelhoge prioriteit. Sommige bevestigen de eerdere spelersaudit; de combinaties en aanvullende itemgevallen zijn hier verder onderzocht.

Er is geen spelcode gerepareerd en er zijn geen echte spelers, scores, foto's of items gewijzigd.

## Resultaat per item

“Klopt afzonderlijk” betekent dat het beschreven normale scenario lokaal is bevestigd. Het betekent niet dat het item onder alle omstandigheden veilig werkt: de gedeelde opslag- en gelijktijdigheidsproblemen uit I03 blijven van toepassing.

| Item | Bevestigde gewone werking | Problemen / oordeel |
|---|---|---|
| ⭐ Ster | Routebonus wordt bijgeschreven en het item wordt verbruikt. | Klopt afzonderlijk. Kan bij een schrijffout verbruikt worden zonder bonus; directe inzet herstelt niet vanzelf bij verbindingsproblemen. I03/I10. |
| 🔴 Verdubbeling | Gewone goede vraag van 40 levert 80 op. Nul en minpunten laten het effect staan. | Onvolledig: geen verdubbeling bij goedgekeurde foto's of latere afrekening van een open stemvraag. Een betaald infopunt kan het effect juist zonder vraag verbruiken. I05. |
| 📡 Radar | Effectduur is twee minuten; één radar onthult een bekende verre positie. | Tweede actieve radar kan posities laten verdwijnen. Hergebruik na respawn kan op een oud effect vastlopen. I02/I04. |
| 💣 Bom | Trekt de ingestelde waarde af, ook onder nul. | Klopt afzonderlijk, maar dubbel gebruik en herhalen na een fout kunnen extra schade doen. Respawn geeft een extra foutpad. I02/I03. |
| 👻 Spook | Effect krijgt de ingestelde duur; één actief spook blokkeert de bereik-API. | Twee actieve spoken kunnen juist de serverblokkade omzeilen. Respawn heeft dezelfde oude-effectbeperking. I02/I04. |
| 🦹 Dief | Boekt direct punten over en steelt niet meer dan het slachtoffer heeft. | Kan een betaald infopunt als “laatste goede vraag” gebruiken. Overboeken is niet transactioneel. I03/I07. |
| 🍌 Banaan | Keuze van een doelteam en selectie van onbezochte punten zijn aanwezig. | Defect: unieke databasebeperking verhindert de wissel, maar het item wordt toch verbruikt. I01. |
| 🔄 Wissel | Ruilt bij afzonderlijk gebruik de twee scores om. | Gedeelde risico's: gedeeltelijk opgeslagen wissel, gelijktijdige scorewijzigingen en fouten worden onvoldoende afgehandeld. I03. |
| ❓ Vraagteken | Alle vijf uitkomstgroepen zijn deterministisch getest: dubbele ster, groepsworp, jackpot, −200 en bom op jezelf. | Kansvertakkingen en bedragen kloppen in deze controles. Netwerkuitval na oppakken kan het item tijdelijk buiten de zichtbare inventaris laten; scoremutaties delen I03. I10. |
| ⛔ Plek zooi | Eerste aanraking geeft de ingestelde wachttijd. Dezelfde val raakt een team eenmaal en blijft voor andere teams liggen. | De server blokkeert de voortgang niet vanwege deze val. Een opslagfout wordt bovendien als “al gehad” behandeld. I06/I11. |

## Wat ook goed ging in de controles

- Een gewone claim gebruikt een voorwaardelijke update: bij twee claimende teams krijgt slechts één team hetzelfde kaartitem.
- Inzetten op jezelf, op een team van een andere route en met andermans item wordt geweigerd.
- Pauze blokkeert normaal oppakken en inzetten. Voor startitems ontbreekt die controle; zie I09.
- Een gefinisht team kan een toegestane bom nog inzetten; een niet-toegestane ster wordt geweigerd. Na uitslagvrijgave wordt die toegang voor het gefinishte team afgesloten.
- Een bom mag een gefinisht doelteam alleen raken als de route dat toestaat; een spook wordt op een gefinisht doel geweigerd.
- Sequentieel laat gewone kaartitems niet claimen, maar verwerkt de plek-zooi-val wel.
- Startitems hebben de ingestelde soorten/aantallen; een gewone opeenvolgende tweede aanvraag levert geen extra set op. Gelijktijdige aanvragen wel; zie I09.
- Een ongebruikt item blijft eigendom van het team, ook als de respawntijd voorbij is. Een gebruikt item wordt na die tijd op dezelfde plek en met hetzelfde type teruggezet.
- Verlopen radar- en spookeffecten worden in de effectstatus niet meer actief getoond.
- Vervallen na de finish laat alleen de daarvoor gekozen itemtypen beschikbaar.
- Voor alle tien itemtypen bestaat een `.webp`-afbeelding.

## I01 — Hoge prioriteit: banaan verbruikt zonder werkelijke puntenwissel

**Bron:** `app/api/speler/speciaal/effect/route.ts:246`; `supabase/migrations/001_schema.sql:188`.

De handler probeert twee `route_point_id`-waarden rechtstreeks met twee updates om te wisselen. `session_point_order` eist dat ieder punt binnen een sessie uniek is. Beide updates botsen op het nog aanwezige andere punt. De fouten worden niet gecontroleerd. De speler krijgt HTTP 200, een succesmelding en een verbruikte banaan, terwijl de volgorde hetzelfde blijft.

**Bevestigd:** de echte handler uitgevoerd met de unieke regels uit het schema in de simulatie. De puntvolgorde blijft gelijk en `used_at` wordt gezet. Dit bevestigt F01 uit de spelersaudit.

**Herstelrichting:** één gecontroleerde databasebewerking voor wisselen en verbruiken. Respecteer de unieke regel met bijvoorbeeld een uitstelbare constraint; alleen de twee updates na elkaar uitvoeren lost het conflict niet op.

## I02 — Hoge prioriteit: respawn botst op effecten van een eerdere gebruiksronde

**Bron:** `app/api/speler/speciaal/route.ts:21`; `supabase/migrations/001_schema.sql:275`; effectinvoer in `app/api/speler/speciaal/effect/route.ts`.

Respawn maakt hetzelfde item-id opnieuw beschikbaar. Oude effectregels blijven bestaan, terwijl `(special_item_id, target_session_id)` uniek is. Dat voorkomt bijvoorbeeld dat dezelfde radar later opnieuw door hetzelfde team wordt ingezet. Hetzelfde patroon geldt bij een spook op hetzelfde doelteam.

Bij een bom is het ernstiger: de score wordt eerst aangepast. Pas daarna faalt de nieuwe effectregel. De speler ziet een fout en houdt een ongebruikt item, maar de tegenstander heeft al punten verloren. Opnieuw proberen kan opnieuw schade doen. Bij een wissel wordt de fout op de effectinvoer zelfs genegeerd, zodat een nieuwe melding kan ontbreken terwijl scores wel veranderen.

**Bevestigd:** een bom na respawn trekt opnieuw 30 af maar geeft HTTP 500; een radar na respawn geeft HTTP 500. De vergelijkbare spook-/wisselpaden zijn in de code nagegaan.

**Herstelrichting:** onderscheid de vaste kaartplek van een afzonderlijke oppak-/gebruiksronde, met een eigen gebruiks-id. Koppel effecten aan die gebruiksronde. Verwijder niet zomaar alle oude effecten bij respawn: een eerder effect kan nog actief zijn. Behoud voor plek zooi bewust de regel “eenmaal per team per val/spel”.

## I03 — Hoge prioriteit: inzetten en scorewijzigingen zijn niet één betrouwbare actie

**Bron:** `app/api/speler/speciaal/effect/route.ts:41`, `:98`, `:137`, `:150`, `:197` en `:335`; `lib/score.ts:17`.

Het item wordt eerst ongebruikt gelezen, de werking wordt uitgevoerd en pas aan het einde wordt `used_at` gezet. Dat geeft drie problemen:

1. Twee gelijktijdige aanvragen kunnen hetzelfde item gebruiken. Lokaal kon één bom twee verschillende teams elk 30 punten kosten; beide aanvragen kregen HTTP 200.
2. Een gedeeltelijke fout laat het effect staan terwijl het item niet is verbruikt. Een fout bij de bommelding liet de eerste schade staan; na opnieuw proberen waren nogmaals 30 punten weg.
3. Niet iedere schrijffout wordt gecontroleerd. Een ster met een mislukte score-update gaf toch succes en werd verbruikt zonder bonus. Daarnaast leest `telBijScore` eerst een totaal en schrijft daarna terug, waardoor gelijktijdige wijzigingen elkaar kunnen overschrijven.

**Herstelrichting:** reserveer een gebruik atomair en verwerk punten, effecten en verbruik in een transactie. Geef herhaalde aanvragen hetzelfde resultaat zonder nieuwe bijwerkingen. Gebruik atomaire score-increments en een transactie over beide teams voor wissel/dief. Dit sluit aan op F02/F03 uit de spelersaudit.

## I04 — Hoge prioriteit: meerdere radars of spoken worden onjuist opgehaald

**Bron:** `app/api/speler/locaties/route.ts:46`; `app/api/speler/voortgang/bereik/route.ts:64`.

Deze twee paden gebruiken `maybeSingle()` voor actieve effecten, maar beperken het resultaat niet tot één rij. Twee verschillende gebruikte items kunnen legaal twee actieve effectregels opleveren. Supabase geeft dan een fout en `data: null`. Beide handlers negeren de fout.

- Bij radar wordt `null` behandeld als geen radar. Een verre tegenstander die met één radar zichtbaar was, verdwijnt na het inzetten van de tweede radar.
- Bij spook wordt `null` behandeld als geen blokkade. Eén spook geeft HTTP 423 bij bereiken; twee spoken geven in hetzelfde scenario HTTP 200.

Het effectstatus-endpoint gebruikt wel een limiet van één, waardoor de interface nog kan melden dat het effect actief is terwijl een ander endpoint anders reageert.

**Herstelrichting:** bepaal centraal of er minstens één actief effect is en welke eindtijd geldt. Definieer of stapelen verlengt, vervangt of ongewenst is. Controleer queryfouten expliciet.

## I05 — Middelhoge prioriteit: verdubbeling hangt af van het puntenpad

**Bron:** `app/api/speler/voortgang/verwerk/route.ts:134`; scoretoekenning in `app/api/admin/foto/[id]/route.ts`; `lib/stemmen.ts`.

Verdubbeling wordt alleen toegepast in de normale antwoordhandler. Een goedgekeurde foto en de latere afrekening van een open stemvraag gebruiken andere puntenpaden en laten het effect onaangeroerd. Omgekeerd kan een informatiepunt zonder vraag met positieve puntwaarde het effect wel verbruiken. Dit past niet bij de uitleg “Je volgende goede antwoord telt dubbel”.

**Bevestigd:** een vraag van 40 levert met verdubbeling 80 op; een foto of winnende open stemvraag levert slechts 40 op en laat het effect staan. Een infopunt van 10 levert 20 op en verbruikt het effect zonder vraag.

**Herstelrichting:** leg vast welke beloningen meetellen en pas die afspraak toe in één gedeelde puntenafhandeling. Houd bij foto's en stemmen rekening met uitgestelde beoordeling en het moment waarop het item werd ingezet.

## I06 — Hoge prioriteit: plek zooi blokkeert de voortgang alleen in de client

**Bron:** `app/api/speler/voortgang/bereik/route.ts`; clientcontrole in `components/speler/SpelerKaart.tsx`.

De client toont de val en stopt zijn eigen puntdetectie. De bereik-API controleert echter alleen een spook, geen actief plek-zooi-effect. Een rechtstreeks of later verzonden verzoek kan daarom tijdens de val toch een punt bereiken. De normale interface kan de blokkade dus wel tonen terwijl de server voortgang accepteert.

**Bevestigd:** eerst dezelfde sessie een val laten raken en daarna tijdens de actieve wachttijd een punt laten bereiken → HTTP 200.

**Herstelrichting:** controleer de blokkade serverzijdig op alle relevante voortgangspaden. Spreek af wat er met al geopende vragen en offline bewaarde antwoorden moet gebeuren.

## I07 — Middelhoge prioriteit: de dief kan het verkeerde soort beloning kiezen

**Bron:** `app/api/speler/speciaal/effect/route.ts:173`.

De dief zoekt de laatste positieve, correcte voortgangsregel. De query controleert niet of daaraan werkelijk een vraag hing. Een informatiepunt zonder vraag kan ook `is_correct: true` en positieve punten krijgen. Zo kan een infopunt de bedoelde laatste goede vraag verdringen.

**Bevestigd:** een goede vraag van 80 gevolgd door een infopunt van 10 leidt tot slechts 10 gestolen punten.

**Herstelrichting:** selecteer een passende vraagbeloning, of verander de expliciete spelregel en uitleg naar “laatste positieve beloning” als dat de bedoeling is. Kies daarna ook consequent hoe verdubbelde of later goedgekeurde beloningen meetellen.

## I08 — Hoge prioriteit: kaartitems zijn zonder bezoek claimbaar

**Bron:** `app/api/speler/speciaal/claim/route.ts:15` en de claimupdate vanaf `:69`.

De claimhandler gebruikt de eventuele meegegeven locatie voor het logboek, niet voor afstandscontrole. Een bekende item-id is voldoende om een kaartitem te pakken. De client voert de afstandsdetectie uit, maar de server dwingt die niet af.

**Bevestigd:** een ongeclaimde bom wordt met alleen het item-id geclaimd, zonder GPS-gegevens. Dit bevestigt het itemgedeelte van F05 uit de spelersaudit.

**Herstelrichting:** maak een geldige bereikcontrole onderdeel van claimen. Houd daarbij rekening met ouderdom/nauwkeurigheid van de positie en eventuele organisatievrijgave. Browser-GPS blijft manipuleerbaar; deze controle maakt een spel niet volledig fraudebestendig.

## I09 — Middelhoge prioriteit: spelgrenzen en startitems worden niet overal afgedwongen

**Bron:** `lib/item-sessie.ts`, `app/api/speler/speciaal/effect/route.ts:25`, `app/api/speler/startitems/route.ts:13`.

De itemhandler weigert pauze, maar rondt een actieve sessie niet zelf af na de eindtijd. Totdat een ander verzoek dat heeft gedaan, kan een item nog werken. Startitems controleren daarnaast geen gelopen 100 meter en geen pauze; die voorwaarden zitten in de client. De controle “hebben we al startitems gegeven?” staat los van het invoegen, zodat gelijktijdige aanvragen twee sets kunnen maken.

**Bevestigd:** bom inzetbaar na verstreken eindtijd zolang de sessie actief staat; startitems direct en tijdens pauze opvraagbaar; twee gelijktijdige startaanvragen geven twee sets.

**Herstelrichting:** controleer de toegestane spelfase centraal. Geef startitems via één herhaalbare serveractie die maximaal eenmaal per sessie kan slagen en de afgesproken voorwaarden controleert.

## I10 — Middelhoge prioriteit: automatisch gespeelde items herstellen niet altijd na fouten

**Bron:** `components/speler/SpelerKaart.tsx:752` tot en met `:810`.

Ster en vraagteken worden in twee stappen verwerkt: oppakken, daarna direct inzetten. Als een ster wel is opgepakt maar inzetten een foutantwoord krijgt, meldt de client “De bonuspunten komen eraan”. Hij voegt de ster niet aan de lokale inventaris toe en plant geen automatische nieuwe poging. Het serveritem blijft ongebruikt in bezit. Na herladen kan de inventaris het weer ophalen, maar dat is niet wat de melding belooft.

Vraagteken heeft bij een HTTP-fout wel een terugval naar de balk. Bij een echte netwerkexception wordt die terugval overgeslagen, omdat de functie alleen een `finally` en geen opvang/herstel op dat pad heeft.

**Bevestigd:** ster na HTTP 503 blijft serverzijdig ongebruikt maar ontbreekt lokaal; vraagteken na HTTP 503 komt wel in de balk; vraagteken na netwerkexception niet.

**Herstelrichting:** maak oppakken plus direct inzetten één herhaalbare serveractie of bewaar een expliciete hersteltaak. Zet een nog ongebruikt item zichtbaar terug en haal de serverinventaris opnieuw op na een fout.

## I11 — Middelhoge prioriteit: een valfout wordt onterecht “al gehad”

**Bron:** `app/api/speler/speciaal/claim/route.ts:52`; verwerking in `components/speler/SpelerKaart.tsx`.

Elke fout bij het invoegen van een plek-zooi-effect wordt vertaald naar `al_gehad`. Dat is alleen een correcte conclusie bij het bedoelde unieke conflict. Bij een tijdelijke databasefout bestaat er geen effect, maar de client markeert de val toch als al geraakt en probeert deze niet meer.

**Bevestigd:** een niet-unieke, gesimuleerde opslagfout geeft `al_gehad` terwijl de effecttabel leeg blijft.

**Herstelrichting:** onderscheid een werkelijk bestaand effect van een andere opslagfout. Geef in het laatste geval een foutstatus terug en laat de client later opnieuw proberen.

## Bewijs en grenzen van deze audit

De proeven staan in [audit-items/proeven.cjs](audit-items/proeven.cjs), de volledige resultaten in [audit-items/resultaten.json](audit-items/resultaten.json).

```text
node docs/audit-items/proeven.cjs
```

De testomgeving gebruikt de echte handlers, scorehelper, spel-/finishregels en respawncode. De lokale Supabase-simulatie bootst de relevante unieke regels en het gedrag van `maybeSingle()` bij meerdere rijen na. Tijd en toevalsuitkomsten zijn gestuurd om verlopen effecten en alle vraagtekenvertakkingen te kunnen controleren.

**Een geslaagde proef met `FOUT:` in de naam betekent dat de tekortkoming is gereproduceerd, niet dat deze werking goed is.** Dit is een auditset die het onderzochte gedrag vastlegt; na reparaties moeten die verwachtingen worden aangepast naar de gewenste werking.

Er is geen echte Postgres/Supabase-testdatabase gebruikt. Productieconstraints, gelijktijdige database-transacties, RLS, telefoons, echte GPS en het verschijnen van alle effecten op echte kaarten zijn niet live getest. De normale itempopup is via broninspectie beoordeeld; de directe ster-/vraagtekenpaden zijn aanvullend geïsoleerd uitgevoerd. De uitkomsten zijn daarom geen bewijs dat alle niet-getroffen combinaties correct zijn.

## Herstelvolgorde

1. Maak itemgebruik en puntenwijzigingen atomair en herhaalbaar zonder extra bijwerkingen; herstel de banaan in dezelfde fase.
2. Scheid kaartitem en gebruiksronde voor veilige respawn. Herstel de selectie van meerdere actieve effecten.
3. Centraliseer serverregels voor bereik, blokkades, eindtijd en startitems.
4. Trek de puntenregels voor verdubbeling en dief gelijk en herstel de client na verbindingsfouten.
5. Test daarna met twee echte telefoons en een aparte testdatabase: één item tegelijk claimen, dubbel aantikken, twee radars/spoken, oppakken vlak voor finish, respawn op dezelfde speler en een onderbroken verbinding tussen oppakken en inzetten.
