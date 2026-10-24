# Afbeelding-prompt — Verspreide route (lus)

Prompt voor **Codex**: maakt de instructiekaart voor het speltype **Verspreide route**, in dezelfde stijl
als de spelerskaart (`public/handleiding.jpg`), en vervangt de kaart in `public/kaarten/`. Maak eerst de
spelerskaart, dan deze: Codex neemt de stijl daarvan over. Gebaseerd op [spel-verspreid.md](spel-verspreid.md).

```
Maak een nieuwe printbare instructiekaart voor het speltype "Verspreide route" van de GPS-game PointRush en vervang daarmee de bestaande kaart in deze repo. Pas geen code aan.

STIJL: precies dezelfde stijl als de spelerskaart public/handleiding.jpg (achtergrond, panelen met gouden rand, letters, kleuren, oranje pillen en balk, sparkles). Gebruik public/logo-breed.png als logo (exact overnemen: niet hertekenen, niet herletteren, niet verkleuren) en de iconen uit public/items/<naam>.webp als voorbeeld voor items.

FORMAAT EN VOUWEN (belangrijk):
- Staand, verhouding 2:3 (1024x1536), voor A5.
- De kaart wordt dubbel gevouwen: precies op de helft van de hoogte een horizontale vouwlijn als dunne witte STIPPELLIJN over de hele breedte, rechts klein het woord "vouwlijn".
- GEEN paneel, tekst of icoon over de vouwlijn: alles volledig in de bovenste óf onderste helft, met minstens 3% ruimte boven en onder de lijn. Alles minstens 5% van de buitenrand af.

TAAL: alle tekst in het NEDERLANDS, exact zoals hieronder. Geen andere tekst toevoegen of vertalen. Gebruik nooit het woord "hub".

BOVENSTE HELFT:
1. Het logo, bovenaan in het midden.
2. Glanzende oranje pil: "VERSPREIDE ROUTE"
3. Paneel "Het idee" met een klein schema: een rondje van 6 genummerde punten, in het midden een vlag 🏁 (start en finish). Drie gekleurde team-pijlen gaan van het midden naar elk een ander punt op het rondje, ongeveer even lang. Onderschrift:
   "Iedereen start en finisht op dezelfde plek. Elk team begint op een ander punt van het rondje."
4. Paneel "Zo gaat het" (genummerd 1–4 in gouden rondjes):
   1 📷 Scan de QR-code op je kaartje
   2 🦊 Kies een teamnaam en een icoon
   3 🚀 Druk op "Op pad!"
   4 🟠 Loop 25 m langs de oranje stippellijn: dan krijg je je eerste vraag

ONDERSTE HELFT:
5. Paneel "Items". Eerst één regel: "Loop over een item om het te pakken. Tik onderin op het item om het te gebruiken."
   Daarna een raster van 2 kolommen × 5 rijen, in precies deze volgorde (rond icoon + vette naam + korte uitleg):
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
6. Paneel "Tips" (2 kolommen):
   👣 Loop niet achter een ander team aan: hun volgorde is anders
   🔄 Komen items terug? Dan loont nog een rondje
   🔔 Klokslag? Een ander team valt je aan!
   🧩 Puzzelwoord? Elke goede vraag = een letter
7. Onderaan een brede glanzende oranje balk met witte tekst: "PAK DE PUNTEN EN MAAK HET WOORD!"

Overzichtelijk en in een paar seconden te scannen: duidelijke hiërarchie, ruime marges, consequente ronde vormen, geen extra tekst.

NA HET MAKEN:
1. Sla het origineel op als "extra info/instructiekaart/verspreid.png".
2. Vervang public/kaarten/verspreid.webp (1024x1536, kwaliteit ±85, kleiner dan 600 KB).
3. Vervang public/kaarten/klein-verspreid.webp door een verkleinde versie met dezelfde afmetingen als het huidige bestand.
4. Meld welke bestanden zijn vervangen, met afmetingen en grootte.
```
