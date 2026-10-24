# Afbeelding-prompt — Route op volgorde (Sequentieel)

Prompt voor **Codex**: maakt de instructiekaart voor het speltype **Route op volgorde**, in dezelfde stijl
als de spelerskaart (`public/handleiding.jpg`), en vervangt de kaart in `public/kaarten/`. Maak eerst de
spelerskaart, dan deze: Codex neemt de stijl daarvan over. Gebaseerd op [spel-sequentieel.md](spel-sequentieel.md).

```
Maak een nieuwe printbare instructiekaart voor het speltype "Route op volgorde" van de GPS-game PointRush en vervang daarmee de bestaande kaart in deze repo. Pas geen code aan.

STIJL: precies dezelfde stijl als de spelerskaart public/handleiding.jpg (achtergrond, panelen met gouden rand, letters, kleuren, oranje pillen en balk, sparkles). Gebruik public/logo-breed.png als logo (exact overnemen: niet hertekenen, niet herletteren, niet verkleuren) en de iconen uit public/items/<naam>.webp als voorbeeld voor items.

FORMAAT EN VOUWEN (belangrijk):
- Staand, verhouding 2:3 (1024x1536), voor A5.
- De kaart wordt dubbel gevouwen: precies op de helft van de hoogte een horizontale vouwlijn als dunne witte STIPPELLIJN over de hele breedte, rechts klein het woord "vouwlijn".
- GEEN paneel, tekst of icoon over de vouwlijn: alles volledig in de bovenste óf onderste helft, met minstens 3% ruimte boven en onder de lijn. Alles minstens 5% van de buitenrand af.

TAAL: alle tekst in het NEDERLANDS, exact zoals hieronder. Geen andere tekst toevoegen of vertalen.

BOVENSTE HELFT:
1. Het logo, bovenaan in het midden.
2. Glanzende oranje pil: "ROUTE OP VOLGORDE"
3. Eén korte regel eronder: "Loop de punten één voor één af. Wie de meeste punten haalt, wint."
4. Twee panelen naast elkaar:
   Paneel "Zo gaat het" (genummerd 1–4 in gouden rondjes):
   1 📷 Scan de QR-code op je kaartje
   2 🦊 Kies een teamnaam en een icoon
   3 🚀 Druk op "Op pad!"
   4 📍 Loop naar het blauwe punt: daar krijg je een vraag
   Paneel "Op de kaart":
   🔵 Blauw punt = hier moet je heen
   ❗ Oranje ! = je bent er: beantwoord de vraag
   ✅ Groen = punt gehaald
   👀 Pas na dit punt zie je het volgende
   🏁 Vlag = de finish

ONDERSTE HELFT:
5. Paneel "Items" met twee grote kaartjes naast elkaar:
   🍌 Banaan — "Je start met een banaan. Gooi hem naar een ander team: hun volgende twee punten ruilen. Zij lopen dus om."
   ⛔ Plek zooi — "Een onzichtbare val op de route. Loop je erin, dan sta je even stil."
   Eronder klein: "De organisatie kan andere startitems kiezen. Tik onderin op een item om het te gebruiken."
6. Paneel "Tips":
   💡 Bewaar je banaan voor het juiste moment
   🎯 Gooi hem naar een team dat bijna bij een punt is
   🔔 Klokslag? Een ander team valt je aan!
   🧩 Puzzelwoord? Elke goede vraag = een letter
7. Onderaan een brede glanzende oranje balk met witte tekst: "PAK DE PUNTEN EN MAAK HET WOORD!"

Overzichtelijk en in een paar seconden te scannen: duidelijke hiërarchie, ruime marges, consequente ronde vormen, geen extra tekst.

NA HET MAKEN:
1. Sla het origineel op als "extra info/instructiekaart/route-op-volgorde.png".
2. Vervang public/kaarten/route-op-volgorde.webp (1024x1536, kwaliteit ±85, kleiner dan 600 KB).
3. Vervang public/kaarten/klein-route-op-volgorde.webp door een verkleinde versie met dezelfde afmetingen als het huidige bestand.
4. Meld welke bestanden zijn vervangen, met afmetingen en grootte.
```
