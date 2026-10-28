# Werklijst audits (26–27 oktober 2026)

Samengevoegd uit alle negen `docs/audit-*`-rapporten. Overlappende bevindingen staan bij elkaar. Stand: 28 oktober 2026 (derde ronde). Migratie 002 is gedraaid en gecontroleerd.
Proeven: `node docs/audit-items/proeven.cjs` (52/52), `node docs/audit-vragen-antwoorden/proeven.cjs` (40/40), `node docs/audit-editor-gebruik/proeven.cjs` (9/9) en `node docs/audit-editor-help/proeven.cjs` (14/14). **OPGELOST** in een proefnaam bewaakt het gewenste gedrag; **FOUT** reproduceert een nog open punt.

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
| Puzzelwoord afgeschermd | F06 | Migratie 003 trekt het leesrecht van spelers op `routes` in (de app leest routes alleen via de server). Systeemcheck controleert het. |
| Offline wachtrij | F07, F08 | Elke opdracht hoort bij één spel (sessie_id, ook op de server gecontroleerd); wachtende opdrachten van een eerder spel gaan niet meer mee. Geweigerde opdrachten verdwijnen niet stil: rode melding met de reden. |
| Import tijdens een spel | B03 | Alle teams in één keer bijgewerkt (`werkLopendeSpellenBij`), één vernieuwsignaal; de spelerspagina herstelt een verschil in plaats van het spel te laten vervallen. |
| Startitems | I09 | Eén keer per spel (migratie 003: `startitems_op`), niet tijdens pauze, pas na het eerste stuk lopen. |
| Ster/vraagteken na een fout | I10 | Komen in de balk als direct inzetten mislukt (ook bij geen verbinding). |
| Vraag-cache | F10, QA14 | Bij "wijzigingen naar spelers" en bij een verouderd antwoord wordt de vraag opnieuw opgehaald; antwoord-id's blijven sinds ronde 1 gelijk. |
| Foutmeldingen speler | QA11 | Doorgaan bij een infopunt, een onleesbare foto en geen verbinding geven een zichtbare reden. |
| Te laat / terugkijken | QA12, QA13 | Na tijdoverschrijding staat het goede antwoord erbij (server en testronde gelijk); terugkijken toont alle goede antwoorden, ook bij open vragen. |
| Livekaart | B09, B10 | Doel uit de eigen teamvolgorde (niet het laatst bereikte punt); een oud antwoord overschrijft geen nieuwere stand. |
| Volgorde slepen | B11 | Server controleert de lijst en elke stap; bij een fout zet de editor de oude volgorde terug. |
| Editor | E01–E09 | Startvraag/finishopdracht in Alle vragen en "Vraag toevoegen" bij een infopunt; Opnieuw maken met bevestiging; laadfout ≠ lege vraag (ook in Alle vragen, met Opnieuw proberen); undo pas weg na succes; puntpaneel bewaart bij sluiten; geluid/tijdslimiet in "niet opgeslagen"; wizard alleen verder na succes; items "x van y geplaatst"; naamvraag alleen bij een standaardnaam. |
| Hulpkolom | EH01, EH03, EH04 (deel), EH05, EH06, EH10 | Hulp naast een open vraagvenster; laadfout met Opnieuw proberen; zoekt eerst in het open venster en slaat onzichtbare knoppen over; met Tab/Enter te bedienen; puzzelwoord-verwijzing klopt; geen vloeiend scrollen bij minder beweging. |
| Grafisch | G02, G03, G04 (deel), G05, G06 | Antwoordknoppen met voldoende contrast; kleine labels groter; ruimere tikvlakken (editortip, wachtwoordoogje, goed/fout-rondjes); minder beweging overal; "Inhoudsvoorbeeld" i.p.v. "Zo ziet de speler het". |
| Finish | — | Seizoenslabel (bijv. "Halloween") weggehaald op verzoek. |
| Spelerskaart A5 | A5-01–A5-07 | Prompt voor Codex bijgewerkt: echte A5-maat, preciezere teksten, hoe je wint, hulp als iets niet lukt. De afbeelding zelf maakt Codex. |
| Eén telefoon per team (server) | F04 | De app zet een toestelcookie; de server weigert elk verzoek van een andere telefoon dan de geregistreerde. |
| Hulp per onderdeel | EH02 | De editor geeft door waar je bent (kaart, punt, vraag, items, instellingen, controle); de hulp toont bovenaan de stukken uit de handleiding die daarbij horen. De losse vraag-editor krijgt vanzelf de vraaghulp. |
| Aanwijzen | EH04, EH11 | "A / B" als losse namen, knop op de pagina gaat vóór het menu, onzichtbaar telt niet. Hulpkolom en zelftest gebruiken dezelfde regel (`lib/hulp-namen.ts`). |
| Ankers en links | EH07 | Koppen in de handleiding hebben een vaste id; links naar een stuk dat niet in de hulp staat openen de volledige handleiding in een nieuw tabblad, net als de links onderaan de hulp (niets verloren in de editor). |
| Hulp op kleinere schermen | EH08, EH09 | Onder 1200 px schuift de hulp als paneel over de pagina (de editor houdt zijn ruimte); op de telefoon in de editor een eigen ?-knop en een hulp over het hele scherm. |
| Spelregels als tekst + lichte print | A5-08, A5-09 | Openbare pagina `/spelregels` (geen login): zelfde uitleg als de kaart, te vergroten en voor te lezen; Printen geeft een lichte A5-versie (zwart op wit). Link in Info & uitleg en in het WhatsApp-bericht. |
| Rustiger beheer | G08 | Panelen in het beheer met een dunne rand zonder gouden gloed en diepe schaduw; de spelstijl blijft voor login, spelers en finish. |

## Nog open

| Wie | Wat |
|---|---|
| Jij | Migratie 003 draaien in Supabase (puzzelwoord afschermen, startitems één keer). |
| Jij / Codex | Nieuwe spelerskaart (afbeelding) laten maken met de bijgewerkte prompt. |
| Test | Op twee echte telefoons: één team, twee telefoons (de tweede moet eruit), "Volgende groep", offline spelen en weer bereik, en het rustigere beheer bekijken. |
