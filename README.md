# PointRush

> Loop de route. Pak de punten. Saboteer je vrienden.

PointRush is een GPS-gebaseerd buiten-spel voor groepen. Teams lopen een route langs geocoördinaten, beantwoorden vragen op locatie en proberen elkaar te saboteren met speciale items. Beheer van routes, groepen en live-voortgang gaat via een ingebouwd adminpaneel.

---

## Functies

### Voor spelers
- GPS-navigatie naar opeenvolgende route-punten
- Vragen op locatie (meerkeuze, open antwoord, foto-opdracht)
- Speciale items oppakken en inzetten op andere teams
- Live kaart met globale posities van medespelers
- Alias en icoon instellen voor herkenning

### Voor beheerders
- Routes aanmaken met punten, vragen en speciale items
- **Sequentieel** of **Verspreid (lus)** modus per route
- Verspreid-modus: automatische puntgenerator in cirkelpatroon, met versleepbaar middelpunt en ghost-voorvertoning
- Teams starten gelijkmatig verspreid over de route op basis van GPS-afstand
- Groepen aanmaken, in-/uitschakelen en inloggegevens beheren
- Live dashboard met score, voortgang en GPS per team
- Broadcast-berichten sturen naar alle actieve teams
- Leaderboard na afloop

### Speciale items
| Item | Effect |
|---|---|
| ⭐ Ster | Geeft direct bonuspunten |
| 🔴 Verdubbeling | Volgende correct antwoord levert dubbele punten op |
| 👻 Spook | Verbergt het doelpunt van een team 10 minuten |
| 💣 Bom | Trekt punten af van een doelteam |
| 🔄 Wissel | Wisselt scores met een doelteam |
| 🦹 Dief | Steelt punten van de volgende correcte vraag van een doelteam |
| 📡 Radar | Onthult exacte GPS-posities van alle teams voor 2 minuten |
| 🍌 Banaan | Verwisselt het eerstvolgende punt van een doelteam met een ander punt |
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

Voer de migraties uit in de Supabase SQL Editor (in volgorde):

```
supabase/migrations/001_schema.sql
supabase/migrations/002_rls.sql
supabase/migrations/003_extra_features.sql
supabase/migrations/004_special_items.sql
supabase/migrations/005_dief_radar.sql
supabase/migrations/007_verspreid_banaan.sql
supabase/migrations/008_landmijn.sql
supabase/migrations/009_rls_fixes.sql
supabase/migrations/010_verspreid_teams.sql
supabase/migrations/011_speler_uitgeschakeld.sql
```

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
  admin/          → Adminpaneel (routes, groepen, dashboard, live)
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

---

## Licentie

Privéproject — [Hoekies](https://hoekies.nl) 2026
