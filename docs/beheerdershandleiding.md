# Beheerdershandleiding — PointRush

## Overzicht

Als beheerder stel jij de routes in, maak je de spelers aan, start je het spel en volg je de voortgang live. Alles gaat via het beheer, bereikbaar op `/admin`. Het werkt op de computer en op de telefoon.

**Het menu** (links; op de telefoon via ☰):

| Onderdeel | Wat staat er |
|---|---|
| **Actieve route** (groen kaartje bovenaan) | Welke route nu loopt; tik erop voor de routes. Grijs = geen actieve route. |
| 🏠 **Dashboard** | Stappenplan, spelleider, spelende spelers met de stand, en de tijdlijn |
| 👫 **Spelers** | Spelers aanmaken, inloggegevens, aan/uit, verwijderen |
| 📝 **Antwoorden** | Antwoorden en foto's keuren, uitslag vrijgeven, rapport |
| 📡 **Live kaart** | Waar iedereen loopt |
| 🗺️ **Routes** | Routes maken, klaarzetten, activeren, voorproefje |
| **Spel** | 🏆 Tussenstand, WhatsApp (inloggegevens versturen), 🔔 Meldingen |
| **Beheer** | Stop route, Reset spel |
| **Info & uitleg** | Deze handleiding, de instructiekaarten, Ko-fi, en het versienummer met de datum van de laatste update |

Rechtsboven (op de telefoon in de bovenbalk) staan **📢 Bericht sturen** en **Uitloggen**. Alles wat je niet per ongeluk wilt doen, vraagt eerst om bevestiging in een venster; annuleren doe je met het ✕ rechtsboven, door naast het venster te tikken of met Esc.

---

## Voorbereiding

### 1. Route aanmaken

> 💻 **Tip:** een route maak je het makkelijkst op een pc of laptop. Op een groot scherm zie je de kaart, de puntenlijst en de instellingen tegelijk.

1. Ga naar **Routes** in de zijbalk.
2. Klik op **Nieuwe route**.
3. Geef de route een naam en **kies het speltype**: Sequentieel of Verspreid.
4. **Tik op de kaart** waar het punt moet komen en kies **📍 Punt**. (Een nieuw punt komt vóór de finish in de lijst.) Veel punten tegelijk? Gebruik **📥 Importeren** bovenin de editor (zie hieronder).
5. Herhaal voor alle punten. De volgorde pas je aan door een punt in de lijst te **slepen** naar een andere plek (of stap voor stap met ▲▼).
6. Klik op een punt (op de kaart of in de lijst): linksboven op de kaart opent een klein paneel met
   - **Soort punt** — bovenaan: ❓ Vraag, ℹ️ Info of 🏁 Eind. Daaronder staat alleen wat bij dat soort hoort.
   - **Naam** — met de knop **💡** ernaast vul je een voorstel in, bedacht uit de vraag of het goede antwoord (spelers zien de naam van een vraagpunt pas na afloop)
   - **❓ Vraag**: of de vraag al is ingevuld (✅) of nog niet (⚠️), met **Vraag invullen / bewerken**. De vraag opent als venster over de editor; na **Opslaan** of **← Terug** sta je weer precies waar je was.
   - **ℹ️ Info**: de **tekst voor de spelers**, die ze lezen als ze er aankomen. Hangt er toch een vraag aan (zoals een startvraag), dan zie je dat, en krijgen de spelers die vraag in plaats van de tekst.
   - **🏁 Eind**: hier finisht het team; met **Opdracht bij de finish** hang je er eventueel een opdracht aan, zoals een selfie.
   - **De vraag-editor**: links het formulier (soort vraag → vraag → afbeelding en punten → antwoorden), rechts **Zo ziet de speler het** met het kaartje eronder. **💾 Vraag opslaan** staat altijd onderaan in beeld, met eventuele foutmelding erboven (bij een leeg antwoord staat de cursor meteen in dat veld). Ga je weg met niet-opgeslagen wijzigingen, dan vraagt de editor eerst of je ze wilt weggooien.
   - **⚙️ Meer instellingen** (uitklapbaar, onder de antwoorden): de **naam van het punt**, **eigen punten per antwoord** en **📱 Openen met QR-code** (met 🖨️ printen).
   - Bij een meerkeuzevraag kun je met **Eigen punten per antwoord** per antwoord punten invullen, ook negatief (bijv. −25 voor een fout antwoord). Uit = het goede antwoord krijgt de punten van de vraag, de andere 0. De score van een team zakt nooit onder 0.
   - Bij een open vraag kies je **🔤 Tekst** (één goed antwoord per regel) of **🔢 Getal**, met een **marge** (±).
   - **📝 Alle vragen** (bovenin de editor) — alle vragen achter elkaar invullen zonder elk punt apart te openen. Links staan alle vraagpunten (✅ = heeft een vraag, ⚠️ = nog niet), rechts de vraag-editor. Met **Opslaan & volgende →** ga je meteen door; **Overslaan →** en **← Vorige** bladeren zonder op te slaan. Het venster begint bij het eerste punt zonder vraag.
7. Sleep een punt op de kaart om de positie fijn te stellen.
   **Radius en punten** gelden voor de hele route: ⚙️ Instellingen → **📍 Punten & vragen**.
8. Klaar? Klik op **✅ Klaarzetten**. De controle **🩺 Klaar om te spelen?** opent; is alles in orde, dan zet je de route daar klaar. Daarna verschijnt **▶ Activeren** (zie [Het spel starten](#het-spel-starten)).

> **Status van een route**: **✏️ Concept** (nog bezig) → **✅ Klaar** (gecontroleerd, kan geactiveerd worden) → **▶ Actief** (de spelers kunnen spelen). In de routekop zie je dit als stappen: ✏️ Bewerken › 🩺 Controleren › ✅ Klaar › ▶ Actief, met daarnaast één opvallende knop voor de volgende stap. Klik op **🩺 Controleren** om de controle tussendoor te bekijken. Bij een klare route zet **↩ Concept** hem terug om verder te bewerken.

> **Overzicht in de editor (computer)**:
> - Bovenin staan twee lage regels: de **routekop** (terug, naam, de stappen, de volgende stap zoals ✅ Klaarzetten of ▶ Activeren, en rechts ✓ Opgeslagen, ↶ Ongedaan en ⚙️ Instellingen) en de **werkbalk** (◧ Lijst, 🚶 Wegen, 📝 Vragen, 🧪 Test, en het gereedschap 📥 Importeren, 🛣️ Op de weg en 🧹 Leegmaken).
> - **🚶 Wegen** is een aan/uit-schakelaar: aan = lijnen en afstanden volgen wegen en voetpaden, uit = hemelsbreed. Staat hij aan, dan rekent **↻ Opnieuw** alles opnieuw uit.
> - **◧ Lijst** klapt de puntenlijst links in, voor meer kaartruimte. Met **« Inklappen** onderaan het menu wordt het hoofdmenu een smalle balk met alleen icoontjes (**»** klapt hem weer uit). Beide worden onthouden.
> - In de puntenlijst openen **❓** en het oranje **⚠️** (nog geen vraag) meteen de vraag van dat punt.
> - Klik je op een punt, dan zie je in het paneel ook de vraag (kort), welk team daar begint, welke items in de buurt liggen en de positie, met **🛣️ Op de weg** voor dat ene punt. Verplaatsen doe je door het punt op de kaart te slepen; met **↶** zet je het terug.
> - **Kaartlagen** (linksonder, boven ☀️ 🌙 🛰️): zet **🧭 Routes**, **🎁 Items**, **✨ Voorstellen** en **⭕ Cirkel** los aan of uit, zodat de kaart rustiger wordt.

> **🛣️ Op de weg**: zet alle punten in één keer op de dichtstbijzijnde weg of het dichtstbijzijnde voetpad (tot 200 m), zodat er geen punt midden in een weiland of tuin ligt. Bij Verspreid blijven start en finish staan. Met **↶ Ongedaan maken** zet je ze terug. Ook **punten automatisch genereren** in een cirkel zet elk punt meteen op de weg.

> **🧹 Leegmaken**: haalt alle punten (met hun vragen) en alle items van de route weg, na bevestiging. De naam en de instellingen blijven. Alleen bij een route die niet actief is.

> **📥 Punten importeren**: kies een **GPX-bestand** (waypoints, of een spoor: dan komt er om de 150 m een punt) of een **KML-bestand** (bijv. uit Google My Maps), of plak een lijst met één punt per regel: `52.2215, 6.8937 Kerk`, een lange Google Maps-link, of een korte deellink uit de Google Maps-app (`maps.app.goo.gl/…`). Je ziet eerst welke punten gevonden zijn (✕ om er een weg te laten) en welke regels niet herkend zijn. Daarna komen ze vóór de finish, met de standaard punten en straal van de route. De vragen voeg je daarna toe.

> **📚 Vragenbank**: in de vraag-editor staat bovenin **📚 Vragenbank**: alle vragen uit je andere routes, gesorteerd op soort (meerkeuze, met afbeeldingen, open, foto) met een kopje per soort. Met de knoppen bovenin toon je één soort, en je kunt zoeken op vraag, antwoord, route of punt. Tik op een vraag en het formulier wordt ermee ingevuld (type, tekst, afbeelding, antwoorden en punten). Pas aan wat je wilt en druk op **Opslaan**; de oorspronkelijke vraag blijft ongewijzigd.
> - **☆ Favoriet**: tik op het sterretje achter een vraag. Favorieten staan bovenaan hun soort, met een gouden rand, en met **⭐ Favorieten** zie je alleen die.
> - **🗑️ Uit de bank halen**: de vraag verdwijnt uit de vragenbank, maar blijft gewoon in zijn eigen route staan. Handig voor dubbele vragen (bijv. na een kopie van een route). Met **🗑️ Verwijderd** zie je ze terug en zet je ze met **↩ Terug** weer in de bank.
> - Hiervoor moet SQL-bestand 007 in Supabase gedraaid zijn.

> **🧪 Testronde**: met **🧪 Test** bovenin de editor loop je de route punt voor punt door zonder naar buiten te gaan. De kaart vliegt naar elk punt; je ziet de vraag zoals de speler hem krijgt (met het goede antwoord gemarkeerd), de afstand vanaf het vorige punt, de straal en de items binnen 150 meter. Met **◀ Vorige** en **Volgende ▶** blader je door.

> **Opslaan gaat vanzelf.** Rechtsboven in de editor zie je ⏳ *Opslaan…*, daarna ✓ *Opgeslagen*. Lukt het niet, dan staat er ⚠️ *Niet opgeslagen ⓘ* en krijg je een melding die zegt wat er misging en wat je kunt doen (bijv. "geen verbinding, controleer je internet" of "je bent uitgelogd, log opnieuw in"). Klik op ⓘ om die uitleg nog eens te zien. Doe de wijziging daarna opnieuw.

> **Foutmeldingen** in het hele beheer zeggen voortaan wat er misging én hoe je het oplost, in plaats van alleen "mislukt".

> **↶ Ongedaan maken.** Verwijderd, verschoven, toegevoegd of gewijzigd? Met **↶ Ongedaan maken** bovenin (of **Ctrl+Z**) zet je de laatste stappen één voor één terug, tot 30 stappen. Een verwijderd punt komt terug met zijn vraag en antwoorden, op dezelfde plek in de lijst. Verwijderen vraagt daarom geen bevestiging meer.

> **Routes-overzicht**: de routes staan onder drie koppen: **▶ Actief**, **✅ Klaar** en **✏️ Concept**, binnen een groep op naam. Bij elke route zie je het speltype en **✏️ Aangepast** (de laatste bewerking in de editor; het spelen zelf telt niet mee). Een lange naam schuift vanzelf heen en weer.
> De knoppen staan bij elke route op een vaste plek:
> - **De volgende stap**, één opvallende knop: **✅ Klaarzetten** (concept) en **▶ Activeren** (klaar) openen de controle in de editor; **⏹ Deactiveren** (actief, met bevestiging) werkt zoals *Stop route*: lopende spellen worden netjes afgesloten en de route blijft Klaar. In de editor werkt Deactiveren precies zo.
> - **Bewerken**
> - Knoppen met een korte tekst eronder: 📄 **Voorproefje** (zie hieronder), 📋 **Kopiëren** (alles, als concept), 📤 **Exporteren** (opslaan als bestand, met afbeeldingen), ↩️ **Concept** (terug naar concept) en 🗑️ **Verwijderen**.
> - Rechtsboven **📥 Route importeren**: een eerder geëxporteerd bestand terugzetten.
>
> Op de telefoon starten de routekaarten ingeklapt: tik op de naam om de knoppen te tonen.

> **📄 Voorproefje**: één A4 om te laten zien wat een route inhoudt, zonder iets te verraden. Op het vel staan het speelgebied (een zone op de kaart, zonder route en zonder punten; de items staan er verschoven op), het aantal punten en vragen per soort, een schatting van afstand en speelduur, drie voorbeeldvragen zónder de goede antwoorden (je kiest zelf welke, of 🔀 voor andere) en de items in het spel. Met **📄 PDF maken** en daarna **📲 Versturen** deel je het via WhatsApp. Antwoorden, puntnamen en coördinaten komen niet eens in de browser.

> Het eindpunt (goud/vlag-icoon) is het laatste punt van de route. Zodra een team het eindpunt bereikt wordt hun tijd vastgelegd. Ook de finish kan een vraag of opdracht hebben, bijvoorbeeld **maak een selfie**: het team krijgt die eerst te zien. Bij een foto-opdracht is het team gefinisht zodra de foto is ingestuurd; de punten komen erbij als jij de foto goedkeurt bij **Antwoorden**.

---

### 2. Speltype en route-instellingen

Het speltype kies je **bij het aanmaken** van de route, en het kan daarna **niet meer gewijzigd worden**. De instellingen en de opbouw van een route verschillen te veel per speltype om halverwege om te schakelen zonder de route onbruikbaar te maken.

Welk speltype een route heeft zie je overal terug: in de routeslijst staat het als gekleurd label onder de naam, en in de editor bovenin naast de status.

| Speltype | Omschrijving |
|---|---|
| 🎯 **Sequentieel** | Alle teams lopen de punten in dezelfde volgorde (standaard) |
| 🎲 **Verspreid (lus)** | Elke team start op een ander punt en loopt de route als een lus — iedereen legt dezelfde afstand af, maar in een andere volgorde. Het **startpunt (🏠) moet een vraag hebben**: spelers krijgen eerst een welkomstuitleg en na 25 meter lopen deze eerste vraag. Zonder vraag kun je de route niet activeren. |

In de route-editor opent het **⚙️-tandwiel** bovenin de instellingen. Daar staan alleen de instellingen die bij het gekozen speltype horen:

| Instelling | Bij welk speltype |
|---|---|
| **⭐ Item-waarden** — standaard ster- en bomwaarde | Verspreid |
| **⏱️ Duur van effecten** — hoe lang 👻 Spook (Verspreid) en ⛔ Plekzooi duren (minuten) | Sequentieel, Verspreid |
| **🔄 Respawn** — items opnieuw laten verschijnen | Verspreid |
| **🏆 Tussenstand** — automatische reveal | alle |

#### Hoe werkt Verspreid?

Een verspreide route bestaat uit drie delen:

- **🏠 Startpunt** — het **eerste** punt in de lijst. Hier krijgen alle teams een welkomstscherm met de korte speluitleg. Zet je een vraag op het startpunt, dan krijgen ze die pas nadat ze 25 meter gelopen hebben.
- **De lus** — alle punten daartussen. Elk team krijgt een eigen instapplek in de lus: ongeveer even ver van de startplek (gelijke aanloop) en zo goed mogelijk verspreid, zodat teams niet achter elkaar aan lopen. Verschuif je punten, dan rekent de editor de instappunten opnieuw uit.
- **🏁 Finish** — het **laatste** punt in de lijst, op dezelfde plek als het startpunt. Hier komen alle teams na hun lus weer samen.

```
Route met startpunt/finish + 6 lus-punten (3 teams):

        [2]
       /   \
     [1]   [3]
      |  🏠🏁  |      ← start en finish op het middelpunt
     [6]   [4]
       \   /
        [5]

Team 1:  🏠 → 1 → 2 → 3 → 4 → 5 → 6 → 🏁
Team 2:  🏠 → 3 → 4 → 5 → 6 → 1 → 2 → 🏁
Team 3:  🏠 → 5 → 6 → 1 → 2 → 3 → 4 → 🏁

✓ Iedereen start en eindigt op dezelfde plek
✓ Iedereen bezoekt alle lus-punten, in een eigen volgorde
✓ Teams beginnen op gelijke GPS-afstand van elkaar aan de lus
```

> **Belangrijk:** Het startpunt en de finish herkent het systeem aan hun **positie in de lijst**: het eerste punt is altijd de start, het laatste altijd de finish. De ▲▼-knoppen zijn daarom uitgeschakeld voor deze twee punten. Plaats je punten handmatig, zet dan zelf een infopunt als eerste en een eindpunt als laatste — of gebruik de automatische generator hieronder, die dit voor je doet.

#### Looproute per team bekijken en omdraaien

Onder de puntenlijst staat per team één regel (*Team 2 · start bij punt 8 · 22 punten*). Klik erop om de volgorde open te klappen: op de kaart wordt dat team dan **uitgelicht** — een dikke lijn met pijlen in de looprichting, de andere teams worden vaag.

Met **↺ Andersom lopen** (onder de opengeklapte volgorde) loopt dat team het rondje in **tegengestelde richting**, vanaf hetzelfde instappunt. Handig om teams elkaar tegen te laten komen, of om drukte op één stuk te spreiden. Het geldt voor teams die daarna starten. Let op: "Team 1" is het eerste team dat begint, "Team 2" het tweede, enzovoort.


**Zelf het startpunt kiezen.** Begint een team te ver van de start? Klik in het teamvenster op **📍 Startpunt kiezen** en daarna op de kaart op het punt waar dat team het rondje moet beginnen (een punt in het rondje, niet de start of finish). In het venster zie je de **aanloop** vanaf de start in meters. Een zelfgekozen startpunt herken je aan 📌; met **Automatisch** gaat het team terug naar het berekende startpunt. Geldt voor teams die daarna beginnen.
#### Afstand en speeltijd per team

> 🚶 **Langs wegen en voetpaden.** De lijnen op de kaart en alle afstanden (gemeten afstand, aanloop, speeltijd, itemadvies) volgen de wegen en voetpaden, via de voetgangersrouting van OpenStreetMap. Na het verplaatsen van een punt duurt het even voor de nieuwe route er is; tot dan staat er *📏 hemelsbreed*. Lukt het ophalen niet, dan rekent de editor hemelsbreed verder.

Rechtsboven op de kaart staat een klein paneel **⏱️ Afstand, tijd & punten per team**: per team (in de kleur van de kaart) hoeveel kilometer het loopt, hoe lang het ongeveer duurt en hoeveel punten het ongeveer haalt, bijvoorbeeld *Team 1 · 2,35 km · ≈ 52 min · ≈ 310 pt*. Ga met de muis over een team voor de opbouw (lopen, vragen, items). Klik op de kop om het paneel in of uit te klappen. De looproute per team staat onder de puntenlijst.

- **Lopen** — 4,5 km/u, het wandeltempo van een team.
- **Vragen** — ongeveer 2 minuten per vraag en een halve minuut per infopunt.
- **Items** — omlopen naar items die binnen 150 m van de route liggen, de vastzittijd van plek zooi die op de route ligt, en de verwachte vertraging door spoken en bananen van tegenstanders. Met respawn aan telt dat zwaarder.

- **Punten** — de maximale punten per vraag (of per antwoord) bij ongeveer 70% goed, plus de punten van punten zonder vraag. Items: sterren en verdubbelingen die het team waarschijnlijk pakt, gemiddeld iets plus voor een vraagteken, en een deel van de bommen van tegenstanders eraf. Wissel en dief middelen over alle teams uit en tellen niet mee.

Onderaan het paneel staat, klein, hoeveel items je van elke soort hebt geplaatst.

Het blijft een schatting: verplaats een punt of item, of verander het aantal teams of de duur van spook en plek zooi, en de tijden rekenen meteen opnieuw.

#### Instellingen voor Verspreid-modus

In het tabblad **📍 Punten** verschijnen, zodra de route op verspreid-modus staat, extra velden boven de puntenlijst:

| Instelling | Uitleg |
|---|---|
| **Aantal teams** | Verwacht aantal deelnemende teams (min. 2). Bepaalt de startpuntberekening. |
| **Doelafstand** | Totale routelengte in km. Wordt gebruikt voor de kaartcirkel en puntgenerator. |
| **Aantal punten** | Aantal punten voor de automatische generator (zie hieronder). |

#### Respawn (items opnieuw laten verschijnen)

Alleen bij verspreid-modus, in te schakelen via **⚙️ Instellingen** → "🔄 Respawn":

- **Uit (standaard)** — speciale items verdwijnen permanent zodra een team ze opraapt.
- **Aan** — een opgeraapt item komt na een instelbaar aantal minuten terug op de kaart, zodra het team dat het opraapte het heeft gebruikt. Het komt terug als **precies hetzelfde item op dezelfde plek**: de app verandert nooit zelf het type of de plek van een item.

Stel het aantal minuten in via het invoerveld dat verschijnt zodra Respawn op "Aan" staat.

#### Hoeveel items? (advies)

Bij Verspreid toont het tabblad **Items** een geel adviesblok. Het rekent met de lengte van het rondje, het aantal teams en of respawn aan staat, en zet naast elk soort item hoeveel er nu liggen (groen = goed, oranje = te weinig, rood = te veel).

- **Afstand** — ongeveer elke 300 m iets om op te pakken, zodat elk team onderweg regelmatig iets tegenkomt.
- **Speeltijd** — ongeveer één item per 6 minuten speeltijd (de geschatte tijd uit het paneel op de kaart), zodat een lang spel spannend blijft.
- **Teams** — minimaal 2 en hoogstens 3 items per team: het eerste team pakt een item weg, dus latere teams moeten ook kans maken, maar items mogen de uitslag niet meer bepalen dan de vragen.
- **Respawn aan** — ongeveer 30% minder, want items komen terug.
- **Verdeling** — ongeveer 40% aanvalsitems, 1 à 2 vraagtekens, de rest voordeel. Plek zooi: ongeveer 1 per km, nooit meer dan het aantal teams.
- **Plaatsing** — verdeel de items gelijkmatig over het rondje, niet vlak bij het startpunt of de finish, minstens 50 m van een vraagpunt, en plek zooi niet op een plek waar iedereen langs móet.

**Check en voorstellen op de kaart**: in het paneel rechtsboven op de kaart staat of er genoeg items liggen (groen), te weinig (oranje: "plaats er nog 3") of te veel (rood). Ontbreken er items, dan staan er **gouden ➕-cirkels** op de kaart: de grootste lege stukken langs het rondje, minstens 50 m van een punt en 120 m van het startpunt. In de cirkel zie je welk item daar zou passen (de soort waar je het minst van hebt). Klik erop en het item wordt geplaatst; daarna kun je het verslepen of een ander type kiezen. Met "Voorstellen op de kaart verbergen" haal je de cirkels weg.

Het blijft een advies: de app plaatst of wijzigt nooit zelf items — alleen als jij op een voorstel klikt.

#### Punten automatisch genereren in cirkel

Wanneer de doelafstand is ingesteld, kun je punten automatisch laten plaatsen:

1. Stel de **doelafstand** in (bijv. 5 km).
2. Stel het **aantal punten** in (bijv. 9).
3. Kies met **🎯 Kies het middelpunt op de kaart** het midden en klik op **🎲 Punten maken in de cirkel**.
4. Het systeem plaatst de punten in een gelijke cirkel rondom het middelpunt op de kaart.
5. Het **middelpunt** (⊕) is versleepbaar — sleep het naar de gewenste locatie en de ghost-voorvertoning past zich direct aan.
6. Sleep daarna elk punt afzonderlijk naar de exacte straat.

> Naast de cirkelpunten plaatst de generator automatisch een **🏠 Startpunt** (infopunt, bovenaan de lijst) en een **🏁 Finish** (eindpunt, onderaan de lijst), allebei op het middelpunt. Sleep het middelpunt dus naar de plek waar je de teams wilt ontvangen en weer wilt opvangen.

> De ghost-cirkel op de kaart (gestippeld, cyaan) toont een voorvertoning van de punten vóór je ze genereert. De gids-cirkel rondom een geselecteerd punt toont de aanbevolen afstand tot het volgende punt.

---

### 3. Speciale items plaatsen (optioneel)

> **Sequentieel:** op de kaart plaats je alleen **⛔ Plek zooi**. Elk team krijgt bij de start automatisch
> één **🍌 banaan** in de balk, die ze op een tegenstander kunnen gooien. Die startbananen zie je niet in de
> editor en ze worden bij *Reset spel* opgeruimd.

1. **Tik op de kaart** waar het item moet liggen en kies **🎁 Item** (bij Sequentieel: ⛔ Plek zooi).
2. Linksboven op de kaart opent het itempaneel: kies het **type** met de icoonknoppen — het wordt meteen opgeslagen.
3. De **radius** van items en de waarde van ster en bom stel je in voor de hele route bij ⚙️ Instellingen → **🎁 Items**.
4. Items zijn zichtbaar op de kaart voor alle spelers zodra de route actief is — **behalve de Plek zooi, die is altijd onzichtbaar**.
5. De **legende** in de spelerapp toont automatisch alleen de itemtypen die je in de route hebt geplaatst.

#### Beschikbare itemtypen

De spelers zien deze uitleg in de app onder de **i**-knop (💡 Zo werkt het), ingeklapt per item en met de echte waarden uit jouw route-instellingen. In de spelersapp heet het andere team altijd de **tegenstander**.

| Item | Naam | Effect |
|---|---|---|
| ⭐ | Ster | Het team krijgt meteen de sterwaarde aan punten (⚙️ Item-waarden, standaard 50) |
| 🔴 | Verdubbeling | De volgende vraag waarmee het team punten verdient, telt dubbel (minpunten nooit) |
| 📡 | Radar | Het team ziet 2 minuten lang precies waar alle tegenstanders lopen |
| 💣 | Bom | Een tegenstander verliest de bomwaarde aan punten (standaard 30) |
| 👻 | Spook | Het volgende punt van een tegenstander verdwijnt van de kaart (standaard 10 minuten); zij zien zolang een groot spook met aftelklok |
| 🦹 | Dief | Steelt meteen de punten van een goede vraag van een tegenstander en geeft ze aan het team |
| 🍌 | Banaan | Het volgende punt van een tegenstander ruilt van plek met het punt daarna (1-2-3 wordt 2-1-3); startpunt en eindpunt blijven op hun plek |
| 🔄 | Wissel | Het team ruilt zijn score met die van een tegenstander |
| ❓ | Vraagteken | Komt niet in de balk: wordt meteen gespeeld bij het oppakken. 40% 2× sterwaarde, 10% jackpot (5× sterwaarde), 20% −1× sterwaarde, 10% −200 punten, 20% iedere tegenstander krijgt willekeurig 1× sterwaarde erbij of eraf |
| ⛔ | Plek zooi | **Onzichtbaar voor spelers** — geen icoontje op de kaart. Wie de radius betreedt, staat stil: de kaart verdwijnt en er loopt een afteltimer (standaard 5 minuten). De val blijft liggen voor andere teams, maar raakt elk team maar één keer. |

> **Dief-effect**: de dief steelt meteen. Hij neemt de punten van de laatste vraag die de tegenstander goed had; heeft die nog geen vraag goed, dan het gemiddelde van een vraag in deze route. Nooit meer dan de tegenstander heeft: een score gaat niet onder 0. Beide teams krijgen een melding met hoeveel punten er gestolen zijn.

> **🎒 Startitems**: in de route-instellingen kies je per soort item (banaan, bom, spook, dief, wissel, verdubbeling, radar; een ster of vraagteken kan niet, die worden altijd meteen gebruikt) hoeveel elk team gratis in de balk krijgt, 0 tot 5 per soort. Het team krijgt ze **na de eerste 100 meter lopen**, met een scherm: *"Om je een beetje op weg te helpen krijg je alvast [items] van de organisatie. Doe er je voordeel mee, gebruik ze verstandig."* Bij Sequentieel staat standaard één banaan aan, bij Verspreid niets. Een wijziging geldt voor teams die daarna beginnen. Startitems staan nooit op de kaart en worden bij *Reset spel* opgeruimd.

> **Na de finish**: items die een team nog in de balk had (bijvoorbeeld een wissel), vervallen zodra het team finisht. Bij **🎁 Items inzetten na de finish** in de route-instellingen tik je per item aan wat na de finish nog mag (bom, spook, dief, banaan, wissel; groen = mag). Ster, vraagteken, verdubbeling en radar staan er niet bij: een ster en een vraagteken worden meteen gebruikt, en verdubbeling en radar hebben na de finish geen nut. Een gefinisht team houdt die items en kan ze vanaf het finishscherm nog inzetten op teams die onderweg zijn — tot jij de uitslag vrijgeeft; dan vervalt de rest. Een gefinisht team kan zelf ook nog geraakt worden, maar alleen met de groene items die op een gefinisht team iets doen: **bom**, **wissel** en **dief**. Spook en banaan werken op punten die nog komen en raken alleen teams die onderweg zijn. Na het vrijgeven van de uitslag kan niemand meer iets inzetten.

> **Andere teams op de kaart**: spelers zien andere teams niet op hun kaart. Alleen wie een 📡 Radar inzet, ziet 2 minuten lang waar de anderen lopen — en daarna verdwijnen ze weer. De anderen zien het radarteam niet. Op jouw live kaart zie je als beheerder iedereen altijd.

> **Banaan-effect**: werkt alleen als de tegenstander nog minimaal 2 punten vóór het eindpunt te gaan heeft. Anders krijgt het aanvallende team een melding en blijft de banaan bewaard.

> **"Aangeboden door"-melding**: bij alle aanvals-items (Spook, Bom, Wissel, Dief, Banaan) krijgt de tegenstander binnen ongeveer 5 seconden een groot venster met de naam van het aanvallende team en een klokslag (en trillen op Android; iPhones kunnen vanuit een webapp niet trillen). Het venster blijft staan tot het team op **OK, BEGREPEN** tikt.

#### Duur van Spook en Plek zooi instellen

Via **⚙️ Instellingen** → "⏱️ Duur van effecten" stel je per route in, in minuten:

- **👻 Spook** — hoe lang het volgende punt van het getroffen team verdwenen is (standaard 10 minuten).
- **⛔ Plekzooi** — hoe lang een team vastzit na het raken van een plekzooi (standaard 5 minuten).

Halve minuten mogen ook (bijv. 2,5). De duur geldt voor alle spook- en plekzooi-items in de route.

---

### 4. Spelers aanmaken

Elke "speler" in het beheer is één team met één inlog.

1. Ga naar **Spelers** in het menu.
2. Klik op **+ Nieuwe speler** en vul een **loginnaam** en een **wachtwoord** (minimaal 8 tekens) in. De loginnaam is wat het team typt bij het inloggen (bijv. "speler1"); hoofdletters maken daarbij niet uit.
3. Verstuur de inloggegevens met **WhatsApp** in het menu (onder Spel). Er opent eerst **Wat verstuur je?**:
   - **✉️ Berichttekst** — standaard *"Hoi! Log in op PointRush via deze link 🎯 … 🔑 Je loginnaam en wachtwoord krijg je zo in een apart bericht. … Veel plezier! René"*, aan te passen in het venster. De inlog stuur je daarna per team met de **🔑** bij Spelers;
   - **📲 Uitleg** hoe je de app op het beginscherm zet;
   - **Afbeeldingen:** de spelershandleiding en/of de speluitleg van route op volgorde of verspreid.
   Onderaan zie je een voorbeeld. **Versturen** opent het deelmenu (kies WhatsApp). Je laatste keuze wordt onthouden.

Elke speler krijgt een **vaste kleur** (ring om het icoon). Die kleur zie je ook op het dashboard, de tijdlijn en de live kaart.

#### Meerdere spelers tegelijk

Met **👫 Meerdere** naast *+ Nieuwe speler* maak je in één keer tot 30 spelers aan. Kies het aantal en hoe de loginnaam begint (standaard *speler*): je krijgt dan bijvoorbeeld speler1, speler2, … (bezette nummers worden overgeslagen), elk met een makkelijk wachtwoord zoals *tijger47*. Daarna zie je meteen de lijst met inloggegevens (zie hieronder).

#### Inloggegevens per team uitdelen

Rechts op elke spelerskaart, naast de 🗑️, staat de blauwe **🔑**. Er opent een venster met de **loginnaam** (daar kun je hem ook wijzigen), het **huidige wachtwoord** en hoe lang de **link om direct in te loggen** geldig is (**Geen**, 4 uur, ½ dag, **1 dag** of 2 dagen).
- Het wachtwoord **blijft hetzelfde** als je het zo verstuurt. Met **🎲** maak je een nieuw (of typ zelf iets); wie al is ingelogd, blijft ingelogd.
- Wachtwoorden worden versleuteld bewaard, zodat je ze later opnieuw kunt versturen. Bij teams van vóór deze versie is het wachtwoord nog onbekend: die krijgen eenmalig een nieuw. (SQL-bestand 011.)

Na **Opslaan en versturen** zie je het **inlogkaartje** (logo, QR-code naar de app, loginnaam en wachtwoord) met daaronder **WhatsApp**: het kaartje gaat als afbeelding naar de chat die je kiest, met het hele bericht eronder:
- naar de site gaan en inloggen met **loginnaam** en **wachtwoord**;
- wat te doen als PointRush al als app op de telefoon staat (link kopiëren → **🔗 Inloggen met link**);
- en onderaan 👉 **Direct inloggen** met de link (en tot wanneer die werkt).

Op de telefoon zet WhatsApp dat bericht meestal als bijschrift bij het kaartje. Op de computer laat WhatsApp de tekst soms weg; tik dan op **Tekst ontbreekt? Stuur het bericht erachteraan** onder de knop en kies dezelfde chat (die staat bovenaan).

Kan je browser geen afbeeldingen delen, dan wordt het kaartje gedownload en opent WhatsApp meteen met het bericht; voeg het kaartje dan zelf toe.

Ook bij **+ Nieuwe speler** staat er al een wachtwoord voorgesteld, en na het aanmaken krijg je hetzelfde kaartje. Na **👫 Meerdere** krijg je alle kaartjes onder elkaar, elk met WhatsApp, plus **🖨️ Afdrukken** (8 per A4, met **← Terug** naar Spelers) en **📋 Kopiëren**.

Verstuur ze meteen: na het sluiten zijn de wachtwoorden niet meer te zien.

#### Telefoonnummer van een team

Met de **📞** rechts op de spelerskaart (naast de 🔑) vul je het telefoonnummer van het team in, bijvoorbeeld *06 12 34 56 78*. Is er een nummer, dan is de 📞 groen en staat het nummer op de kaart. Voordelen:
- **WhatsApp opent meteen de juiste chat** bij het versturen van een inloglink, en bij de link na het kaartje. (Het kaartje zelf gaat via het deelmenu van de telefoon; daar kies je de chat nog zelf.)
- Op het dashboard staan in het detailvenster van het team **📞 Bellen** en **WhatsApp**, handig als een team niet reageert.
- Hiervoor moet SQL-bestand 009 in Supabase gedraaid zijn.

#### Link zonder wachtwoord (tijdelijk)

In hetzelfde venster achter de **🔑** kies je bovenin **🔗 Link zonder wachtwoord**. Kies hoe lang de link geldig is (**4 uur**, **½ dag**, **1 dag** of **2 dagen**) en tik **🔗 Link maken**. Je krijgt een QR-code (om ter plekke te laten scannen) en **WhatsApp**: een bericht met de link en tot wanneer hij werkt.

- Het team tikt op de link en is meteen ingelogd, zonder loginnaam en wachtwoord. Binnen de geldigheid werkt de link vaker, bijvoorbeeld na het wegdrukken van de app. Eén telefoon per team blijft gelden.
- **Staat PointRush als app op de telefoon?** Een link uit WhatsApp opent in de browser, en de app heeft een eigen inlog. Laat het team de link dan in WhatsApp ingedrukt houden → **Kopiëren**, de app openen en op het inlogscherm **🔗 Inloggen met link** tikken: de app pakt de link van het klembord (of ze plakken hem). Dit staat ook kort in het WhatsApp-bericht.
- **Is de tijd om**, dan wordt het team automatisch uitgelogd (binnen een halve minuut) en werkt de link niet meer. Een lopend spel blijft bewaard.
- Op de spelerskaart zie je **🔗 tot …** zolang het team via een link toegang heeft. Met **Intrekken** (in hetzelfde venster) werkt geen enkele link van dat team meer en wordt het team uitgelogd.
- Logt het team daarna gewoon in met loginnaam en wachtwoord, dan geldt er geen tijdslimiet.
- Hiervoor moet SQL-bestand 008 in Supabase gedraaid zijn.

> De **teamnaam** kiest het team zelf, samen met een **icoon**, bij de start van het spel. Die naam zie je overal terug: op het dashboard, de kaarten, de stand en in de meldingen aan andere teams. Zolang een team nog geen teamnaam heeft gekozen, zie je de loginnaam.

#### Spelers aan- en uitzetten

Met de **schakelaar** (groen/rood) rechts op elke spelerskaart zet je een speler aan of uit. Uitgeschakelde spelers staan onderaan in het ingeklapte blok **⏸ Uitgeschakelde spelers**, compact en zonder knoppen.

- **Groen (aan)** — het team kan normaal inloggen en deelnemen.
- **Rood (uit)** — het team kan niet meer inloggen. Bij een inlogpoging verschijnt de melding _"Dit account is uitgeschakeld."_

Handig bij een testspeler die niet meer mee moet doen, of om teams tijdelijk te blokkeren.

#### Een speler verwijderen

Met de rode **🗑️** rechts op de spelerskaart (naast de schakelaar) verwijder je een speler helemaal, na bevestiging: het inlogaccount, alle spellen (score, antwoorden, gelopen route), de ingestuurde foto's en de regels in het itemlogboek. De loginnaam is daarna weer vrij. Speelt de speler nog, dan is de 🗑️ grijs: stop eerst het spel. Let op: bij een afgelopen spel verdwijnt de speler ook uit het rapport en de uitslag, dus maak eerst de PDF als je die wilt bewaren.

#### Apparaat resetten

Een team kan maar op één apparaat tegelijk ingelogd zijn. Wordt de app weggedrukt zónder uit te loggen, dan blijft die koppeling hangen en kan het team **op geen enkel apparaat meer inloggen** — ook niet op hetzelfde.

Klik dan op **🔓 Apparaat** op de spelerskaart (alleen zichtbaar zolang er een toestel gekoppeld is). De koppeling wordt losgelaten en het team kan direct opnieuw inloggen, met behoud van alle voortgang en punten.

> Dit is de meest voorkomende storing tijdens een spel. Als een team belt met "we kunnen niet meer inloggen", is dit vrijwel altijd de oplossing.

#### Een team direct uitloggen

De knop **🚪 Uitloggen** staat alleen op de spelerskaart zolang het team ingelogd is (groen "Actief"). Klik erop om een team meteen uit te loggen, ook als hun sessie op dit moment nog open staat. Binnen zo'n 20 seconden wordt het team automatisch teruggestuurd naar het inlogscherm, met de melding "Je bent door de beheerder uitgelogd." Hun apparaatkoppeling wordt tegelijk losgelaten, zodat ze (of iemand anders) direct opnieuw kunnen inloggen.

Handig als je een team bewust wilt onderbreken — bijvoorbeeld bij onsportief gedrag of een verkeerd uitgedeelde inlog.

> **Uitloggen laat het spel staan.** Logt het team opnieuw in, dan spelen ze verder met dezelfde score en voortgang. Op het dashboard staan ze zolang als **"Uitgelogd"**.

#### Het spel van een team stoppen

Met **⏹️ Stop spel** bij Spelers (op het Dashboard heet de knop **Spel stoppen**) beëindig je het lopende spel van één team: score en voortgang vervallen. Het team blijft ingelogd; hun app gaat binnen een halve minuut terug naar het startscherm, en bij **Ga op pad** beginnen ze een nieuw spel. Wil je álle teams opnieuw laten beginnen, gebruik dan **💣 Reset spel**. Bij Spelers staat deze knop alleen bij een team dat nu een spel speelt.

> De Spelers-pagina ververst zichzelf elke 10 seconden, dus knoppen verschijnen vanzelf zodra een team inlogt of begint.

#### Helpers

Wil je hulp bij het spelleiden, maak dan onderaan de Spelers-pagina bij **🦺 Helpers** een helper aan met **+ Nieuwe helper**: vul een naam in (letters en cijfers, anders dan de loginnamen van de spelers); het wachtwoord staat al voorgesteld. Na **Aanmaken** verstuur je het kaartje meteen met **WhatsApp**. Een helper logt gewoon in op de inlogpagina, met die naam en dat wachtwoord.

Een helper kan **meekijken** (dashboard, tijdlijn, live kaart, details per team), **foto's keuren**, antwoorden alsnog goedkeuren en **punten vrijgeven** bij een hulpvraag. Een helper kan géén routes of spelers beheren, geen bericht sturen, geen spel stoppen of resetten, geen punten aanpassen, geen eindtijd zetten en de uitslag niet vrijgeven. Meldingen op de telefoon (🔔) kan een helper wel aanzetten. Helpers staan op dezelfde soort kaarten als de spelers. Met de **🔑** maak je een nieuw wachtwoord en verstuur je het kaartje; met de rode **🗑️** kan de helper niet meer inloggen.

---

## Het spel starten

> **📋 Spel klaarzetten**: zolang niemand speelt, staat op het dashboard een stappenplan: route actief, spelers aangemaakt, inloggegevens verstuurd, zelf getest en spelers ingelogd. Wat de app zelf kan zien, vinkt hij zelf af; "verstuurd" en "getest" vink je af door op het bolletje te tikken. Staat alles op ✓, dan klapt het in tot één regel. Bij *Reset spel* worden je eigen vinkjes gewist.

1. Ga naar de gewenste route en klik op **▶ Activeren**. Eerst opent **🩺 Klaar om te spelen?** met alles wat nog aandacht nodig heeft: vraagpunten zonder vraag, punten zonder naam, een ontbrekende finish, te weinig of te veel items, en (bij Verspreid) teams met een duidelijk langere aanloop of speeltijd. ❌ moet je eerst oplossen; bij alleen ⚠️ kun je **Toch activeren**. Met **🩺 Controleren** in de routekop bekijk je deze lijst ook tussendoor.
   - Er kan maar één route tegelijk actief zijn.
   - De route moet op **✅ Klaar** staan voordat je hem kunt activeren (met ✅ Klaarzetten in hetzelfde venster).
2. Spelers kunnen nu via hun inloggegevens inloggen en op **Ga op pad** drukken.
   - Vóór het starten toont de app automatisch de **spelregels van het actieve speltype**. Je hoeft dus niets vooraf uit te leggen.
   - Op een telefoon vraagt de app bij het openen of de speler PointRush **als app wil installeren** (Android) of legt hij uit hoe je hem **op het beginscherm** zet (iPhone). Als app opent PointRush volledig scherm, zonder balken.
3. Bij een **verspreid**-route krijgt elke team automatisch een uniek startpunt toegewezen op basis van GPS-afstand, zodat teams gelijkmatig verspreid beginnen.

> **Wisselen van route of een route aanpassen.** Een team dat nog een lopende sessie heeft op een route die niet meer actief is, wordt bij het openen van de app automatisch afgemeld van die oude sessie en begint opnieuw bij naam en icoon, op de route die nu actief is. **Punten toevoegen of verwijderen tijdens een spel** kan veilig: een nieuw punt komt bij elk team dat onderweg is vlak vóór de finish in de volgorde, en een verwijderd punt valt eruit. De apps van de spelers lezen de route dan vanzelf opnieuw in. Vragen, items en de instellingen voor items gelden meteen. Heb je een bestaand punt **verschoven** of de naam of straal aangepast, druk dan op **📲 Naar spelers** in de editor (alleen bij de actieve route): binnen een paar seconden zien alle spelers de wijziging, met de melding *"🔄 De route is bijgewerkt"*. (Hiervoor moet SQL-bestand 005 in Supabase gedraaid zijn.) Tijdens het testen gebruik je het best **💣 Reset spel** na een wijziging.

---

## Live volgen

Het **Dashboard** (ververst elke paar seconden vanzelf):

- **Tegels**: actieve route, aan het spelen, gefinisht en de koploper. Op de telefoon als één compacte strook.
- **🎯 Spelleider**: hoe lang het spel loopt en hoeveel teams onderweg zijn, met daaronder alleen wat **je aandacht vraagt**: hulpvragen, foto's om te keuren, teams die 5 minuten **niet gezien** zijn (📵), en teams die wachten door een spook of plek zooi. Tik op een regel voor de details. Niets aan de hand? Dan staat er *"✅ Alles loopt"*.
- **🏆 Spelende spelers** op volgorde van de stand (medailles voor de top 3, de koploper met een gouden rand), met per team het aantal punten, de items in de balk en ingezet, en de knoppen **⏭️ Volgend punt vrijgeven**, **± Punten** en **⏹️ Spel stoppen**.
- **Wacht een team door een spook of plek zooi**, dan zie je op de kaart een aftelklok met **−30 s**: daarmee haal je er 30 seconden af. De app van het team neemt de nieuwe tijd binnen een paar seconden over.
- **Tik op een spelerskaart** voor alles van dat team: speeltijd, afstand, vragen goed, de gelopen route op een kaartje, alle bezochte punten met antwoorden en de items.
- **📜 Wat gebeurt er**: een tijdlijn met starts, bereikte punten, goede en foute antwoorden, foto's, ingezette items, bonus of aftrek van de spelleider en finishes.

De **Live kaart** vult het hele scherm en toont iedereen in zijn eigen kleur, met een vervagend **spoor van de laatste 10 minuten**. Tik op een naam in de lijst om die speler te **volgen** (🎯); de kaart schuift dan mee. Slepen of nog eens tikken stopt het volgen.

**De kaart** (live kaart, route-editor, spelerskaart) is scherp op elk zoomniveau en toont huizen, gras, bos, water, parkeerplaatsen, openbare voetpaden (privé tuinpaden niet) en bij ver inzoomen huisnummers. Met de knoppen **☀️ licht · 🌙 donker · 🛰️ luchtfoto** (op de live kaart linksboven onder de zoomknoppen, in de editor linksonder) kies je het kaartbeeld; je keuze wordt onthouden. De **luchtfoto** (PDOK, alleen Nederland) is handig om te zien of een plek echt bereikbaar is: een hek, sloot of tuin. Buiten het **speelgebied** (de route met een marge van zo'n 180 m) is de kaart iets grijzer, met een paarse stippellijn eromheen; ook spelers zien dat.

**⏪ Replay** (bovenin de live kaart) speelt het hele spel versneld af: alle teams tegelijk, elk met hun spoor in hun eigen kleur, en 🏁 zodra een team gefinisht is. De kaart kijkt **schuin** en **🎥 beweegt mee** met de teams; met **⛰️ / ⬜** kies je schuin of plat, en met de knoppen linksboven (of twee vingers) draai en kantel je zelf. Rechtsboven kies je ☀️ 🌙 🛰️. Onderin staan **▶ / ⏸**, een tijdbalk om naar elk moment te schuiven, en de snelheid (**30×** tot **300×**; bij 60× duurt een uur spelen een minuut). Met **📡 Terug naar live** ga je terug. Leuk om na afloop samen te bekijken.

---

## Tijdens het spel

### Bericht sturen

Met **📢** rechtsboven (op de telefoon in de bovenbalk) stuur je een bericht naar alle actieve teams, maximaal 150 tekens. Handig voor aankondigingen of hints.

**Aan één team**: met **📢 Bericht** op de spelerskaart van het dashboard gaat het bericht alleen naar dat team, bijvoorbeeld *"jullie lopen de verkeerde kant op"*. De andere teams zien het niet. (Hiervoor moet SQL-bestand 009 in Supabase gedraaid zijn.)

### Meldingen op je telefoon en horloge

Met **🔔 Meldingen** in het menu (onder Spel) krijg je een **pushmelding** bij een nieuwe foto en bij een hulpvraag, ook als de app dicht is, en via je telefoon ook op je horloge. Zet het aan per toestel (de telefoon vraagt één keer toestemming) en probeer het met **📨 Test sturen**. Een groen bolletje achter *Meldingen* betekent aan. Op een iPhone werkt het alleen als PointRush op het beginscherm staat.

### Eindtijd van het spel

Met **⏰ Eindtijd** (in het Spelleider-blok, of al bij *Spel klaarzetten*) zet je de tijd waarop het spel stopt: kies **30 min**, **1 uur**, **1½ uur** of **2 uur** vanaf nu, of vul zelf een tijd in. Ligt die tijd vandaag al achter je, dan geldt morgen. De knop toont daarna *Stopt om 16:00* en bij de spelleider zie je hoe lang het nog duurt.

- De teams zien bovenin hun app een **aftelklok ⏰**. In de laatste 10 minuten wordt die rood en krijgen ze één keer een groot venster: *"Nog 10 minuten! Om 16:00 stopt het spel."*
- **Op de eindtijd** is elk team dat nog onderweg is gefinisht, met de punten van dat moment. Hun app gaat naar het finishscherm; antwoorden die later binnenkomen tellen niet meer. Nieuwe spellen starten kan dan niet meer.
- Uitstellen of weghalen kan zolang de tijd nog niet voorbij is (**Geen eindtijd**). Teams die al door de eindtijd gefinisht zijn, gaan niet terug het spel in.
- Hiervoor moet SQL-bestand 006 in Supabase gedraaid zijn.

### Spel pauzeren

Met **⏸️ Pauze** in het Spelleider-blok (na bevestiging) staat het spel voor alle teams even stil, bijvoorbeeld bij onweer, voor de lunch of als iemand kwijt is.

- De teams zien een groot scherm **"⏸️ Even pauze"** en kunnen niets doen: geen punten bereiken, geen antwoorden, foto's of items.
- Bij de spelleider staat *"Gepauzeerd sinds 14:02 · 5 min"*.
- De **eindtijd loopt niet door**: met **▶️ Verder** schuift de eindtijd precies zo lang op als de pauze duurde, en verdwijnt het pauzescherm binnen een paar seconden bij iedereen.
- De wachttijd van een spook of plek zooi loopt wel door.
- Hiervoor moet SQL-bestand 010 in Supabase gedraaid zijn.

### Punten aanpassen (bonus of aftrek)

Met **± Punten** op een spelerskaart op het dashboard geef je een team punten erbij of eraf, ook als het team al gefinisht is. Kies **−20**, **−10**, **+10**, **+20** of **+50**, of vul zelf een aantal in (negatief = aftrek), en zet er een reden bij, bijv. *mooiste foto*. De score zakt nooit onder 0. De aanpassing staat in de tijdlijn (*"… kreeg +20 pt van de spelleider (mooiste foto)"*) en in het rapport bij het team onder **± Bonus en aftrek**. Hiervoor moet SQL-bestand 006 in Supabase gedraaid zijn.

### Punt vrijgeven voor een team

Kan een team zijn volgende punt echt niet bereiken (afgesloten weg, bouwhek, onveilige plek), dan drukt het team in de app op **⚠️ Niet bereikbaar?**. Op het **Dashboard** krijgt dat team dan een oranje rand met de melding *"Kan … niet bereiken"*, en je hoort een klokslag.

- **⏭️ Punt vrijgeven** — het punt telt als bereikt: bij het team springt de vraag van dat punt direct open, waar ze ook zijn. Daarna spelen ze gewoon verder.
- **Negeren** — het team krijgt de melding dat het het punt toch zelf moet proberen te halen.

Ook zonder melding kun je bij elk spelend team op **⏭️ Volgend punt vrijgeven** drukken. Het team ziet dan eerst *"📨 Punt vrijgegeven — de organisatie heeft dit punt voor jullie vrijgegeven"* en daarna de vraag.

### Tussenstand tonen

Je kunt tijdens het spel de stand bij alle teams tegelijk in beeld laten springen:

- **Handmatig** — via **🏆 Tussenstand** in het menu (onder Spel), na bevestiging.
- **Automatisch** — via **⚙️ Instellingen** → "🏆 Tussenstand": stel een interval in hele minuten in (minimaal 1, 0 = uit) en hoe lang de stand zichtbaar blijft. Het interval telt vanaf de start van de eerste sessie.

De spelers zien dan elk team met zijn icoon, naam en puntenaantal, de meeste punten bovenaan. Plaatsnummers, tijd en afstand staan er bewust niet bij. Aan het eind zien ze de volledige **eindstand** met medailles, speeltijd en afstand.

> Zet de zichtbaarheidsduur ruim boven 5 seconden — de spelerapp controleert elke 3 seconden of er een tussenstand klaarstaat, dus bij een te korte duur missen sommige teams 'm.

### Route stoppen

Met **Stop route** in het menu (of **⏹ Deactiveren** bij de route) haal je de route uit de actieve stand, na bevestiging. Lopende spellen worden afgesloten: de teams zien binnen een paar seconden *"🛑 De route is gestopt"* en gaan terug naar het startscherm. Gegevens worden niet gewist.

### Spel resetten

Onderaan het dashboard en in het menu staat **💣 Reset spel** (met bevestiging). Dit wist:

- Alle spellen van alle teams, ook van gefinishte teams: niemand is daarna nog bezig of gefinisht
- Alle locatiegeschiedenis (gelopen routes), voortgang, antwoorden en scores
- Alle ingestuurde foto's, ook uit de opslag van Supabase
- Alle opgepakte items (die liggen weer op de kaart), startitems, effecten en het itemlogboek
- De uitslag gaat weer op verborgen

Gedeelde kaart-links werken daarna niet meer; maak dus eerst het rapport als je dat wilt bewaren. Routes, routepunten, vragen en teams blijven bewaard en de actieve route blijft actief. Gebruik dit om opnieuw te beginnen met dezelfde opzet.

> Teams die op dat moment spelen, zien *"⏹️ Je spel is gestopt"* en kunnen opnieuw beginnen. De vinkjes van het stappenplan "Spel klaarzetten" worden ook gewist.

---

## Antwoorden & uitslag

Onder **📝 Antwoorden** in de zijbalk zie je per team elke beantwoorde vraag in de volgorde waarin ze gelopen zijn: het gegeven antwoord, het goede antwoord en de punten.

- **👫 Per team / 📊 Per vraag** — met *Per vraag* zie je per vraag (op volgorde van de route) hoeveel teams hem goed hadden, als percentage met een balk (groen, oranje of rood), en welke **foute antwoorden** vaak voorkwamen, met het goede antwoord erbij. Zo zie je snel of een vraag te moeilijk of verkeerd ingesteld is. Foto-opdrachten tellen mee zodra ze gekeurd zijn.
- **✓ Toch goed** — lijkt een fout antwoord genoeg op het goede (een tikfout, een andere schrijfwijze)? Klik erop en het team krijgt alsnog de punten van het goede antwoord.
- **Foto-opdrachten** — teams sturen een foto in en spelen meteen door. Jij keurt de foto's hier (✓ met punten, of ✗). De punten gaan direct bij de score op, ook als het team al gefinisht is.
- **📷 Foto's beoordelen** (bovenaan het dashboard, met het aantal wachtende foto's): één foto tegelijk, groot in beeld, met het team en het punt. Pas eventueel de punten aan (standaard het maximum) en tik **✓ Goed** of **✗ Afkeuren**; daarna komt vanzelf de volgende. Tik je op de pushmelding *"📸 Nieuwe foto"*, dan opent dit venster meteen.
- **🏆 Uitslag vrijgeven** — teams die gefinisht zijn zien "Even geduld…" tot jij hier de uitslag vrijgeeft; daarna verschijnt de eindstand binnen ongeveer 10 seconden bij iedereen. Zijn er nog teams onderweg of foto's niet gekeurd, dan waarschuwt de knop eerst. Je kunt de uitslag ook weer verbergen.

- **📄 Rapport (PDF)** — opent een spelrapport in de stijl van de app, met het logo: eerst de winnaar groot in beeld en de eindstand, daarna per team op een eigen pagina de vragen met antwoorden (en foto's), de ingezette en ontvangen items (tegen wie, van wie) en een kaart met de gelopen route. Klik op **📄 PDF maken (hele rapport)** en daarna op **📲 Versturen**: het deelmenu van je telefoon of computer opent, kies WhatsApp en de groepsapp of persoon. Met **👫 PDF per team** maak je per team een eigen PDF (eindstand, hun eigen verslag met kaart en het dankwoord) en verstuur je die los. **⬇️ Opslaan** bewaart de PDF; **🖨️ Afdrukken** werkt zoals vroeger. Heeft je browser geen deelmenu met bestanden (bijvoorbeeld Firefox), dan wordt de PDF gedownload en opent WhatsApp, zodat je hem als bijlage toevoegt. Is de stand nog niet definitief, dan staat dat er bovenaan bij. Het rapport sluit af met een dankwoord van de organisatie.

> **🏁 Spel afronden** (in het Spelleider-blok op het dashboard): geeft in één keer de uitslag vrij en opent het rapport. De route blijft actief, zodat teams de uitslag op hun finishscherm kunnen zien; stop de route daarna zelf.

Bij het activeren van een route en bij **Reset spel** gaat de uitslag automatisch weer dicht. De finish, het terugkijken en de gelopen route blijven voor de teams te zien tot je de route stopt.

---

## De stand

De stand staat op het **Dashboard** bij *Spelende spelers*: op score, en bij gelijke score wint de kortste speeltijd. De teams zien de stand tussendoor via de tussenstand, en aan het eind op hun finishscherm zodra je de uitslag vrijgeeft.

---

## Aandachtspunten

- **GPS-nauwkeurigheid** varieert per apparaat en locatie (bebouwing, bewolking). Stel de radius ruimer in op moeilijk te bereiken punten of in stedelijk gebied (50–80 m).
- **Speciale items** worden pas actief zodra de route actief is.
- **Radar**: een team dat Radar gebruikt, ziet 2 minuten lang de exacte GPS-posities van alle andere teams. Daarna keert de weergave terug naar de globale positie.
- **Verspreid-modus**: het eerste punt is het startpunt en het laatste de finish — samen op één verzamelplek. Kies daarvoor een centrale plek waar alle teams goed kunnen samenkomen.
- **Aantal teams instellen** (Verspreid): stel het verwachte aantal teams in vóórdat je de route activeert. Dit bepaalt hoeveel startplekken er over het rondje worden verdeeld. Een team dat begint, krijgt de **eerste vrije startplek** (gestopte of oude spellen tellen niet mee, dus wie opnieuw begint komt nooit op de plek van een ander). Zijn er **meer teams dan startplekken**, dan start het extra team op een bezette plek maar loopt het rondje **de andere kant op**, zodat ze niet samen lopen. Klopt het aantal spelers niet met het ingestelde aantal teams, dan waarschuwt het stappenplan op het dashboard, met een knop naar de route.
- **Eén login per apparaat**: een team kan niet gelijktijdig op twee apparaten ingelogd zijn — bij een tweede inlogpoging wordt die nieuwe poging geweigerd en blijft het eerste apparaat actief. Stuur het team naar **Uitloggen** op het oude apparaat als ze willen wisselen, gebruik **🔓 Apparaat** (bij Spelers) als dat niet meer lukt, of log het team vanuit het adminpaneel zelf uit met **🚪 Uitloggen**.
- **Icoon kiezen**: elk team kiest bij het interscherm automatisch een nog vrij icoon; zodra alle iconen vergeven zijn mogen teams er eentje dubbel hebben.
- **Speltype ligt vast**: het speltype kies je bij het aanmaken van een route en is daarna niet meer te wijzigen. Twijfel je, maak dan twee routes aan.
