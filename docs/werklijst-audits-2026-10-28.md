# Werklijst audits (26–27 oktober 2026)

Samengevoegd uit alle negen `docs/audit-*`-rapporten. Overlappende bevindingen staan bij elkaar. Stand: 28 oktober 2026.
Proeven: `node docs/audit-items/proeven.cjs` (50/50) en `node docs/audit-vragen-antwoorden/proeven.cjs` (40/40). **OPGELOST** in een proefnaam bewaakt het gewenste gedrag; **FOUT** reproduceert een nog open punt.

## Opgelost

| Onderdeel | Bevindingen | Wat er nu gebeurt |
|---|---|---|
| Scores | F02, I03.3, QA02 | Punten erbij, wissel, dief en banaan in één stap in de database (migratie 002, `lib/score.ts`); zonder migratie de oude manier. Een mislukte scorewijziging geeft een fout in plaats van succes. |
| Antwoord dubbel verwerkt | F03, QA02 | Het punt wordt eerst geclaimd (`answered_at` van leeg naar gevuld); het tweede verzoek krijgt 409. Mislukt de score, dan gaat het punt weer open. Verdubbeling wordt alleen gebruikt door het verzoek dat het effect echt weghaalt. |
| Item dubbel/half gebruikt | F03, I03, I02 | Item eerst atomair geclaimd, dan pas effecten; mislukt iets, dan komt het item terug. Effecten met upsert, zodat respawn niet botst op het oude effect. |
| Banaan | F01, I01 | Ruilt de volgorde via een tijdelijke plek; item pas verbruikt als de ruil lukt. |
| Meerdere radars/spoken | I04 | `limit(1)` bij radar en blokkade; databasefout geeft 503. |
| Plek zooi op de server | I06 | Bereiken wordt ook tijdens plek zooi geblokkeerd (423). |
| Valfout | I11 | Alleen het unieke conflict is "al gehad"; andere fouten 503. |
| Bereiken/oppakken zonder bezoek | F05, I08 | Server controleert de afstand (straal + 100 m + GPS-onnauwkeurigheid). Doorlooppunten en QR uitgezonderd. De app stuurt de positie mee. |
| Eindtijd bij items/foto | I09 (deel), QA04 | Item en foto na de eindtijd geweigerd. |
| Foto-API | QA04, QA05 | Alleen bij een echte foto-opdracht; punt eerst geclaimd, bij een uploadfout weer open; een halverwege gebleven inzending kan worden afgerond. Keuren alleen als de foto nog wacht; minpunten tellen ook; bij een scorefout terug naar "wacht". |
| Handmatig goedkeuren | QA02 | Alleen als het antwoord nog zo staat; bij een scorefout terug. |
| Stemmen | QA06 | Een stem na het sluiten verandert de winnaar niet meer; sluiten telt nooit dubbel. |
| Puzzel | (F02) | Letterpunten, bonus en raden alleen door het verzoek dat de kolom zelf omzet; één poging echt één poging. |
| Vraag opslaan | B02, QA01, QA03, QA08, QA09, QA10 | Antwoorden worden op hun plek bijgewerkt (zelfde id's), nieuwe eerst ingevoegd; mislukt dat, dan blijft de oude vraag heel. Servervalidatie (vraagtekst, goed antwoord, punten). Leesfout geeft 500/503 in plaats van "geen vraag". Verwijderen controleert de fout. Husselen blijft bij de enige vraag. Unieke regel één vraag per punt (migratie 002). |
| Toegang speler | F04 (deel) | Uitgeschakeld, uitgelogd of verlopen inloglink: elke speler-API weigert. |
| Helpers | B07 | `/admin` alleen exact; `/admin/rapport` e.d. niet meer voor helpers. |
| Volgende groep | B01, B08 | Oude QR-inloglinks ingetrokken; icoon terug naar 🦊 (kon niet leeg); fouten worden gemeld. |
| Opruimen | B04, B05 | Elke stap gecontroleerd; eindtijd, pauze en stemstatus terug; foto's pas na de database. |
| Route activeren | B06 | Doel eerst gecontroleerd; mislukt het, dan gaat de vorige route weer aan. |
| Uitslag vrijgeven | B12 | Eerst afrekenen (stemmen, puzzel, items), dan pas zichtbaar. |
| Dief | I07 | Neemt de laatste goede vraag, geen betaald infopunt. |
| Verdubbeling (spelregel) | I05 | Alleen bij een gewone vraag; foto, stemvraag en infopunt laten hem staan. |
| Volgende groep uitloggen (spelregel) | F04 | "Volgende groep" en "uitloggen" weigeren elk toestel dat vóór dat moment inlogde (inlogmoment uit de token, `lib/inlog-moment.ts`); een nieuwe login mag verder. |
| Tijdslimiet per vraag (spelregel) | F09, QA07 | Bewust alleen in de app; geen servercontrole. |
| Dashboard telefoon | G01 | Spelleiderknoppen op twee regels; Afronden/Opruimen vallen niet meer weg. |
| Finish | FG01–FG08 | Podium en standregels passen op 320 px, namen op twee regels, 10:00:00 volledig leesbaar, statusregel "Voorlopige score" direct onder de cijfers, oorkonde zegt "voorlopig", kop "Wachten op de uitslag", seizoensthema (lib/finish-thema.ts), live-stip stopt bij minder beweging. Teamfoto ook in de standregels. |

## Nog open

| Prioriteit | Bevindingen | Wat er nog moet |
|---|---|---|
| Hoog | F07, F08 | Offline wachtrij per sessie; afgewezen opdrachten bewaren met reden. |
| Hoog | B03 | Import tijdens een spel als één wijziging; geen sessie laten vervallen bij een tijdelijk verschil. |
| Hoog | F06 | Puzzelwoord leesbaar via de routes-tabel: live grants controleren en het woord in een server-tabel zetten. |
| Hoog | E01–E04 | Editor: startvraag in "Alle vragen", opnieuw genereren beschermen, laadfout ≠ lege vraag, undo pas na succes. |
| Middel | F04 (rest) | Apparaatbinding op de server (nu alleen via device-check). |
| Middel | F10, QA14 | Vraag-cache leegmaken bij wijzigingen (antwoord-id's blijven nu wel gelijk). |
| Middel | I09 (rest), I10 | Startitems één keer en met servervoorwaarden; ster/vraagteken herstel na netwerkfout. |
| Middel | B09, B10, B11 | Livekaart volgend punt, oude antwoorden negeren, volgorde opslaan controleren. |
| Middel | QA11–QA13 | Foutmeldingen in de app, feedback na tijdoverschrijding, terugkijken met alle goede antwoorden. |
| Middel | E05–E09, EH01–EH11 | Editor-waarschuwingen en hulpkolom. |
| Middel | G02–G08 | Contrast antwoordknoppen, kleine labels/tikvlakken, minder beweging op login, spelersvoorbeeld in de editor. |
| Middel | A5-01–A5-09 | Tekst van de spelerskaart (nieuwe afbeelding via Codex). |
