# Gebruiksaudit van de editor

Datum: 26 oktober 2026. Uitgevoerd door Codex op verzoek van René.

## Beoordeling

De editor biedt veel bruikbare functies: Eerste stappen, vragen achter elkaar invullen, verslepen, automatische plaatsing, routecontrole en testen als speler. De vaste opslaanbalk en waarschuwing bij het verlaten van een gewijzigde vraag zijn goede uitgangspunten.

Het grootste gebruiksprobleem is de betrouwbaarheid van de handelingen eromheen. De begeleide routebouw mist een verplichte vraag, sommige wijzigingen verdwijnen zonder waarschuwing en foutmeldingen kunnen botsen met een volgende stap of succesmelding. Daardoor kan een beheerder niet steeds afgaan op “klaar”, “geplaatst” of “ongedaan”.

Deze audit bevat **negen bevindingen: vier met hoge prioriteit, vier met middelhoge prioriteit en één ontwerpaanbeveling**. Er zijn geen reparaties uitgevoerd.

## Methode en beperkingen

De gebruiksroute is in de componenten en gekoppelde functies gevolgd: een nieuwe route maken, punten plaatsen, vragen toevoegen, puntgegevens aanpassen, opslaan, de route controleren en een fout herstellen. Negen geïsoleerde controles voeren de werkelijke bronfuncties, JSX-handlers of wijzigingsvergelijking uit met lokale testgegevens en nagebootste netwerkreacties.

De proeven zijn opnieuw uitvoerbaar met:

```text
node docs/audit-editor-gebruik/proeven.cjs
```

Zie [de lokale proeven](audit-editor-gebruik/proeven.cjs). De testcode haalt de onderzochte functies rechtstreeks uit de TypeScript-bron; appcode is niet aangepast. Er zijn geen echte API-verzoeken, databasewijzigingen of acties met echte routes uitgevoerd.

Dit is een gebruiksaudit op basis van taakscenario's, broninspectie en geïsoleerde interactieproeven. Het is geen gebruikersonderzoek met proefpersonen en geen volledige browserronde met echte kaarten. De eerdere [grafische audit](audit-grafisch-2026-10-26.md) behandelt leesbaarheid en schermindeling. De [beheeraudit](audit-beheer-2026-10-26.md) behandelt onder meer de technische opslag en import tijdens een lopend spel; die punten zijn hier niet opnieuw geteld.

## E01 — Hoge prioriteit: de begeleide routebouw mist de verplichte startvraag

**Taak:** een nieuwe route in verspreid-modus van begin tot eind klaarzetten.

**Scenario:** maak een start, twee vraagpunten en een finish. Vul via “Alle vragen” beide aangeboden vragen in. De lijst is dan volledig ingevuld, maar de routecontrole meldt dat de verplichte startvraag nog ontbreekt.

De gegenereerde start is een informatiepunt. De vragenlijst neemt alleen punten met type `vraagpunt` mee. Ook het informatiepuntpaneel biedt alleen een knop om een vraag te bewerken als er al een vraag hangt. Een nieuwe startvraag toevoegen is zo niet direct bereikbaar via de voor de hand liggende stappen. De gebruiker moet een omweg vinden, bijvoorbeeld tijdelijk het punttype veranderen.

**Lokaal bevestigd:** de start ontbreekt in de vragenlijst, de controle blokkeert erop en het informatiepuntpaneel zonder bestaande vraag bevat geen nieuwe-vraagactie.

**Verbetering:** neem alle verplichte vragen op in dezelfde taaklijst, met expliciet “Startvraag” en eventueel “Finishopdracht”. Geef in het puntpaneel ook bij een informatiepunt de mogelijkheid om een vraag toe te voegen. Laat een fout in de routecontrole rechtstreeks naar die invoer springen.

**Bron:** `components/admin/RouteEditorShell.tsx:982` en `:2513`, `components/admin/editor/Formulieren.tsx:133`, `lib/route-controle.ts:28`.

## E02 — Hoge prioriteit: opnieuw genereren kan ingevuld werk zonder herstel wissen

**Taak:** de ligging van een eerder gemaakt rondje opnieuw laten berekenen.

**Scenario:** ga in Eerste stappen terug naar het voorbeeld en kies “Opnieuw maken”, nadat punten en vragen al zijn ingevuld.

Dit pad roept de generator direct aan. Die verwijdert de bestaande punten en maakt nieuwe punten met nieuwe ids. Vragen gaan volgens het schema mee bij het verwijderen. Deze handeling wordt niet in de undo-geschiedenis opgenomen. In het andere cirkelpaneel bestaat wel een bevestiging voor het vervangen van bestaande punten; de wizard gebruikt die niet.

**Lokaal bevestigd:** de wizardknop laat de echte generator vier bestaande punten verwijderen, zonder extra bevestigingsstap of undo-opslag. Het verdwijnen van gekoppelde vragen volgt uit de `ON DELETE CASCADE`-regel in het lokale schema; er is geen echte database gewist.

**Verbetering:** maak “punten verplaatsen” de gebruikelijke bewerking wanneer er al vragen bestaan. Als volledig vervangen noodzakelijk is, benoem het verlies van vragen en andere puntgegevens vooraf en bied een herstelbare kopie of routeversie aan. Gebruik op beide plaatsen dezelfde bescherming.

**Bron:** `components/admin/editor/EersteStappen.tsx:125`, `components/admin/RouteEditorShell.tsx:779` en `:2741`, `supabase/migrations/001_schema.sql:97`.

## E03 — Hoge prioriteit: een laadfout ziet eruit als een nog lege vraag

**Taak:** een bestaande vraag openen om iets kleins te wijzigen.

Als de server een fout geeft bij het ophalen, opent `openVraag` het formulier met `vraag: null`. Dat is dezelfde toestand als “hier bestaat nog geen vraag”. De gebruiker krijgt geen onderscheid tussen een lege vraag en een bestaande vraag die tijdelijk niet geladen kon worden. Bij opnieuw invullen en opslaan kan de oorspronkelijke inhoud worden vervangen. “Alle vragen” gebruikt een vergelijkbare terugval naar null bij fouten.

**Lokaal bevestigd:** HTTP 500 bij het laden levert een leeg bewerkformulier op via de onderzochte handler.

**Verbetering:** houd “laden”, “geen vraag gevonden” en “laden mislukt” gescheiden. Toon bij een fout een duidelijke melding met “Opnieuw proberen” en blokkeer bewerken/opslaan totdat de bestaande inhoud betrouwbaar is opgehaald.

**Bron:** `components/admin/RouteEditorShell.tsx:1018`, `components/admin/editor/AlleVragenVenster.tsx`, laadeffect.

## E04 — Hoge prioriteit: een mislukte undo verdwijnt uit de geschiedenis

**Taak:** een vergissing herstellen wanneer de verbinding tegenzit.

De laatste herstelstap wordt al uit de geschiedenis verwijderd voordat de herstelopdracht is gelukt. Mislukt de aanvraag, dan is de wijziging niet ongedaan gemaakt en ontbreekt de stap om het opnieuw te proberen. De functie die juist vertrouwen moet geven bij vergissingen is daardoor het kwetsbaarst wanneer herstel nodig is.

**Lokaal bevestigd:** een undo-opdracht met HTTP 503 verbruikt de enige geschiedenisstap.

**Verbetering:** verwijder een herstelstap pas na bevestigde voltooiing. Bewaar hem bij een fout en bied “Opnieuw proberen” aan. Leg bij herstel over meerdere aanvragen ook vast welke delen al gelukt zijn.

**Bron:** `components/admin/RouteEditorShell.tsx:1093` en het verdere herstelpad.

## E05 — Middelhoge prioriteit: puntgegevens gaan verloren bij een gewone sluitactie

**Taak:** de naam of instructietekst van een punt aanpassen.

Het puntpaneel bewaart de invoer lokaal totdat de gebruiker op Opslaan drukt. De sluitknop sluit direct. Ook een tik op de kaart buiten het paneel sluit het paneel, zonder controle op gewijzigde velden. Dat is gemakkelijk per ongeluk te doen bij het verplaatsen of oriënteren op de kaart. Bij de vraag-editor bestaat zo'n waarschuwing wel, waardoor gelijksoortige bewerkingen verschillend aanvoelen.

**Lokaal bevestigd:** na tekstinvoer sluit het echte puntpaneel via zijn sluitknop zonder opslag of eigen waarschuwing. De kaartklikroute die hetzelfde paneel direct sluit is in de bron gecontroleerd.

**Verbetering:** gebruik dezelfde bescherming voor punt- en vraagformulieren. Bied bij gewijzigde invoer duidelijk “Opslaan”, “Wijzigingen weggooien” en “Verder bewerken”. Maak ook zichtbaar welke onderdelen automatisch opslaan en welke een handmatige opslag vragen.

**Bron:** `components/admin/editor/Formulieren.tsx:93`, `components/admin/RouteEditorShell.tsx:968`.

## E06 — Middelhoge prioriteit: geluid en tijdslimiet vallen buiten de wijzigingswaarschuwing

**Taak:** alleen een geluidsfragment of tijdslimiet van een vraag aanpassen.

De vraag-editor bepaalt “gewijzigd” door een opgeslagen vergelijking van de velden. Daarin ontbreken `geluidPad` en `tijdslimiet`. Wie alleen die instellingen wijzigt en daarna via Terug of de vragenlijst weggaat, krijgt daardoor niet dezelfde waarschuwing als bij een gewijzigde vraagtekst. Het geluid kan al geüpload zijn terwijl de koppeling met de vraag nog niet is opgeslagen.

**Lokaal bevestigd:** wijzigen van beide waarden verandert de werkelijke wijzigingsvergelijking niet.

**Verbetering:** neem alle handmatig op te slaan vraagvelden in de vergelijking op. Maak bij direct opgeslagen neveninstellingen expliciet dat ze al opgeslagen zijn. Controleer afzonderlijk het verlaten via de browser, omdat interne terugknoppen niet iedere navigatie afvangen.

**Bron:** `components/admin/VraagEditorPagina.tsx:211` en `:218`.

## E07 — Middelhoge prioriteit: de wizard gaat verder na mislukte puntgeneratie

**Taak:** de voorgestelde punten aanmaken en doorgaan naar de items.

Eerste stappen wacht wel op de generator, maar krijgt geen succesresultaat terug. Afgevangen API-fouten eindigen als een normaal afgeronde functie. De wizard gaat daarna toch naar de volgende stap. Hetzelfde patroon bestaat bij items plaatsen; de stap met teams/afstand wacht de opslag zelfs niet af. Zo kan het stappenplan voortgang suggereren die niet overeenkomt met de route.

**Lokaal bevestigd:** alle aanvragen om nieuwe routepunten te maken laten mislukken → de wizard gaat alsnog van Voorbeeld naar Items.

**Verbetering:** laat iedere stap een expliciet resultaat teruggeven. Ga alleen verder bij een geslaagde bewerking en geef bij gedeeltelijk resultaat aan wat al is aangemaakt. Laat de gebruiker de fout op dezelfde stap oplossen.

**Bron:** `components/admin/editor/EersteStappen.tsx:119`, `:126` en `:135`; `components/admin/RouteEditorShell.tsx:779`.

## E08 — Middelhoge prioriteit: itemplaatsing kan succes melden terwijl niets is geplaatst

**Taak:** automatisch alle voorgestelde items neerzetten.

De succesmelding gebruikt het aantal voorstellen, niet het aantal geslaagde plaatsingen. Daardoor kan eerst een foutmelding verschijnen en daarna toch “2 items geplaatst”. De beheerder moet zelf de kaart of aantallen controleren om te ontdekken of de handeling gelukt is.

**Lokaal bevestigd:** beide plaatsingsaanvragen laten terugkomen met HTTP 503 → de afsluitende melding zegt nog steeds “2 items geplaatst” met successtatus.

**Verbetering:** tel de geslaagde resultaten. Meld bijvoorbeeld “0 van 2 geplaatst” of “1 van 2 geplaatst” en laat alleen de mislukte voorstellen opnieuw proberen. Laat de wizard bij een fout op de itemstap staan.

**Bron:** `components/admin/RouteEditorShell.tsx:887`, `:910` en `:916`.

## E09 — Ontwerpaanbeveling: opslaan vraagt telkens opnieuw om de puntnaam

**Taak:** achter elkaar meerdere bestaande vragen verbeteren.

Ook als een punt al een goede naam heeft en de naam niet gewijzigd is, opent de eerste klik op Opslaan opnieuw “Hoe heet dit punt?”. De gebruiker moet dus nogmaals opslaan om de vraag echt vast te leggen. Bij veel kleine correcties levert dit telkens dezelfde tussenstap op. Voor nieuwe, automatisch benoemde punten is de naamkeuze nuttiger.

**Lokaal bevestigd:** met een bestaande, ongewijzigde puntnaam opent de eerste opslagactie de naamdialoog en verstuurt nog geen opslagverzoek.

**Verbetering:** sla direct op bij een bestaande bewuste naam. Vraag alleen om een naam bij een nieuw punt of een standaardnaam, en bied hernoemen daarnaast als afzonderlijke actie aan. Dit is een workflowadvies, geen fout in de opslag op zichzelf.

**Bron:** `components/admin/VraagEditorPagina.tsx:346`.

## Aanbevolen vervolg

1. Maak eerst de routebouw sluitend: startvraag bereikbaar en bestaande vragen behouden bij opnieuw berekenen.
2. Maak laden en herstellen betrouwbaar: een laadfout mag geen lege vraag worden en een mislukte undo moet opnieuw geprobeerd kunnen worden.
3. Trek opslaggedrag en waarschuwingen gelijk voor alle formulieren en laat stappen/succesmeldingen volgen uit bevestigde resultaten.
4. Vereenvoudig daarna de veelgebruikte invulroute, met minder herhaalde naamkeuzes.

Laat na herstel een beheerder die de editor niet kent zonder uitleg een route met startvraag, drie vragen en een finishopdracht maken. Laat die persoon ook een punttekst wijzigen, een fout herstellen en een netwerkfout afhandelen. Observeer waar men twijfelt of opnieuw moet beginnen; pas daarna zijn uitspraken over daadwerkelijke gebruikssnelheid of tevredenheid onderbouwd.
