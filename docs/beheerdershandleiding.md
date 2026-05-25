# Beheerdershandleiding — Plekkie z'n Loatst

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

### 2. Speciale items plaatsen (optioneel)

1. Klik op **⭐ Item toevoegen** in de route-editor.
2. Klik op de kaart waar het item moet liggen.
3. Stel het type, naam, radius en (voor Ster/Bom) de puntwaarde in.
4. Items zijn zichtbaar op de kaart voor alle spelers zodra de route actief is.

### 3. Groepen aanmaken

1. Ga naar **Groepen** in de zijbalk.
2. Klik op **Groep toevoegen** en vul de naam (en optioneel een bijnaam) in.
3. Elke groep krijgt een unieke inloglink. Deel die link met de betreffende groep (kopieer of stuur via WhatsApp met de deel-knop).
4. Groepen hoeven geen wachtwoord in te voeren — de link is de toegang.

---

## Het spel starten

1. Ga naar de gewenste route en klik op **▶ Activeer**.
   - Er kan maar één route tegelijk actief zijn.
   - De route moet op "Gepubliceerd" staan voordat je hem kunt activeren.
2. Groepen kunnen nu via hun link inloggen en op **Start spel** drukken.

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
- **Dief-effect**: als een team een Dief op een ander team zet, worden de punten van het eerstvolgende goede antwoord van dat team gestolen. Als het antwoord fout is, is het Dief-effect toch verbruikt.
- **Radar**: een team dat Radar gebruikt, ziet 2 minuten lang de exacte GPS-posities van alle andere teams. Daarna keert de weergave terug naar de globale positie.
