<p align="center">
  <img src="public/logo-breed.png" alt="PointRush by Hoekies" width="620">
</p>

<p align="center"><strong>Loop de route. Pak de punten. Saboteer je vrienden.</strong></p>

PointRush is een GPS-gebaseerd buiten-spel voor teams. Teams lopen een route langs geocoördinaten, beantwoorden vragen op locatie en proberen elkaar te saboteren met speciale items. Beheer van routes, spelers en live-voortgang gaat via een ingebouwd beheer, op de computer en de telefoon.

---

## Functies

### Voor spelers
- GPS-navigatie naar opeenvolgende route-punten, met stippellijn naar het actieve punt zodra dat zichtbaar wordt
- Vragen op locatie (meerkeuze, open antwoord, foto-opdracht)
- Speciale items oppakken en inzetten op andere teams
- Andere teams alleen zichtbaar met een radar
- Teamnaam en icoon kiezen
- Als app te installeren (volledig scherm), met uitleg voor Android en iPhone
- Melding als de organisatie een punt vrijgeeft of het spel stopt

### Voor beheerders
- Routes aanmaken met punten, vragen en speciale items
- **Sequentieel** of **Verspreid (lus)** modus per route
- Verspreid-modus: automatische puntgenerator in cirkelpatroon, met versleepbaar middelpunt en ghost-voorvertoning
- Teams starten verspreid over de route, met ongeveer gelijke aanloop vanaf de startplek
- Spelers aanmaken, in-/uitschakelen, verwijderen en inloggegevens beheren; inloggegevens versturen via WhatsApp
- Een speler direct uitloggen of het gekoppelde apparaat resetten
- Dashboard met stappenplan, spelleider (wat vraagt aandacht), stand, tijdlijn en details per speler
- Live kaart met vaste kleur per speler, speler volgen en spoor van de laatste 10 minuten
- Wachttijd van spook of plek zooi inkorten, punt vrijgeven, spel per speler stoppen
- Pushmeldingen bij een nieuwe foto of hulpvraag (ook op een horloge)
- Berichten naar alle teams, tussenstand, uitslag vrijgeven en spelrapport als PDF
- Voorproefje van een route op één A4 (zonder antwoorden)
- Meerdere spelers tegelijk aanmaken; inloggegevens per team via WhatsApp of als printbare inlogkaartjes
- Testronde in de route-editor; punten toevoegen of verwijderen tijdens een lopend spel; wijzigingen naar spelers sturen
- Foto's één voor één keuren, ook vanuit de pushmelding
- Routes exporteren, importeren en kopiëren; versienummer en laatste update in het menu
- Punten importeren uit een GPX/KML-bestand, een lijst met coördinaten of Google Maps-links
- Vragenbank: een vraag uit een andere route overnemen in de vraag-editor, op soort, met favorieten
- Punten handmatig aanpassen per team (bonus of aftrek met reden, in tijdlijn en rapport)
- Eindtijd van het spel: spelers zien een aftelklok en een waarschuwing 10 minuten van tevoren
- Helpers: een tweede, beperkte inlog die alleen meekijkt, foto's keurt en punten vrijgeeft
- Statistiek per vraag: hoeveel teams een vraag goed hadden en welke foute antwoorden vaak voorkwamen

### Speciale items
Bij **Sequentieel** liggen alleen Plek zooi-vallen op de kaart en krijgt elk team bij de start één Banaan.

| Item | Effect |
|---|---|
| ⭐ Ster | Geeft direct bonuspunten |
| 🔴 Verdubbeling | Volgende vraag met pluspunten levert dubbele punten op (minpunten nooit) |
| 👻 Spook | Verbergt het doelpunt van een team 10 minuten |
| 💣 Bom | Trekt punten af van een doelteam |
| 🔄 Wissel | Wisselt scores met een doelteam |
| 🦹 Dief | Steelt meteen de punten van een goede vraag van een doelteam |
| 📡 Radar | Onthult exacte GPS-posities van alle teams voor 2 minuten |
| 🍌 Banaan | Het volgende punt van een tegenstander ruilt van plek met het punt daarna (nooit start of eindpunt) |
| ⛔ Plek zooi | Onzichtbare val — blokkeert kaart en voortgang bij betreden |

---

## Tech stack

| Laag | Technologie |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database & Auth | Supabase (PostgreSQL + realtime) |
| Kaart | Leaflet.js |
| Hosting | Vercel |
| Stijl | CSS custom properties, Space Grotesk |

---

## Lokaal draaien

### Vereisten
- Node.js 18+
- Een Supabase-project

### Installatie

```bash
git clone https://github.com/Hoekies/plekkieznloatst.git
cd plekkieznloatst
npm install
```

### Omgevingsvariabelen

Maak een `.env.local` aan in de root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
SUPABASE_SERVICE_ROLE_KEY=jouw-service-role-key
```

### Database

Voor een **nieuw, leeg** Supabase-project: voer `supabase/migrations/001_schema.sql` in één keer uit in de Supabase SQL Editor. Dat bestand bevat het volledige schema (de samengevoegde migraties 001–038). Bovenin staat wat je daarna nog in het dashboard moet doen (storage-buckets en de beheerder).

De bestaande database heeft dit al. Nieuwe wijzigingen komen als `002_…`, `003_…` enz. in dezelfde map; de oude losse migraties staan in de git-geschiedenis. Draai ze op volgorde in de SQL Editor; ze mogen vaker gedraaid worden. `006_correcties_en_eindtijd.sql` is nodig voor punten aanpassen en de eindtijd, `007_vragenbank.sql` voor favorieten in de vragenbank.

### Starten

```bash
npm run dev
```

De app draait op [http://localhost:3000](http://localhost:3000).

### Admin-account aanmaken

Maak een gebruiker aan in Supabase Authentication en zet in `app_metadata`:

```json
{ "rol": "admin" }
```

---

## Projectstructuur

```
app/
  admin/          → Beheer (routes, spelers, dashboard, live)
  speler/         → Spelersapp (kaart, vragen, finish)
  api/            → API-routes (Next.js Route Handlers)
  login/          → Inlogpagina
components/
  admin/          → Admin-componenten (RouteEditorShell, LeafletKaart, …)
  speler/         → Speler-componenten (SpelerKaart, VraagPopup, …)
lib/              → Supabase-clients, geo-utilities
types/            → TypeScript interfaces (database.ts)
supabase/
  migrations/     → SQL-migraties
docs/             → Beheerdershandleiding, spelersinstructies
```

---

## Documentatie

- [Beheerdershandleiding](docs/beheerdershandleiding.md)
- [Spelersinstructies](docs/spelersinstructies.md)
- Speluitleg per speltype: [Sequentieel](docs/spel-sequentieel.md) · [Verspreid](docs/spel-verspreid.md)
- Technisch ontwerp: [technisch-ontwerp.md](docs/technisch-ontwerp.md)

### Afbeelding-handleidingen genereren

Voor elke speluitleg hierboven, plus de beheerdershandleiding, staat een kant-en-klare
ChatGPT-prompt om er een geïllustreerde posterhandleiding van te laten maken:
[Sequentieel](docs/afbeelding-prompt-sequentieel.md) · [Verspreid](docs/afbeelding-prompt-verspreid.md) · [Admin](docs/afbeelding-prompt-admin.md).
Plak de codeblok uit zo'n bestand in ChatGPT (met beeldgeneratie) om de afbeelding te maken.
Voor een korte, printbare spelershandleiding op A5 met het logo: [spelers-a5](docs/afbeelding-prompt-spelers-a5.md).

---

## Licentie

Privéproject — [Hoekies](https://hoekies.nl) 2026
