# Beheerdershandleiding — PointRush

## Overzicht

Als beheerder stel jij de routes in, maak je groepen aan, start je het spel en volg je de voortgang live. Alles gaat via het adminpaneel, bereikbaar op `/admin`.

---

## Voorbereiding

### 1. Route aanmaken

1. Ga naar **Routes** in de zijbalk.
2. Klik op **Nieuwe route**.
3. Geef de route een naam.
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

### 2. Routemodus kiezen

In de route-editor, boven de puntenlijst, staat een **Modus**-toggle:

| Modus | Omschrijving |
|---|---|
| **Sequentieel** | Alle groepen lopen de punten in dezelfde volgorde (standaard) |
| **Verspreid (lus)** | Elke groep start op een ander punt en loopt de route als een lus — iedereen legt dezelfde afstand af, maar in een andere volgorde |

#### Hoe werkt Verspreid?

De punten vormen samen een lus. Elke groep die start krijgt automatisch een ander beginpunt toegewezen. Groep 1 start bij punt 1, groep 2 bij punt 2, enzovoort. Iedereen loopt daarna door in dezelfde richting totdat alle punten bezocht zijn.

```
Route met 5 punten als lus:

        [2]
       /   \
     [1]   [3]
       \   /
        [5]-[4]

Groep A:  1 → 2 → 3 → 4 → 5        (start bij punt 1)
Groep B:  2 → 3 → 4 → 5 → 1        (start bij punt 2)
Groep C:  3 → 4 → 5 → 1 → 2        (start bij punt 3)

✓ Iedereen bezoekt alle 5 punten
✓ Niemand staat meteen op hetzelfde punt
✓ Iedereen loopt exact dezelfde afstand
```

> **Belangrijk:** Zorg dat de route geografisch als lus werkt — punt 5 en punt 1 moeten geografisch dicht bij elkaar liggen, anders moeten groepen die "omslaggen" een lange terugweg lopen.

> **Eindpunt:** Bij verspreid-modus is het eindpunt het *laatste punt dat een team bezoekt* (voor groep A is dat punt 5, voor groep B punt 1, enz.). De route is klaar zodra een groep alle punten heeft afgerond.

### 3. Speciale items plaatsen (optioneel)

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
| 👻 | Spook | Verbergt het huidige doelpunt van het doelteam 10 minuten |
| 💣 | Bom | Trekt een ingesteld aantal punten af van het doelteam |
| 🔄 | Wissel | Wisselt de score van het opraapteam met die van het doelteam |
| 🦹 | Dief | Steelt de punten van de eerstvolgende correct beantwoorde vraag van het doelteam |
| 📡 | Radar | Onthult de exacte GPS-positie van alle teams gedurende 2 minuten |
| 🍌 | Banaan | Verwisselt het eerstvolgende onbezochte punt van het doelteam met een ander nog te bezoeken punt |
| ⛔ | Plek zooi | **Onzichtbaar voor spelers** — geen icoontje op de kaart. Als een speler de radius betreedt, verschijnt er een rood scherm met afteltimer. De duur stel je in bij het item (in seconden). Kaart en voortgang zijn geblokkeerd tijdens de blokkade. |

> **Dief-effect**: als een team een Dief op een ander team zet, worden de punten van het eerstvolgende goede antwoord van dat team gestolen. Als het antwoord fout is, is het Dief-effect toch verbruikt.

> **Banaan-effect**: werkt alleen als het doelteam nog minimaal 2 onbezochte punten heeft. Bij minder punten geeft de app een foutmelding terug aan het aanvallende team.

> **"Aangeboden door"-melding**: bij alle aanvals-items (Spook, Bom, Wissel, Dief, Banaan) krijgt het doelteam een melding met de naam van het aanvallende team.

### 4. Groepen aanmaken

1. Ga naar **Groepen** in de zijbalk.
2. Klik op **Groep toevoegen** en vul de naam (en optioneel een bijnaam) in.
3. Elke groep krijgt een unieke inloglink. Deel die link met de betreffende groep via de **WhatsApp-knop** bovenaan de groepenlijst.
4. De berichttekst is aanpasbaar via **✏️ Berichttekst** — opgeslagen per browser.
5. Groepen hoeven geen wachtwoord in te voeren — de link is de toegang.

---

## Het spel starten

1. Ga naar de gewenste route en klik op **▶ Activeer**.
   - Er kan maar één route tegelijk actief zijn.
   - De route moet op "Gepubliceerd" staan voordat je hem kunt activeren.
2. Groepen kunnen nu via hun link inloggen en op **Start spel** drukken.
3. Bij een **verspreid**-route krijgt elke groep automatisch een uniek startpunt toegewezen op basis van het aanmelddvolgorde.

---

## Live volgen

Het **Dashboard** toont per groep:

| Kolom | Betekenis |
|---|---|
| Score | Huidig puntentotaal |
| Voortgang | Aantal bezochte punten / totaal |
| Gestart | Starttijd van de sessie |
| Huidig punt | Laatste punt dat de groep heeft bereikt |
| Speeltijd | Totale tijd (alleen zichtbaar na finish) |
| Laatste update | Hoe lang geleden de GPS-positie is bijgewerkt |

De **Live kaart** toont de actuele (globale) GPS-posities van alle groepen op de kaart.

Het dashboard ververst automatisch elke 15 seconden en via realtime-database-updates.

---

## Tijdens het spel

### Bericht sturen

Ga naar **Bericht sturen** om een notificatie naar alle actieve groepen te sturen. Handig voor aankondigingen of hints.

### Route stoppen

In de route-editor staat een **Stop route**-knop. Hiermee haal je de route uit de actieve stand zonder gegevens te wissen.

### Spel resetten

Op het dashboard staat onderaan **Spel resetten**. Dit wist:

- Alle actieve sessies
- Alle locatiegeschiedenis
- Alle voortgang en scores
- Alle geclaimde speciale items

Routes, routepunten, vragen en groepen blijven bewaard. Gebruik dit om opnieuw te beginnen met dezelfde opzet.

> Klik tweemaal (bevestiging vereist) om te voorkomen dat je per ongeluk reset.

---

## Leaderboard

Het leaderboard toont de eindrangschikking op basis van score. Bij gelijke score is de kortste speeltijd bepalend. Het leaderboard is ook zichtbaar voor spelers.

---

## Aandachtspunten

- **GPS-nauwkeurigheid** varieert per apparaat en locatie (bebouwing, bewolking). Stel de radius ruimer in op moeilijk te bereiken punten of in stedelijk gebied (50–80 m).
- **Speciale items** worden pas actief zodra de route actief is.
- **Radar**: een team dat Radar gebruikt, ziet 2 minuten lang de exacte GPS-posities van alle andere teams. Daarna keert de weergave terug naar de globale positie.
- **Verspreid-modus**: zorg dat het laatste punt en het eerste punt geografisch dicht bij elkaar liggen, zodat de lus logisch aanvoelt voor alle groepen.
