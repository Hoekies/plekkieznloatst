# Afbeelding-prompt — Spelerskaart (A5, dubbel te vouwen)

Prompt voor **Codex**: maakt de spelerskaart en vervangt `public/handleiding.jpg` en het voorbeeldje
`public/kaarten/klein-spelers.webp`. Maak deze als eerste: de routekaarten
([sequentieel](afbeelding-prompt-sequentieel.md), [verspreid](afbeelding-prompt-verspreid.md)) nemen de stijl ervan over.

Bijgewerkt op 28 oktober 2026 met de audit [audit-spelers-a5-2026-10-27.md](audit-spelers-a5-2026-10-27.md): echte
A5-verhouding, kortere en preciezere teksten (items, puzzel, foto, start), hoe je wint en wat te doen als iets niet lukt.

```
Maak een nieuwe printbare instructiekaart voor spelers van de GPS-game PointRush en vervang daarmee de bestaande kaart in deze repo. Pas geen code aan.

Basis: gebruik public/handleiding.jpg als voorbeeld voor stijl en sfeer, en public/logo-breed.png als logo (exact overnemen: niet hertekenen, niet herletteren, niet verkleuren).

FORMAAT EN VOUWEN (belangrijk):
- Staand, precies A5 (148 × 210 mm): 1748x2480 pixels (300 ppi). Geen 2:3 meer: dan kwamen er witte randen naast bij het printen.
- De kaart wordt dubbel gevouwen: precies op de helft van de hoogte loopt een horizontale vouwlijn als dunne witte STIPPELLIJN over de hele breedte, met rechts klein het woord "vouwlijn".
- GEEN enkel paneel, tekst of icoon mag over de vouwlijn lopen: alles staat volledig in de bovenste óf de onderste helft, met minstens 3% ruimte boven en onder de lijn.
- Alles minstens 5% van de buitenrand af.

STIJL: donkere nachthemel-achtergrond van paars (#3a1a73) bovenaan naar heel donker violet (#0c0322) onderaan, kleine gouden sparkles. Inhoud op afgeronde donkerpaarse glazen panelen met een dunne gouden rand (#ffd93b). Koppen in dikke, ronde game-letters (wit); tekst licht lavendel-wit. Accenten: glanzend oranje (#ff8a00 → #e35d00), goud, paars, cyaan, groen. Vrolijk arcade-gevoel, platte vector-illustratie, geen gezichten van mensen.

TAAL: alle tekst in het NEDERLANDS, exact zoals hieronder. Geen andere tekst toevoegen of vertalen.

LEESBAARHEID: de tekst moet op een A5-afdruk zonder zoomen te lezen zijn (bodytekst ongeveer 10–11 pt). Maak het logo,
de ruimte bovenin en de balk onderaan liever wat kleiner dan de tekst.

BOVENSTE HELFT:
1. Het logo, bovenaan in het midden.
2. Daaronder een glanzende oranje pil met: "ZO SPEEL JE!"
   Eén regel eronder: "Beantwoord vragen en verzamel punten. Het team met de meeste punten wint."
3. Twee panelen naast elkaar:
   Paneel "In 4 stappen op pad" (genummerde stappen 1–4 in gouden rondjes):
   1 📷 Scan de QR-code op je kaartje
   2 🦊 Kies een teamnaam en een icoon
   3 📍 Tik op "OK, begrepen" en sta je locatie toe
   4 🚶 Volg de startuitleg en loop naar het eerste punt
   Paneel "Op de kaart":
   🔵 Blauw punt = hier moet je heen
   🟠 Start: loop het stukje langs de oranje stippellijn
   ❗ Oranje ! = je bent er: beantwoord de vraag
   ✅ Groen = punt gehaald
   🧭 Tik op de afstand: de pijl draait mee
   ❓ Oranje ?-knop = uitleg van alles

ONDERSTE HELFT:
4. Paneel "Items" (het grootste paneel). Eerst één regel:
   "Loop langs items om ze te pakken. Ster en vraagteken werken meteen; andere items gebruik je via de balk onderin. Sommige items krijg je bij de start."
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
   Plek zooi — onzichtbare val op de kaart: even stilstaan
5. Paneel "Tips" (2 kolommen):
   🧩 Puzzel aan? Goede antwoorden kunnen letters opleveren
   ⏱️ Nog letters over? Tik bij de finish op Start: 1 minuut, één poging
   📸 Foto-opdracht bij de finish? Na goedkeuring staat jullie foto bij de uitslag
   🔔 Klokslag? Een ander team valt je aan!
   ⚠️ Punt niet te bereiken? Tik op "Niet bereikbaar?"
   📡 Vraag niet geladen? Probeer opnieuw bij bereik of vraag de organisatie
6. Onderaan een brede glanzende oranje balk met witte tekst: "PAK DE PUNTEN!"

Overzichtelijk en in een paar seconden te scannen: duidelijke hiërarchie, ruime marges, consequente ronde vormen, geen extra tekst.

NA HET MAKEN:
1. Sla het origineel op als "extra info/instructiekaart/instructiekaart.png".
2. Vervang public/handleiding.jpg door deze kaart (JPG, 1748x2480, kwaliteit ±85, kleiner dan 900 KB).
3. Vervang public/kaarten/klein-spelers.webp door een verkleinde versie, met dezelfde afmetingen als het huidige bestand.
4. Meld welke bestanden zijn gemaakt en vervangen, met hun afmetingen en grootte.
```
