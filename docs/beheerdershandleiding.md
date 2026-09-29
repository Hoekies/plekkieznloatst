# Beheerdershandleiding — PointRush

## Overzicht

Als beheerder stel jij de routes in, maak je groepen aan, start je het spel en volg je de voortgang live. Alles gaat via het adminpaneel, bereikbaar op `/admin`.

---

## Voorbereiding

### 1. Route aanmaken

1. Ga naar **Routes** in de zijbalk.
2. Klik op **Nieuwe route**.
3. Geef de route een naam en **kies het speltype**: Sequentieel, Verspreid of Mist.
4. Klik op **Punt toevoegen** en klik op de kaart om een punt te plaatsen.
5. Herhaal voor alle punten in de gewenste volgorde.
6. Klik op een punt in de lijst om het te bewerken:
   - **Naam** — zichtbaar voor de speler
   - **Type** — Vraagpunt, Infopunt of Eindpunt
   - **Radius** — hoeveel meter een speler van het punt mag staan (standaard 30–50 m)
   - **Punten** — hoeveel punten een correct antwoord oplevert
   - **Vraag** — klik op "Vraag bewerken" voor de vraag, antwoorden en afbeelding
7. Sleep een punt op de kaart om de positie fijn te stellen.
8. Klik op **Publiceer** als de route klaar is.

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
| **⭐ Item-waarden** — standaard ster- en bomwaarde | Sequentieel, Verspreid |
| **⏱️ Duur van effecten** — hoe lang 👻 Spook en ⛔ Plekzooi duren (minuten) | Sequentieel, Verspreid |
| **🔄 Respawn** — items opnieuw laten verschijnen | Verspreid |
| **☁️ Mist-instellingen** — m² per ster | Mist |
| **🏆 Tussenstand** — automatische reveal | alle |

#### Hoe werkt Verspreid?

Een verspreide route bestaat uit drie delen:

- **🏠 Start hub** — het **eerste** punt in de lijst. Hier checken alle teams in voordat ze vertrekken.
- **De lus** — alle punten daartussen. Elk team krijgt een eigen instapplek in de lus, berekend op GPS-afstand, zodat groepen gelijkmatig verspreid lopen.
- **🏁 Finish hub** — het **laatste** punt in de lijst, op dezelfde plek als de start hub. Hier komen alle teams na hun lus weer samen.

```
Route met hub + 6 lus-punten (3 teams):

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

> **Belangrijk:** De hub-punten herkent het systeem aan hun **positie in de lijst**: het eerste punt is altijd de start, het laatste altijd de finish. De ▲▼-knoppen zijn daarom uitgeschakeld voor deze twee punten. Plaats je punten handmatig, zet dan zelf een infopunt als eerste en een eindpunt als laatste — of gebruik de automatische generator hieronder, die dit voor je doet.

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
- **Aan** — een opgeraapt item komt na een instelbaar aantal minuten weer beschikbaar, met een nieuw willekeurig type. Daarnaast rouleren alle nog-niet-opgeraapte items elke periode automatisch van type, zodat het speelveld dynamisch blijft.

Stel het aantal minuten in via het invoerveld dat verschijnt zodra Respawn op "Aan" staat.

#### Punten automatisch genereren in cirkel

Wanneer de doelafstand is ingesteld, kun je punten automatisch laten plaatsen:

1. Stel de **doelafstand** in (bijv. 5 km).
2. Stel het **aantal punten** in (bijv. 9).
3. Klik op **🔄 Genereer punten in cirkel**.
4. Het systeem plaatst de punten in een gelijke cirkel rondom het middelpunt op de kaart.
5. Het **middelpunt** (⊕) is versleepbaar — sleep het naar de gewenste locatie en de ghost-voorvertoning past zich direct aan.
6. Sleep daarna elk punt afzonderlijk naar de exacte straat.

> Naast de cirkelpunten plaatst de generator automatisch een **🏠 Start hub** (infopunt, bovenaan de lijst) en een **🏁 Finish hub** (eindpunt, onderaan de lijst), allebei op het middelpunt. Sleep het middelpunt dus naar de plek waar je de teams wilt ontvangen en weer wilt opvangen.

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

Klik op **❓ Vraag toevoegen** en tik daarna op de kaart. Anders dan bij de andere speltypen:

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

1. Klik op **⭐ Item toevoegen** in de route-editor.
2. Klik op de kaart waar het item moet liggen.
3. Stel het **type**, **naam**, **radius** en (voor Ster/Bom) de **puntwaarde** in.
4. Items zijn zichtbaar op de kaart voor alle spelers zodra de route actief is — **behalve de Plek zooi, die is altijd onzichtbaar**.
5. De **legende** in de spelerapp toont automatisch alleen de itemtypen die je in de route hebt geplaatst.

#### Beschikbare itemtypen

| Item | Naam | Effect |
|---|---|---|
| ⭐ | Ster | Geeft het opraapteam direct bonuspunten |
| 🔴 | Verdubbeling | Volgende correct beantwoorde vraag van het opraapteam levert dubbele punten op |
| 👻 | Spook | Het volgende punt van het doelteam verdwijnt van de kaart (standaard 10 minuten); zij zien zolang een groot spook met aftelklok |
| 💣 | Bom | Trekt een ingesteld aantal punten af van het doelteam |
| 🔄 | Wissel | Wisselt de score van het opraapteam met die van het doelteam |
| 🦹 | Dief | Steelt de punten van de eerstvolgende correct beantwoorde vraag van het doelteam |
| 📡 | Radar | Onthult de exacte GPS-positie van alle teams gedurende 2 minuten |
| 🍌 | Banaan | Verwisselt het eerstvolgende onbezochte punt van het doelteam met een ander nog te bezoeken punt |
| ⛔ | Plek zooi | **Onzichtbaar voor spelers** — geen icoontje op de kaart. Als een speler de radius betreedt, verschijnt er een rood scherm met afteltimer. Kaart en voortgang zijn geblokkeerd tijdens de blokkade (standaard 5 minuten). De val blijft daarna liggen voor andere teams, maar raakt elk team maar één keer. |
| ❓ | Vraagteken | Geen doelteam — werkt direct op het opraapteam zelf én chaotisch op de rest. 40% dubbele ster, 20% ieder ander team krijgt willekeurig ster/bom, 10% jackpot (5× sterwaarde), 10% −200 punten, 20% bom op jezelf. |

> **Dief-effect**: als een team een Dief op een ander team zet, worden de punten van het eerstvolgende goede antwoord van dat team gestolen. Als het antwoord fout is, is het Dief-effect toch verbruikt.

> **Banaan-effect**: werkt alleen als het doelteam nog minimaal 2 onbezochte punten heeft. Bij minder punten geeft de app een foutmelding terug aan het aanvallende team.

> **"Aangeboden door"-melding**: bij alle aanvals-items (Spook, Bom, Wissel, Dief, Banaan) krijgt het doelteam binnen ongeveer 5 seconden een melding met de naam van het aanvallende team, met een klokslag (en trillen op Android; iPhones kunnen vanuit een webapp niet trillen). De melding blijft staan tot het team hem wegtikt.

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
4. De berichttekst is aanpasbaar via **✏️ Berichttekst** — opgeslagen per browser.

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

Klik dan op **🔓 Apparaat resetten** op de groepskaart. De koppeling wordt losgelaten en de groep kan direct opnieuw inloggen, met behoud van alle voortgang en punten.

> Dit is de meest voorkomende storing tijdens een spel. Als een team belt met "we kunnen niet meer inloggen", is dit vrijwel altijd de oplossing.

#### Een groep direct uitloggen

Klik op **🚪 Uitloggen** op de groepskaart om een groep meteen uit te loggen, ook als hun sessie op dit moment nog open staat. Binnen zo'n 20 seconden wordt de groep automatisch teruggestuurd naar het inlogscherm, met de melding "Je bent door de beheerder uitgelogd." Hun apparaatkoppeling wordt tegelijk losgelaten, zodat ze (of iemand anders) direct opnieuw kunnen inloggen.

Handig als je een groep bewust wilt onderbreken — bijvoorbeeld bij onsportief gedrag, een verkeerd uitgedeelde inlog, of om iedereen gelijktijdig opnieuw te laten starten.

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

- **Handmatig** — via **🏆 Toon tussenstand nu** in de zijbalk.
- **Automatisch** — via **⚙️ Instellingen** → "🏆 Tussenstand": stel een interval in minuten in (0 = uit) en hoe lang de stand zichtbaar blijft. Het interval telt vanaf de start van de eerste sessie.

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

## Leaderboard

Het leaderboard toont de eindrangschikking op basis van score. Bij gelijke score is de kortste speeltijd bepalend. Het leaderboard is ook zichtbaar voor spelers.

De tabel toont per team de **Teamnaam** (de naam die de groep zelf gekozen heeft; staat er "nog geen naam gekozen", dan heeft die groep nog niet op "Ga op pad" gedrukt), de score, speeltijd, afgelegde afstand en voortgang.

---

## Aandachtspunten

- **GPS-nauwkeurigheid** varieert per apparaat en locatie (bebouwing, bewolking). Stel de radius ruimer in op moeilijk te bereiken punten of in stedelijk gebied (50–80 m).
- **Speciale items** worden pas actief zodra de route actief is.
- **Radar**: een team dat Radar gebruikt, ziet 2 minuten lang de exacte GPS-posities van alle andere teams. Daarna keert de weergave terug naar de globale positie.
- **Verspreid-modus**: het eerste punt is de start hub en het laatste de finish hub — samen op één verzamelplek. Kies daarvoor een centrale plek waar alle teams goed kunnen samenkomen.
- **Aantal teams instellen**: stel het verwachte aantal teams in vóórdat je de route activeert. Dit bepaalt hoe de startpunten worden verdeeld.
- **Eén login per apparaat**: een groep kan niet gelijktijdig op twee apparaten ingelogd zijn — bij een tweede inlogpoging wordt die nieuwe poging geweigerd en blijft het eerste apparaat actief. Stuur de groep naar **Uitloggen** op het oude apparaat als ze willen wisselen, gebruik **🔓 Apparaat resetten** als dat niet meer lukt, of log de groep vanuit het adminpaneel zelf uit met **🚪 Uitloggen**.
- **Icoon kiezen**: elk team kiest bij het interscherm automatisch een nog vrij icoon; zodra alle iconen vergeven zijn mogen teams er eentje dubbel hebben.
- **Speltype ligt vast**: het speltype kies je bij het aanmaken van een route en is daarna niet meer te wijzigen. Twijfel je, maak dan twee routes aan.
- **Mist-modus vergt geen voorbereiding**: geen punten uitzetten, geen route bedenken. Alleen een startlocatie en eventueel wat vragen. Handig als je weinig tijd hebt om iets uit te zetten.
- **Mist stopt niet vanzelf**: spreek vooraf een eindtijd af met de teams, want alleen jij kunt het spel beëindigen.
