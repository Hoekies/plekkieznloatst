# Beheerdershandleiding — PointRush

## Overzicht

Als beheerder stel jij de routes in, maak je groepen aan, start je het spel en volg je de voortgang live. Alles gaat via het adminpaneel, bereikbaar op `/admin`.

---

## Voorbereiding

### 1. Route aanmaken

1. Ga naar **Routes** in de zijbalk.
2. Klik op **Nieuwe route**.
3. Geef de route een naam en **kies het speltype**: Sequentieel, Verspreid of Mist.
4. **Tik op de kaart** waar het punt moet komen en kies **📍 Punt**. (Toevoegen gaat altijd via de kaart; een nieuw punt komt vóór de finish in de lijst.)
5. Herhaal voor alle punten. De volgorde pas je aan door een punt in de lijst te **slepen** naar een andere plek (of stap voor stap met ▲▼).
6. Klik op een punt (op de kaart of in de lijst): linksboven op de kaart opent een klein paneel met
   - **Vraag bewerken / toevoegen** — bovenaan, voor de vraag, antwoorden en afbeelding
   - **Naam** — met de knop **💡** ernaast vul je een voorstel in, bedacht uit de vraag of het goede antwoord (spelers zien de naam van een vraagpunt pas na afloop)
   - **Type** — knoppen ❓ Vraag, ℹ️ Info of 🏁 Eind
   - Bij een meerkeuzevraag kun je per antwoord eigen **punten** invullen, ook negatief (bijv. −25 voor een fout antwoord). Leeg laten = het goede antwoord krijgt de punten van de vraag, de andere 0. De score van een team zakt nooit onder 0.
7. Sleep een punt op de kaart om de positie fijn te stellen.
   **Radius en punten** gelden voor de hele route: ⚙️ Instellingen → **📍 Punten & vragen**.
8. Ga terug naar **Routes** en klik bij de route op **Publiceren** als hij klaar is, daarna op **▶ Activeren**.

> **Routes-overzicht**: elke route staat als één regel met speltype en status (● Actief, Gepubliceerd of Concept). Rechts staat alleen de volgende stap als knop (Publiceren → ▶ Activeren) en **Bewerken**. Daarnaast staan icoonknoppen: 📤 Exporteren, ↩ Terug naar concept en 🗑️ Verwijderen (houd de muis erboven voor de uitleg). De actieve route staat altijd bovenaan.

> Het eindpunt (goud/vlag-icoon) is het laatste punt van de route. Zodra een team het eindpunt bereikt wordt hun tijd vastgelegd.

> Bij een **Mist**-route werkt dit anders — zie [Mist-routes instellen](#mist-routes-instellen).

---

### 2. Speltype en route-instellingen

Het speltype kies je **bij het aanmaken** van de route, en het kan daarna **niet meer gewijzigd worden**. De instellingen en de opbouw van een route verschillen te veel per speltype om halverwege om te schakelen zonder de route onbruikbaar te maken.

Welk speltype een route heeft zie je overal terug: in de routeslijst staat het als gekleurd label onder de naam, en in de editor bovenin naast de status.

| Speltype | Omschrijving |
|---|---|
| 🎯 **Sequentieel** | Alle groepen lopen de punten in dezelfde volgorde (standaard) |
| 🎲 **Verspreid (lus)** | Elke groep start op een ander punt en loopt de route als een lus — iedereen legt dezelfde afstand af, maar in een andere volgorde |
| ☁️ **Mist** | Geen vaste route: teams spelen door te lopen mist vrij op hun eigen kaart en verdienen sterren per vrijgespeeld oppervlak |

In de route-editor opent het **⚙️-tandwiel** bovenin de instellingen. Daar staan alleen de instellingen die bij het gekozen speltype horen:

| Instelling | Bij welk speltype |
|---|---|
| **⭐ Item-waarden** — standaard ster- en bomwaarde | Verspreid |
| **⏱️ Duur van effecten** — hoe lang 👻 Spook (Verspreid) en ⛔ Plekzooi duren (minuten) | Sequentieel, Verspreid |
| **🔄 Respawn** — items opnieuw laten verschijnen | Verspreid |
| **☁️ Mist-instellingen** — m² per ster | Mist |
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

#### Afstand en speeltijd per team

Rechtsboven op de kaart staat een klein paneel **⏱️ Afstand, tijd & punten per team**: per team (in de kleur van de kaart) hoeveel kilometer het loopt, hoe lang het ongeveer duurt en hoeveel punten het ongeveer haalt, bijvoorbeeld *Team 1 · 2,35 km · ≈ 52 min · ≈ 310 pt*. Ga met de muis over een team voor de opbouw (lopen, vragen, items). Klik op de kop om het paneel in of uit te klappen. De looproute per team staat onder de puntenlijst.

- **Lopen** — 4,5 km/u, het wandeltempo van een groep.
- **Vragen** — ongeveer 2 minuten per vraag en een halve minuut per infopunt.
- **Items** — omlopen naar items die binnen 150 m van de route liggen, de vastzittijd van plek zooi die op de route ligt, en de verwachte vertraging door spoken en bananen van tegenstanders. Met respawn aan telt dat zwaarder.

- **Punten** — de maximale punten per vraag (of per antwoord) bij ongeveer 70% goed, plus de punten van punten zonder vraag. Items: sterren en verdubbelingen die het team waarschijnlijk pakt, gemiddeld iets plus voor een vraagteken, en een deel van de bommen van tegenstanders eraf. Wissel en dief middelen over alle teams uit en tellen niet mee.

Onderaan het paneel staat, klein, hoeveel items je van elke soort hebt geplaatst.

Het blijft een schatting: verplaats een punt of item, of verander het aantal teams of de duur van spook en plek zooi, en de tijden rekenen meteen opnieuw.

#### Instellingen voor Verspreid-modus

In het tabblad **📍 Punten** verschijnen, zodra de route op verspreid-modus staat, extra velden boven de puntenlijst:

| Instelling | Uitleg |
|---|---|
| **Aantal teams** | Verwacht aantal deelnemende groepen (min. 2). Bepaalt de startpuntberekening. |
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
3. Klik op **🔄 Genereer punten in cirkel**.
4. Het systeem plaatst de punten in een gelijke cirkel rondom het middelpunt op de kaart.
5. Het **middelpunt** (⊕) is versleepbaar — sleep het naar de gewenste locatie en de ghost-voorvertoning past zich direct aan.
6. Sleep daarna elk punt afzonderlijk naar de exacte straat.

> Naast de cirkelpunten plaatst de generator automatisch een **🏠 Startpunt** (infopunt, bovenaan de lijst) en een **🏁 Finish** (eindpunt, onderaan de lijst), allebei op het middelpunt. Sleep het middelpunt dus naar de plek waar je de teams wilt ontvangen en weer wilt opvangen.

> De ghost-cirkel op de kaart (gestippeld, cyaan) toont een voorvertoning van de punten vóór je ze genereert. De gids-cirkel rondom een geselecteerd punt toont de aanbevolen afstand tot het volgende punt.

---

### Mist-routes instellen

Een mist-route heeft **geen route en geen vaste punten**. De editor toont daarom geen Punten/Items-tabbladen, maar een eenvoudiger scherm.

#### Startlocatie

Klik op de kaart om de plek te zetten waar de teams beginnen. Die verschijnt als 🚩 op hun kaart. Je kunt de vlag daarna verslepen om 'm bij te stellen.

De startlocatie is een aanwijzing, geen grens: teams mogen overal heen lopen. Het speelgebied is onbegrensd.

#### Sterren instellen

Via **⚙️ Instellingen** → "☁️ Mist-instellingen" stel je in hoeveel m² een team moet vrijspelen voor één ster. Standaard 2.500 m².

Ter kalibratie: een uur stevig doorwandelen levert grofweg **40 tot 45 hectare** (400.000–450.000 m²) op. Bij 2.500 m² per ster zijn dat ruim 160 sterren per uur. Wil je dat sterren schaarser en waardevoller aanvoelen, zet de drempel dan flink hoger.

#### Vragen plaatsen (optioneel)

Tik op de kaart en kies **❓ Vraagpunt** (of **🚩 Startlocatie** om de startplek te zetten). Anders dan bij de andere speltypen:

- Vraagpunten hebben **geen vaste volgorde** — teams komen ze tegen in de volgorde waarin ze toevallig langslopen.
- De vraag **verschijnt automatisch** zodra een team binnen de radius komt; er is geen 📍-knop om op te drukken.
- Alleen het type *Vraagpunt* is beschikbaar (geen info- of eindpunt — een mist-route heeft immers geen einde).

Laat je alle vragen weg, dan is het puur een verkenningsspel.

#### Badges

Teams verdienen automatisch badges, gekoppeld aan het dorp of de wijk waar ze lopen (bijvoorbeeld *Verkenner van Berghem*). De plaatsnaam wordt automatisch bepaald — je hoeft niets in te stellen.

| Badge | Drempel |
|---|---|
| 👣 Bezoeker van … | 1 hectare |
| 🗺️ Verkenner van … | 5 hectare |
| 🧭 Ontdekker van … | 15 hectare |
| 👑 Meester van … | 40 hectare |

Daarnaast zijn er algemene badges: ☁️ Eerste stappen, 🏘️ Grensganger (in 2 plaatsen gespeeld), ⭐ Sterrenjager (5 sterren) en 🚶 Volhouder (een uur onderweg).

> Badges gelden **per spel** en verdwijnen bij **🗑️ Reset spel**.

#### Anti-valsspelen

Mist wordt alleen vrijgespeeld op **wandeltempo** (tot ongeveer 6 km/u). Rijdt of fietst een team, dan telt dat niet mee — er verschijnt geen waarschuwing, de mist blijft daar simpelweg liggen.

#### Het spel beëindigen

Een mist-route heeft geen natuurlijk eindpunt. **Jij bepaalt wanneer het klaar is** met **⏹ Deactiveer** of **Stop route**. Alle lopende sessies worden dan meteen afgerond en de teams krijgen hun eindscherm met eindstand en leaderboard te zien.

---

### 3. Speciale items plaatsen (optioneel)

> Speciale items bestaan alleen bij **Sequentieel** en **Verspreid**. Een mist-route heeft ze niet.
>
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
| 🦹 | Dief | De punten van het volgende goede antwoord van een tegenstander gaan naar het team (minpunten nooit) |
| 🍌 | Banaan | Het volgende punt van een tegenstander ruilt van plek met het punt daarna (1-2-3 wordt 2-1-3); startpunt en eindpunt blijven op hun plek |
| 🔄 | Wissel | Het team ruilt zijn score met die van een tegenstander |
| ❓ | Vraagteken | Komt niet in de balk: wordt meteen gespeeld bij het oppakken. 40% 2× sterwaarde, 10% jackpot (5× sterwaarde), 20% −1× sterwaarde, 10% −200 punten, 20% iedere tegenstander krijgt willekeurig 1× sterwaarde erbij of eraf |
| ⛔ | Plek zooi | **Onzichtbaar voor spelers** — geen icoontje op de kaart. Wie de radius betreedt, staat stil: de kaart verdwijnt en er loopt een afteltimer (standaard 5 minuten). De val blijft liggen voor andere teams, maar raakt elk team maar één keer. |

> **Dief-effect**: de dief wacht tot de tegenstander een vraag beantwoordt waarmee ze punten verdienen. Bij een fout antwoord (0 of minpunten) blijft de dief gewoon klaarstaan.

> **🎒 Startitems**: in de route-instellingen kies je per soort item (banaan, bom, spook, dief, wissel, verdubbeling, radar, ster; een vraagteken kan niet, die wordt altijd meteen gespeeld) hoeveel elk team bij de start gratis in de balk krijgt, 0 tot 5 per soort. Bij Sequentieel staat standaard één banaan aan, bij Verspreid niets. Een wijziging geldt voor teams die daarna beginnen. Startitems staan nooit op de kaart en worden bij *Reset spel* opgeruimd.

> **Na de finish**: items die een team nog in de balk had (bijvoorbeeld een wissel), vervallen zodra het team finisht. Bij **🎁 Items inzetten na de finish** in de route-instellingen tik je per item aan wat na de finish nog mag (bom, spook, dief, banaan, wissel; groen = mag). Ster, vraagteken, verdubbeling en radar staan er niet bij: een ster en een vraagteken worden meteen gebruikt, en verdubbeling en radar hebben na de finish geen nut. Een gefinisht team houdt die items en kan ze vanaf het finishscherm nog inzetten op teams die onderweg zijn — tot jij de uitslag vrijgeeft; dan vervalt de rest. Een gefinisht team kan zelf ook nog geraakt worden, maar alleen met de groene items die op een gefinisht team iets doen: **bom** en **wissel**. Spook, dief en banaan werken op punten die nog komen en raken alleen teams die onderweg zijn. Na het vrijgeven van de uitslag kan niemand meer iets inzetten.

> **Andere teams op de kaart**: spelers zien andere teams niet op hun kaart. Alleen wie een 📡 Radar inzet, ziet 2 minuten lang waar de anderen lopen — en daarna verdwijnen ze weer. De anderen zien het radarteam niet. Op jouw live kaart zie je als beheerder iedereen altijd.

> **Banaan-effect**: werkt alleen als de tegenstander nog minimaal 2 punten vóór het eindpunt te gaan heeft. Anders krijgt het aanvallende team een melding en blijft de banaan bewaard.

> **"Aangeboden door"-melding**: bij alle aanvals-items (Spook, Bom, Wissel, Dief, Banaan) krijgt de tegenstander binnen ongeveer 5 seconden een groot venster met de naam van het aanvallende team en een klokslag (en trillen op Android; iPhones kunnen vanuit een webapp niet trillen). Het venster blijft staan tot het team op **OK, BEGREPEN** tikt.

#### Duur van Spook en Plek zooi instellen

Via **⚙️ Instellingen** → "⏱️ Duur van effecten" stel je per route in, in minuten:

- **👻 Spook** — hoe lang het volgende punt van het getroffen team verdwenen is (standaard 10 minuten).
- **⛔ Plekzooi** — hoe lang een team vastzit na het raken van een plekzooi (standaard 5 minuten).

Halve minuten mogen ook (bijv. 2,5). De duur geldt voor alle spook- en plekzooi-items in de route.

---

### 4. Groepen aanmaken

1. Ga naar **Groepen** in de zijbalk.
2. Klik op **+ Nieuwe groep** en vul een **loginnaam** en een **wachtwoord** in.
   - De **loginnaam** is wat de speler typt bij het inloggen (bijv. "team1").
   - Het **wachtwoord** moet minimaal 8 tekens zijn.
3. Deel de inloggegevens met de groep via de **WhatsApp-knop** bovenaan.
4. De berichttekst is aanpasbaar via **✏️ Berichttekst** — opgeslagen per browser. Onder je eigen tekst komt altijd automatisch de uitleg hoe je de app op je beginscherm zet (eerst Android, dan iPhone).

> De **teamnaam** kiest de groep zelf, samen met een **icoon**, bij de start van het spel. Die naam zie je overal terug: op het dashboard, de kaarten, het leaderboard en in de meldingen aan andere teams. Zolang een groep nog geen teamnaam heeft gekozen, zie je de loginnaam.

#### Groepen aan- en uitzetten

Met de **toggle** (groen/rood) rechts op elke groepskaart kun je een groep in- of uitschakelen:

- **Groen (aan)** — de groep kan normaal inloggen en deelnemen.
- **Rood (uit)** — de groep kan niet meer inloggen. Bij een inlogpoging verschijnt de melding _"Deze groep is uitgeschakeld."_

Handig bij een testgroep die niet meer mee moet doen, of om groepen tijdelijk te blokkeren.

#### Loginnaam of wachtwoord wijzigen

Via de knoppen **🔑 Wachtwoord** en **✏️ Loginnaam** op de groepskaart kun je deze gegevens aanpassen zonder de groep opnieuw aan te maken.

#### Apparaat resetten

Een groep kan maar op één apparaat tegelijk ingelogd zijn. Wordt de app weggedrukt zónder uit te loggen, dan blijft die koppeling hangen en kan de groep **op geen enkel apparaat meer inloggen** — ook niet op hetzelfde.

Klik dan op **🔓 Apparaat** op de groepskaart (alleen zichtbaar zolang er een toestel gekoppeld is). De koppeling wordt losgelaten en de groep kan direct opnieuw inloggen, met behoud van alle voortgang en punten.

> Dit is de meest voorkomende storing tijdens een spel. Als een team belt met "we kunnen niet meer inloggen", is dit vrijwel altijd de oplossing.

#### Een groep direct uitloggen

De knop **🚪 Uitloggen** staat alleen op de groepskaart zolang de groep ingelogd is (groen "Actief"). Klik erop om een groep meteen uit te loggen, ook als hun sessie op dit moment nog open staat. Binnen zo'n 20 seconden wordt de groep automatisch teruggestuurd naar het inlogscherm, met de melding "Je bent door de beheerder uitgelogd." Hun apparaatkoppeling wordt tegelijk losgelaten, zodat ze (of iemand anders) direct opnieuw kunnen inloggen.

Handig als je een groep bewust wilt onderbreken — bijvoorbeeld bij onsportief gedrag of een verkeerd uitgedeelde inlog.

> **Uitloggen laat het spel staan.** Logt de groep opnieuw in, dan spelen ze verder met dezelfde score en voortgang. Op het dashboard staan ze zolang als **"Uitgelogd"**.

#### Het spel van een groep stoppen

Met **⏹️ Stop spel** bij Groepen (op het Dashboard heet de knop **Spel stoppen**) beëindig je het lopende spel van één groep: score en voortgang vervallen. De groep blijft ingelogd; hun app gaat binnen een halve minuut terug naar het startscherm, en bij **Ga op pad** beginnen ze een nieuw spel. Wil je álle groepen opnieuw laten beginnen, gebruik dan **🗑️ Reset spel**. Bij Groepen staat deze knop alleen bij een groep die nu een spel speelt.

> De Groepen-pagina ververst zichzelf elke 10 seconden, dus knoppen verschijnen vanzelf zodra een groep inlogt of begint.

---

## Het spel starten

1. Ga naar de gewenste route en klik op **▶ Activeer**.
   - Er kan maar één route tegelijk actief zijn.
   - De route moet op "Gepubliceerd" staan voordat je hem kunt activeren.
2. Groepen kunnen nu via hun inloggegevens inloggen en op **Ga op pad** drukken.
   - Vóór het starten toont de app automatisch de **spelregels van het actieve speltype**, inclusief de sterdrempel bij een mist-route. Je hoeft dus niets vooraf uit te leggen.
3. Bij een **verspreid**-route krijgt elke groep automatisch een uniek startpunt toegewezen op basis van GPS-afstand, zodat teams gelijkmatig verspreid beginnen.
4. Bij een **mist**-route beginnen alle groepen met een volledig bedekte kaart. Wijs ze op de 🚩 als je een startlocatie hebt ingesteld.

> **Wisselen van route of een route aanpassen.** Een groep die nog een lopende sessie heeft op een route die niet meer actief is, wordt bij het openen van de app automatisch afgemeld van die oude sessie en begint opnieuw bij naam en icoon, op de route die nu actief is. Hetzelfde gebeurt bij een **verspreid**-route als je er punten aan toevoegt of verwijdert nadat een groep al gestart is: de teamvolgorde klopt dan niet meer, dus die groep begint opnieuw. Pas een route daarom niet aan tijdens een echt spel. Tijdens het testen gebruik je het best **🗑️ Reset spel** na een wijziging.

---

## Live volgen

Het **Dashboard** toont per groep:

| Kolom | Betekenis |
|---|---|
| Score | Huidig puntentotaal |
| Voortgang | Aantal bezochte punten / totaal |
| Gestart | Starttijd van de sessie |
| Huidig punt | Naam van het laatste bereiktte punt |
| Speeltijd | Totale tijd (alleen zichtbaar na finish) |
| Laatste update | Hoe lang geleden de GPS-positie is bijgewerkt |

De **Live kaart** toont de actuele (globale) GPS-posities van alle groepen op de kaart — ook bij een mist-route, zodat je ziet waar de teams lopen.

Het dashboard ververst automatisch elke 5 seconden en via realtime-database-updates; het leaderboard elke 4 seconden.

> **Bij een mist-route** zeggen de kolommen *Voortgang* en *Huidig punt* niets: er zijn geen routepunten om langs te gaan, dus de voortgangsbalk blijft op nul staan. Kijk daar naar de **Score** (het aantal verdiende sterren) en naar de **Live kaart**.

---

## Tijdens het spel

### Bericht sturen

Ga naar **Bericht sturen** om een notificatie naar alle actieve groepen te sturen. Handig voor aankondigingen of hints.

### Punt vrijgeven voor een team

Kan een team zijn volgende punt echt niet bereiken (afgesloten weg, bouwhek, onveilige plek), dan drukt het team in de app op **⚠️ Niet bereikbaar?**. Op het **Dashboard** krijgt dat team dan een oranje rand met de melding *"Kan … niet bereiken"*, en je hoort een klokslag.

- **⏭️ Punt vrijgeven** — het punt telt als bereikt: bij het team springt de vraag van dat punt direct open, waar ze ook zijn. Daarna spelen ze gewoon verder.
- **Negeren** — het team krijgt de melding dat het het punt toch zelf moet proberen te halen.

Ook zonder melding kun je bij elk spelend team op **⏭️ Volgend punt vrijgeven** drukken. Bij een mist-route bestaat deze knop niet, want daar is geen vaste volgorde.

### Tussenstand tonen

Je kunt tijdens het spel de stand bij alle teams tegelijk in beeld laten springen:

- **Handmatig** — via de gele knop **🏆 Tussenstand** bovenaan de acties in de zijbalk. De knop laat zelf "✓ Getoond" zien als het gelukt is. Opnieuw tonen kan zodra de vorige tussenstand weer weg is.
- **Automatisch** — via **⚙️ Instellingen** → "🏆 Tussenstand": stel een interval in hele minuten in (minimaal 1, 0 = uit) en hoe lang de stand zichtbaar blijft. Het interval telt vanaf de start van de eerste sessie.

De spelers zien dan elk team met zijn icoon, naam en puntenaantal, de meeste punten bovenaan. Plaatsnummers, tijd en afstand staan er bewust niet bij. Aan het eind zien ze de volledige **eindstand** met medailles, speeltijd en afstand.

> Zet de zichtbaarheidsduur ruim boven 5 seconden — de spelerapp controleert elke 3 seconden of er een tussenstand klaarstaat, dus bij een te korte duur missen sommige teams 'm.

### Route stoppen

In de route-editor staat een **⏹ Deactiveer**-knop, en in de zijbalk **Stop route**. Hiermee haal je de route uit de actieve stand zonder gegevens te wissen.

> Bij een **mist**-route worden alle lopende sessies hierdoor meteen afgerond en krijgen de teams hun eindscherm. Dit is de manier om een mist-spel te beëindigen — er is geen eindpunt dat het spel vanzelf afsluit.

### Spel resetten

Op het dashboard staat onderaan **🗑️ Reset spel**. Dit wist:

- Alle actieve sessies
- Alle locatiegeschiedenis
- Alle voortgang en scores
- Alle geclaimde speciale items
- Alle vrijgespeelde mist en behaalde badges

Routes, routepunten, vragen en groepen blijven bewaard. Gebruik dit om opnieuw te beginnen met dezelfde opzet.

> Klik tweemaal (bevestiging vereist) om te voorkomen dat je per ongeluk reset.

---

## Antwoorden & uitslag

Onder **📝 Antwoorden** in de zijbalk zie je per team elke beantwoorde vraag in de volgorde waarin ze gelopen zijn: het gegeven antwoord, het goede antwoord en de punten.

- **✓ Toch goed** — lijkt een fout antwoord genoeg op het goede (een tikfout, een andere schrijfwijze)? Klik erop en het team krijgt alsnog de punten van het goede antwoord.
- **Foto-opdrachten** — teams sturen een foto in en spelen meteen door. Jij keurt de foto's hier (✓ met punten, of ✗). De punten gaan direct bij de score op, ook als het team al gefinisht is.
- **🏆 Uitslag vrijgeven** — teams die gefinisht zijn zien "Even geduld…" tot jij hier de uitslag vrijgeeft; daarna verschijnt de eindstand binnen ongeveer 10 seconden bij iedereen. Zijn er nog teams onderweg of foto's niet gekeurd, dan waarschuwt de knop eerst. Je kunt de uitslag ook weer verbergen.

- **📄 Rapport (PDF)** — opent een spelrapport in de stijl van de app, met het logo: eerst de winnaar groot in beeld en de eindstand, daarna per team op een eigen pagina de vragen met antwoorden (en foto's), de ingezette en ontvangen items (tegen wie, van wie) en een kaart met de gelopen route. Klik op "Opslaan als PDF / afdrukken" en kies in het printvenster "Opslaan als PDF" om het te versturen. Is de stand nog niet definitief, dan staat dat er bovenaan bij. Het rapport sluit af met een dankwoord van de organisatie.

Bij het activeren van een route en bij **Reset spel** gaat de uitslag automatisch weer dicht. De finish, het terugkijken en de gelopen route blijven voor de teams te zien tot je de route stopt.

---

## Leaderboard

Het leaderboard toont de eindrangschikking op basis van score. Bij gelijke score is de kortste speeltijd bepalend. Het leaderboard is ook zichtbaar voor spelers.

De tabel toont per team de **Teamnaam** (de naam die de groep zelf gekozen heeft; staat er "nog geen naam gekozen", dan heeft die groep nog niet op "Ga op pad" gedrukt), de score, speeltijd, afgelegde afstand en voortgang.

---

## Aandachtspunten

- **GPS-nauwkeurigheid** varieert per apparaat en locatie (bebouwing, bewolking). Stel de radius ruimer in op moeilijk te bereiken punten of in stedelijk gebied (50–80 m).
- **Speciale items** worden pas actief zodra de route actief is.
- **Radar**: een team dat Radar gebruikt, ziet 2 minuten lang de exacte GPS-posities van alle andere teams. Daarna keert de weergave terug naar de globale positie.
- **Verspreid-modus**: het eerste punt is het startpunt en het laatste de finish — samen op één verzamelplek. Kies daarvoor een centrale plek waar alle teams goed kunnen samenkomen.
- **Aantal teams instellen**: stel het verwachte aantal teams in vóórdat je de route activeert. Dit bepaalt hoe de startpunten worden verdeeld.
- **Eén login per apparaat**: een groep kan niet gelijktijdig op twee apparaten ingelogd zijn — bij een tweede inlogpoging wordt die nieuwe poging geweigerd en blijft het eerste apparaat actief. Stuur de groep naar **Uitloggen** op het oude apparaat als ze willen wisselen, gebruik **🔓 Apparaat** (bij Groepen) als dat niet meer lukt, of log de groep vanuit het adminpaneel zelf uit met **🚪 Uitloggen**.
- **Icoon kiezen**: elk team kiest bij het interscherm automatisch een nog vrij icoon; zodra alle iconen vergeven zijn mogen teams er eentje dubbel hebben.
- **Speltype ligt vast**: het speltype kies je bij het aanmaken van een route en is daarna niet meer te wijzigen. Twijfel je, maak dan twee routes aan.
- **Mist-modus vergt geen voorbereiding**: geen punten uitzetten, geen route bedenken. Alleen een startlocatie en eventueel wat vragen. Handig als je weinig tijd hebt om iets uit te zetten.
- **Mist stopt niet vanzelf**: spreek vooraf een eindtijd af met de teams, want alleen jij kunt het spel beëindigen.
