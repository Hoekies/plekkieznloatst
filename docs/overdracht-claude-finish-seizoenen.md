# Overdracht aan Claude: finish per seizoen en feestdag

Datum: 26 oktober 2026. Uitgevoerd door Codex op verzoek van René.

## Actuele status na grafische audit

Tijdens de latere grafische audit zijn de eerder gewijzigde finishpagina, finishcomponent en globale stijlen buiten dat auditwerk gewijzigd. De seizoenskoppeling ontbreekt nu in `FinishScherm.tsx`; alleen `lib/finish-thema.ts` staat nog als nieuw codebestand klaar. De onderstaande tekst beschrijft de eerder uitgevoerde en geteste implementatie, niet de huidige complete werkboom. De audit heeft deze externe wijziging niet teruggedraaid. Zie `docs/audit-grafisch-2026-10-26.md` voor de huidige visuele bevindingen.

## Resultaat

Het spelersfinishscherm wisselt automatisch van kleuren, versiering, felicitatie en confettikleuren. Alle twaalf bestaande thema's uit `lib/seizoenen.ts` worden gebruikt: lente, zomer, herfst, winter, Halloween, Sinterklaas, Kerst, Oud & nieuw, Valentijn, Carnaval, Pasen en Koningsdag. Op 26 oktober is Halloween actief, met pompoenen, spoken, vleermuizen en oranje/paarse accenten.

De datumselectie hergebruikt `huidigThema` en `THEMAS`; feestdagen krijgen dezelfde voorrang als in de bestaande kalender. Bij overlappende feestdagen blijft de volgorde uit `THEMAS` bepalend (bijvoorbeeld Valentijn vóór Carnaval). De finish rekent met de kalenderdag in Europe/Amsterdam en ontvangt het gekozen thema vanaf de server, zodat server en browser dezelfde eerste weergave hebben.

De decoratie is met CSS en emoji gemaakt; geen extra afbeeldingen, afhankelijkheden of databasewijzigingen nodig. Decoratie vangt geen aanrakingen af, staat buiten de toegankelijkheidsboom en respecteert minder beweging. Het bestaande scrollgedrag blijft behouden.

## Bestanden

- `lib/finish-thema.ts` (nieuw): twaalf visuele thema's en `huidigFinishThema(datum?)`.
- `app/speler/finish/page.tsx`: geeft de gekozen `themaSleutel` door aan het finishscherm.
- `components/speler/FinishScherm.tsx`: themakleuren voor confetti en punten, een themanaam, felicitatie en acht decoraties in de kop.
- `styles/globals.css`: afgebakende `.finish-scherm`-stijlen, CSS-variabelen en een korte dwarrelanimatie.

## Relatie met logo's

De oorkonde en gedeelde uitslag gebruiken al `/spellogo/vierkant.webp`; deze blijven de bestaande geüploade seizoenslogo's gebruiken. De nieuwe finishdecoratie werkt op datum, ook zonder uploads. De bestaande logoselectie kiest alleen thema's waarvoor een logo is geüpload. Zonder bijvoorbeeld een Halloween-logo kan de oorkonde dus het herfstlogo of het standaardlogo tonen terwijl de finish Halloween toont. Dit is bewust om de finish zonder extra beheerwerk te laten meewisselen.

## Controle

- TypeScript (`tsc --noEmit`): geslaagd.
- ESLint (`next lint --quiet`): geslaagd.
- Bestaande zelftest: alle 9 onderdelen geslaagd.
- 16 aanvullende datumcontroles uitgevoerd: alle thema's, overlap Valentijn/Carnaval, jaarwisseling en Nederlandse middernacht. Alle 12 kleurpaletten gecontroleerd.
- Productiebouw met `PR_DIST=.next-controle`: geslaagd. De bouw meldt waarschuwingen in bestaande, ongewijzigde componenten; geen nieuwe waarschuwingen in de aangepaste finishcomponent.
- `git diff --check`: geslaagd.

`npm run controle` bleef bij het via npx ophalen van de niet lokaal geïnstalleerde tsx-runner wachten en is afgebroken. De zelftest is vervolgens lokaal met de reeds geïnstalleerde TypeScript-transpiler uitgevoerd; de bouw is apart uitgevoerd. Er zijn geen pakketten geïnstalleerd of lockfiles gewijzigd.

Geen visuele browsercontrole met een ingelogde speler uitgevoerd. Controleer op een telefoon een voltooide sessie via `/speler/finish`, inclusief scrollen, teamfoto, oorkonde en vrijgegeven eindstand. Voor andere thema's kan tijdens een lokale controle tijdelijk een vaste `themaSleutel` aan `FinishScherm` worden meegegeven; herstel daarna de automatische selectie.

Wijzigingen staan lokaal en zijn niet gecommit, gepusht of gepubliceerd. Dit bestand is de overdracht; Claude heeft geen automatisch bericht ontvangen.
