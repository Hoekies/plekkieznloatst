# Afbeelding-prompt — Spelerskaart (A5, dubbel te vouwen)

Prompt voor **Codex**: maakt de spelerskaart en vervangt `public/handleiding.jpg` en het voorbeeldje
`public/kaarten/klein-spelers.webp`. Maak deze als eerste: de routekaarten
([sequentieel](afbeelding-prompt-sequentieel.md), [verspreid](afbeelding-prompt-verspreid.md)) nemen de stijl ervan over.

```
Maak een nieuwe printbare instructiekaart voor spelers van de GPS-game PointRush en vervang daarmee de bestaande kaart in deze repo. Pas geen code aan.

Basis: gebruik public/handleiding.jpg als voorbeeld voor stijl en sfeer, en public/logo-breed.png als logo (exact overnemen: niet hertekenen, niet herletteren, niet verkleuren).

FORMAAT EN VOUWEN (belangrijk):
- Staand, verhouding 2:3 (1024x1536), bedoeld voor A5.
- De kaart wordt dubbel gevouwen: precies op de helft van de hoogte loopt een horizontale vouwlijn als dunne witte STIPPELLIJN over de hele breedte, met rechts klein het woord "vouwlijn".
- GEEN enkel paneel, tekst of icoon mag over de vouwlijn lopen: alles staat volledig in de bovenste óf de onderste helft, met minstens 3% ruimte boven en onder de lijn.
- Alles minstens 5% van de buitenrand af.

STIJL: donkere nachthemel-achtergrond van paars (#3a1a73) bovenaan naar heel donker violet (#0c0322) onderaan, kleine gouden sparkles. Inhoud op afgeronde donkerpaarse glazen panelen met een dunne gouden rand (#ffd93b). Koppen in dikke, ronde game-letters (wit); tekst licht lavendel-wit. Accenten: glanzend oranje (#ff8a00 → #e35d00), goud, paars, cyaan, groen. Vrolijk arcade-gevoel, platte vector-illustratie, geen gezichten van mensen.

TAAL: alle tekst in het NEDERLANDS, exact zoals hieronder. Geen andere tekst toevoegen of vertalen.

BOVENSTE HELFT:
1. Het logo, bovenaan in het midden.
2. Daaronder een glanzende oranje pil met: "ZO SPEEL JE!"
3. Twee panelen naast elkaar:
   Paneel "In 4 stappen op pad" (genummerde stappen 1–4 in gouden rondjes):
   1 📷 Scan de QR-code op je kaartje: je bent meteen ingelogd
   2 🦊 Kies een teamnaam en een icoon
   3 📍 Zet locatie en geluid aan
   4 🚀 Druk op "Op pad!"
   Paneel "Op de kaart":
   🔵 Blauw punt = hier moet je heen
   🟠 Start: loop het stukje langs de oranje stippellijn
   ❗ Oranje ! = je bent er: beantwoord de vraag
   ✅ Groen = punt gehaald
   🧭 Tik op de afstand: de pijl draait mee
   ❓ Oranje ?-knop = uitleg van alles

ONDERSTE HELFT:
4. Paneel "Items" (het grootste paneel). Eerst één regel:
   "Loop over een item om het te pakken. Tik onderin op het item om het te gebruiken."
   Daarna een raster van 2 kolommen × 5 rijen, in precies deze volgorde. Elk item: een rond glanzend icoon (gebruik de iconen uit public/items/<naam>.webp als voorbeeld) + vetgedrukte naam + korte uitleg:
   Ster — meteen punten erbij
   Verdubbeling — volgende goede antwoord telt dubbel
   Radar — 2 minuten de andere teams zien
   Bom — ander team verliest punten
   Spook — hun volgende punt verdwijnt even
   Dief — pik punten van een ander team
   Banaan — hun volgende twee punten ruilen
   Wissel — ruil je score met een ander team
   Vraagteken — een gok: punten erbij of eraf
   Plek zooi — onzichtbare val: even stilstaan
5. Paneel "Tips" (2 kolommen):
   🧩 Puzzelwoord: elke goede vraag = een letter
   ⏱️ Bij de finish: tik Start en raad het woord in 1 minuut
   📸 Finish: groepsfoto of selfie = jullie foto op het podium
   🔔 Klokslag? Een ander team valt je aan!
   ⚠️ Punt niet te bereiken? Tik op "Niet bereikbaar?"
   🔴 Rood puntenvlak = jullie staan in de min
6. Onderaan een brede glanzende oranje balk met witte tekst: "PAK DE PUNTEN EN MAAK HET WOORD!"

Overzichtelijk en in een paar seconden te scannen: duidelijke hiërarchie, ruime marges, consequente ronde vormen, geen extra tekst.

NA HET MAKEN:
1. Sla het origineel op als "extra info/instructiekaart/instructiekaart.png".
2. Vervang public/handleiding.jpg door deze kaart (JPG, 1024x1536, kwaliteit ±85, kleiner dan 600 KB).
3. Vervang public/kaarten/klein-spelers.webp door een verkleinde versie, met dezelfde afmetingen als het huidige bestand.
4. Meld welke bestanden zijn gemaakt en vervangen, met hun afmetingen en grootte.
```
