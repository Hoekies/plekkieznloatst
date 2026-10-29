# Technisch ontwerp — Plekkie z'n Loatst

## 1. Architectuuroverzicht

### Doel
Een Nederlandstalige PWA voor een route-gebaseerd quizspel op een kaart. Teams lopen een route langs GPS-waypoints. Bij elk punt verschijnt een vraag. Scores worden live bijgehouden op een leaderboard.

### Twee interfaces
| Interface | Doelgroep | Apparaat |
|---|---|---|
| Beheerder-app | Spelleider | Desktop |
| Speler-app | Deelnemende teams | Mobiel |

### Stack
| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 14 (App Router) |
| Taal | TypeScript |
| UI | React |
| Kaart | Leaflet.js + OpenStreetMap (geen API-key) |
| Database + Auth | Supabase |
| Realtime | Supabase Realtime channels |
| Opslag bestanden | Supabase Storage |
| Hosting | Vercel |

### Overige keuzes
- Geen dark mode
- Geen offline vereiste — wel melding bij geen internet
- Kaarttegels niet offline beschikbaar
- PWA installeerbaar op mobiel
- Alles Nederlandstalig

---

## 2. Mappenstructuur

Op hoofdlijnen (niet elk bestand):

```
plekkie-zn-loatst/
├── app/
│   ├── layout.tsx, page.tsx          → root layout; redirect op rol (admin/speler)
│   ├── login/, l/[code]/, auth/      → inloggen, inloglink, Supabase-callback
│   ├── gedeeld/[id]/                 → gedeeld teamverslag (zonder inloggen)
│   ├── admin/                        → dashboard, routes (+ editor, punt/vraag, voorproefje), groepen,
│   │                                   antwoorden, live, rapport, kaartjes, leaderboard, uitleg, seizoenen, systeem
│   ├── speler/                       → intro, kaart, finish, terugkijk, qr
│   ├── spellogo/[bestand]/           → spellogo van vandaag (seizoenslogo of het gewone), overal i.p.v. /logo.webp
│   └── api/
│       ├── admin/                    → beheer: routes, punten, items, groepen, live, broadcast, pauze, …
│       ├── auth/                     → inloggen, uitloggen, apparaatcheck
│       └── speler/                   → sessie, voortgang, vraag, items, locatie(s), berichten, hulp, …
│           └── status/               → alles wat de app elke 4 s nodig heeft in één verzoek
├── components/
│   ├── admin/                        → dashboard, RouteEditorShell, LeafletKaart, GroepenBeheer, …
│   │   └── editor/                   → EersteStappen, ControleVenster, TestRonde, Vragenbank, …
│   ├── speler/                       → SpelerKaart, SpelerLeaflet, VraagPopup, FinishScherm, …
│   └── shared/                       → Venster (venster, kop, Esc), KaartStijlKnoppen, GeenInternet, …
├── lib/
│   ├── supabase-*.ts                 → Supabase clients (browser, server, service role)
│   ├── auth-server.ts, middleware-merk.ts → ingelogde gebruiker (vertrouwt de middleware-headers);
│   │                                   isAdmin / isBeheer voor elke rolcheck
│   ├── speler-sessie.ts              → haalSpeler / haalSpelerSessie: de speler (en zijn spel) voor pagina's en API's
│   ├── stand.ts                      → stand en tussenstand (leaderboard, finish, tussenstand)
│   ├── delen.ts                      → afbeelding maken, downloaden of delen (oorkonde, kaartje, uitslag)
│   ├── basiskaart.ts                 → vectorkaart (OpenFreeMap), luchtfoto (PDOK / Esri), Leaflet-css en -iconen
│   ├── geo.ts, tijd.ts               → afstand, richting, tijd- en duurteksten
│   ├── fout-uitleg.ts                → foutmelding met oorzaak + oplossing (op statuscode)
│   └── …                             → items, eindtijd, push, wegen, tijd-schatting, tril, …
├── types/database.ts                 → TypeScript types van het schema
├── styles/globals.css
├── public/
│   ├── items/, kaarten/              → itemiconen, speluitleg-afbeeldingen
│   ├── leaflet/1.9.4/, maplibre/     → kaartstijlen en MapLibre-worker (zelf meegeleverd, geen CDN)
│   └── sw.js, manifest.webmanifest   → PWA
├── supabase/migrations/              → 001 … 022 (nieuwe tabellen: altijd expliciete GRANTs)
├── middleware.ts                     → sessiecheck, rollen, gebruiker doorgeven in headers
└── next.config.mjs                   → CSP en cache-headers
```

---

## 3. Datamodel

### Tabellen

#### `routes`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| name | text | |
| status | text | `concept` / `gepubliceerd` (in beeld: Concept / Klaar) |
| is_active | boolean | Max. 1 route actief tegelijk (constraint) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `route_points`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| route_id | uuid FK → routes | |
| order_index | integer | Volgorde |
| type | text | `vraagpunt` / `informatiepunt` / `eindpunt` / `doorlooppunt` (geen scherm, migratie 013) |
| name | text | |
| description | text | |
| latitude | float8 | |
| longitude | float8 | |
| radius_meters | integer | Standaard 10 |
| points | integer | Te verdienen punten |
| image_path | text | Supabase Storage path |
| sound_path | text | Supabase Storage path |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `questions`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| route_point_id | uuid FK → route_points | |
| type | text | `meerkeuze_tekst` / `meerkeuze_afbeelding` / `open` |
| question_text | text | |
| question_image_path | text | Optioneel, Supabase Storage |
| points | integer | |
| correct_text_answers | text[] | Open vragen: lijst correcte antwoorden |
| numeric_answer | float8 | Optioneel, voor numerieke open vragen |
| numeric_tolerance | float8 | Optioneel, marge boven/onder |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `answer_options`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| question_id | uuid FK → questions | |
| order_index | integer | |
| color | text | `geel` / `blauw` / `rood` |
| answer_type | text | `tekst` / `afbeelding` |
| text | text | |
| image_path | text | Supabase Storage path |
| is_correct | boolean | Exact 1 correct per vraag |

#### `players`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| group_name | text | Verouderd: wordt niet meer getoond (teams kiezen zelf een teamnaam, `nickname`) |
| auth_user_id | uuid FK → auth.users | |
| active_device_id | text | Browser-gegenereerde device ID |
| created_at | timestamptz | |

#### `player_sessions`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| player_id | uuid FK → players | |
| route_id | uuid FK → routes | |
| started_at | timestamptz | |
| finished_at | timestamptz | Null tot finish |
| current_point_id | uuid FK → route_points | Huidig actief punt |
| score | integer | |
| status | text | `actief` / `voltooid` / `vervallen` |

#### `player_point_progress`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → player_sessions | |
| route_point_id | uuid FK → route_points | |
| reached_at | timestamptz | |
| answered_at | timestamptz | |
| selected_answer_id | uuid FK → answer_options | Null bij open vragen |
| open_answer_text | text | Null bij meerkeuzevragen |
| is_correct | boolean | |
| points_awarded | integer | |

#### `score_correcties` (migratie 006)
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → player_sessions | Cascade bij verwijderen |
| delta | integer | Bonus (+) of aftrek (−); de score mag onder 0 (migratie 021) |
| reden | text | Komt in de tijdlijn en het rapport |
| created_at | timestamptz | |

`routes.eindtijd` (timestamptz, migratie 006): is die voorbij, dan zet `lib/eindtijd.ts` alle actieve sessies van de route op `voltooid` met `finished_at = eindtijd` (aangeroepen door de spelers-app, het verwerken van antwoorden en het dashboard).

#### `location_updates`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → player_sessions | |
| latitude | float8 | Exacte positie (alleen admin) |
| longitude | float8 | Exacte positie (alleen admin) |
| accuracy_meters | float8 | |
| public_latitude | float8 | Afgerond ~50m (voor andere spelers) |
| public_longitude | float8 | Afgerond ~50m (voor andere spelers) |
| created_at | timestamptz | |

Ouder dan 30 dagen: elke nacht verwijderd (pg_cron-job `pointrush-opruimen`, migratie 015), of met de knop in de Systeemcheck. De speler stuurt een plek bij 10 m verplaatsing (ver van elk open punt: 25 m, max. elke 10 s) en anders hooguit een levensteken per minuut.

#### `bonus_vragen` en `bonus_antwoorden` (nieuwe migratie 004)
⚡ Bonusvraag per route: vraag, soort (`meerkeuze` | `foto`), keuzes (jsonb) en `goed_index`, punten, `na_minuten` (null = alleen met de knop), `duur_seconden`, `gestart_op` en `aantal_teams` (vastgelegd bij de start). Antwoorden: één per team (`UNIQUE (bonus_id, session_id)`), met keuze of `foto_pad` (opslag `foto-inzendingen`, map van de sessie) en `foto_status`. Punten: `lib/bonus.ts` (`bonusPunten`: max × (n − plek + 1) / n). Starten: de spelers-app vraagt elke 6 s `GET /api/speler/bonus`; die start vragen waarvan de tijd om is (voorwaardelijke update op `gestart_op IS NULL`). Foto's: na elke keuring herrekent `herrekenFotoBonus` alle goedgekeurde foto's op volgorde van insturen en boekt alleen het verschil. Alleen de service role (RLS aan, GRANT aan `service_role`).

#### 🎉 Spelplezier deel 2 (nieuwe migratie 009)
Nieuw item- en effecttype `schaduw` (locaties verbergt het team, ook bij radar, en start geen duel). Sessies: `jokers_5050`, `jokers_over`, `km_beloond` (voorwaardelijke updates op het oude aantal). Tabellen `bezwaren` (uniek per sessie en punt; `/api/speler/bezwaar`, `/api/admin/bezwaar`) en `chat_berichten` (`/api/speler/chat`, `/api/admin/chat`); open bezwaren en ongelezen chats komen mee in `haalLiveData`. Statistieken: `lib/statistieken.ts`. Vragenpakketten: `lib/vragenpakketten.ts` (alleen in de code). In de maak (nog verborgen): fotopuzzel, sleutelpunten (`route_points.sleutel_punt_id`) en de vraagsoorten anagram, volgorde en kaartvraag (`questions.kaart_*`, `player_point_progress.antwoord_extra`, `lib/vraag-soorten.ts`).

#### ⚙️ Instellingen spelplezier (nieuwe migratie 008)
`routes.spelplezier` (jsonb) met per onderdeel de instellingen; `normaliseerPlezier` in `lib/spelplezier.ts` vult aan met `STANDAARD` en laat alleen de keuzes uit `KEUZES` toe (ook in de route-PATCH). `goudenStatus(route)` geeft tot wanneer en met welke factor het gouden kwartier loopt (knop via `gouden_tot`, of vanzelf op `gouden.om` in Nederlandse tijd; stoppen zet `gouden_tot` op nu). `routes.fotobattle_uitgekeerd_op`: de punten voor de fotobattle-winnaar worden bij het vrijgeven van de uitslag één keer uitgekeerd (`keerFotobattleUit`), Opruimen zet hem terug.

#### 🎉 Spelplezier (nieuwe migratie 007)
Routes: `val_aan`, `reeks_aan`, `badges_aan`, `fotobattle_aan`, `schat_aan`, `rad_aan`, `gouden_tot`. Sessies: `reeks`, `rad_gedraaid_op`, `rad_uitkomst`. Tabellen `vallen`, `badges` (uniek per sessie en soort), `fotobattle_stemmen` (uniek per kiezer) en `schatten` (uniek per route, blok van 10 min en test/echt). Regels in `lib/spelplezier.ts`, serverlogica in `lib/spelplezier-server.ts`.
- De app vraagt elke 5 s `/api/speler/spelplezier?lat&lng&acc` (15 s als val, schat en rad uit staan). De server controleert daar of het team in een val liep en of de schat binnen bereik is; de app krijgt nooit vallen van anderen te zien. Alles met voorwaardelijke updates (`geraakt_op IS NULL`, `gepakt_door IS NULL`, `rad_gedraaid_op IS NULL`).
- Reeks, ⏰ dubbele punten en de antwoordbadges in `/api/speler/voortgang/verwerk` (`naAntwoord`); 🚩 pionier in `bereik`; 🛡️ taai na een item (`naGeraakt`); ⚔️ in `beantwoordDuel`.
- Val zetten: `/api/speler/val`; rad: `/api/speler/rad`; fotobattle: `/api/speler/fotobattle` (prijs via `stemmen` in `lib/prijzen.ts`); gouden kwartier: `/api/admin/gouden`.

#### `duels` en `routes.duel_aan` / `duel_punten` (nieuwe migratie 006)
⚔️ Duel: `sessie_a` < `sessie_b`, `vraag_nr` (uit `lib/duel-vragen.ts`), `antwoord_a/b`, `winnaar`, `buit`, `afgerond_op`. Unieke index op het tweetal zolang het duel open is. Gestart vanuit `/api/speler/locaties` als een ander team binnen 25 m is (`startDuels`, `lib/duel.ts`); de speler vraagt `/api/speler/duel`. Winnen: voorwaardelijke update op `winnaar IS NULL`, daarna `boekScoreOver`.

#### 🎬 Replay op de beamer
`/api/beamer/[sleutel]/replay` (alleen na `uitslag_vrijgegeven`) geeft per team het gefilterde GPS-spoor met tijden (`lib/beamer-replay.ts`, max. 400 punten per team, per 1000 rijen opgehaald). De beamerpagina speelt het in 40 s af via `AdminLiveLeaflet` (`sporen` + `vastBeeld`).

#### 🤳 Selfie bij de finish
`/api/speler/foto`: een foto-opdracht op een eindpunt met 0 punten wordt meteen `goedgekeurd` (geen pushmelding, geen keuring); met punten blijft hij `wacht`.

#### `players.test_rol` (nieuwe migratie 005)
🧪 Testteam: `team` (loginnaam *test*) of `tegenstander` (*Testtegenstander*, zonder lopen). `lib/testteam.ts`: `zorgTegenstander` (eigen sessie op de route), `gooiOpTestteam` (maakt een geclaimd startitem voor de tegenstander en voert het uit met `voerItemUit` uit `lib/item-uitvoeren.ts`, dezelfde code als de spelersapp), `testAutoWorp` (via `/api/speler/status` → `/api/speler/testteam`) en `wisTest`. Gefilterd in `/api/speler/locaties`, `maakStand`, de vraagstatistiek, het rapport (`haalAntwoorden(..., { zonderTest })`), het dashboard en de spelerslijst (zonder tegenstander). Het inzetten van items controleert dat aanvaller en doel allebei test of allebei echt zijn.

#### `client_fouten` (migratie 015)
Fouten van het foutscherm (`components/shared/FoutScherm.tsx` → `POST /api/fout`): rol, wie, pad, bericht, details (stack), browser. Alleen de service role (RLS aan, geen policies); getoond in de Systeemcheck via `/api/admin/fouten`. Ook na 30 dagen weg.

---

## 4. Constraints & regels

| Regel | Hoe afdwingen |
|---|---|
| Max. 1 actieve route | Partial unique index op `routes(is_active)` WHERE `is_active = true` |
| Max. 1 actieve sessie per team | Unique constraint `player_sessions(player_id)` WHERE `status = 'actief'` |
| Max. 1 apparaat per team | Controleren in login-flow: `active_device_id` vergelijken, blokkeer tweede apparaat |
| Exact 3 antwoorden per meerkeuzevraag | Server-side validatie bij opslaan vraag |
| Exact 1 correct antwoord per vraag | Constraint: `CHECK` of server-side validatie |
| `selected_answer_id` XOR `open_answer_text` | Check constraint in `player_point_progress` |

---

## 5. RLS Policies (hoofdlijnen)

| Tabel | Lezen | Schrijven |
|---|---|---|
| `routes` | Admin altijd; speler alleen actieve route | Alleen admin |
| `route_points` | Admin altijd; speler punten van actieve route | Alleen admin |
| `questions` | Admin altijd; speler punt van actieve sessie | Alleen admin |
| `answer_options` | Zelfde als questions | Alleen admin |
| `players` | Admin altijd; speler alleen eigen rij | Admin aanmaken; speler lezen eigen |
| `player_sessions` | Admin altijd; speler eigen sessie | Speler aanmaken/updaten eigen sessie |
| `player_point_progress` | Admin altijd; speler eigen sessie | Speler eigen sessie |
| `location_updates` | Admin exact; spelers `public_*` kolommen van actieve sessies | Speler eigen sessie |

---

## 6. Pagina's & routes

| Pad | Rol | Beschrijving |
|---|---|---|
| `/login` | Iedereen | Inlogpagina; redirect na login op rol |
| `/admin` | Admin | Dashboard: speleroverzicht + live leaderboard |
| `/admin/routes` | Admin | Lijst routes, aanmaken, klaarzetten, activeren |
| `/admin/routes/[id]` | Admin | Route-editor: Leaflet kaart, punten plaatsen/verslepen |
| `/admin/routes/[id]/punten/[pid]` | Admin | Punt bewerken + vraag-editor |
| `/admin/live` | Admin | Live kaart met exacte locaties alle spelers |
| `/admin`, `/admin/antwoorden`, `/admin/live` | Helper | Rol `helper` (app_metadata, e-mail `naam@plekkiehelper.nl`): meekijken, foto's keuren, punten vrijgeven. Andere beheerpagina's stuurt de middleware terug naar `/admin`; API's controleren `isAdmin` of `isBeheer` (lib/auth-server.ts) |
| `/speler` | Speler | Intro 5 sec → locatiepermissie → startknop |
| `/speler/kaart` | Speler | Spelerskaart, GPS-tracking, puntdetectie |
| `/speler/finish` | Speler | Eindscherm: tijd, punten, top-3 leaderboard |

---

## 7. Componentstructuur

```
<RouteEditor>
  └── Leaflet kaart
      ├── Punten als markers (versleepbaar)
      ├── Polyline tussen punten
      └── Klik = nieuw punt

<PuntForm>
  ├── Naam, beschrijving, type, radius, points
  └── Upload afbeelding + geluid

<VraagEditor>
  ├── Vraagtype selector
  ├── Tekstveld + optioneel afbeelding-upload
  ├── <MeerkeuzeBouwer> (3 opties, kleur, tekst of afbeelding)
  └── <OpenVraagBouwer> (tekst-antwoorden of numeriek + tolerantie)

<SpeelKaart>
  ├── Leaflet kaart (volgend punt + behaalde punten)
  ├── GPS watcher → Haversine controle
  ├── "Controleer locatie" knop
  ├── GPS-statusbalk (accuracy, melding bij verlies)
  └── Trigger → <VraagPopup>

<VraagPopup>
  ├── <MeerkeuzePopup> (3 gekleurde knoppen, feedback, juist antwoord tonen)
  └── <OpenVraagPopup> (invoerveld, normalisatie, feedback)

<Leaderboard>
  └── Supabase Realtime → live top-3 (punten, tijd)

<LiveKaart> (admin)
  └── Exacte locaties alle spelers via Supabase Realtime

Gedeelde beheeronderdelen (vaste vorm overal)
  ├── <StatusLabel> teamstatus als chip (⚡ onderweg, 💤 uitgelogd, 🏁 gefinisht, …)
  ├── <LaadBlokjes> glanzende grijze blokjes tijdens het laden (i.p.v. "Laden…")
  ├── <MeldingHouder> toasts via toonMelding(): icoon, tekst, aftelbalkje
  ├── <MenuIcoon> lijn-iconen (SVG) in het menu en de kopbalken
  ├── <Icoon> lijn-iconen op alle knoppen in het beheer (lucide-react); de speler-app houdt emoji
  ├── <MenuGroep> ⚙️ Instellingen: paneel dat naar rechts uitklapt (portal, blijft gemount)
  ├── <FotoKeurVenster> één keurvenster in de layout; openFotoKeuren() vanaf elke pagina, sneltoetsen G/F/S
  ├── <SpelAfronden> 🏁 Afronden (stoppen, uitslag, rapport) en 🧹 Opruimen (reset, volgende groep; enige plek voor de reset)
  └── <SysteemTeller> rood bolletje bij ⚙️/Systeemcheck (check 1× per 10 min, sessionStorage)
```

---

## 8. Bouwvolgorde

| Fase | Wat | Afhankelijk van |
|---|---|---|
| 1 | Projectsetup, layouts, PWA | — |
| 2 | Supabase schema + TS types | — |
| 3 | Auth, login, rolguards, device-check | 1, 2 |
| 4 | Admin route-editor | 1, 2, 3 |
| 5 | Vraag-editor + uploads | 4 |
| 6 | Speler startflow + PWA intro | 1, 3 |
| 7 | Spelerkaart + GPS puntdetectie | 2, 6 |
| 8 | Vraag-popup + antwoordcontrole + score | 5, 7 |
| 9 | Eindpunt, finish-scherm, leaderboard | 8 |
| 10 | Live locaties andere spelers | 7, 9 |
| 11 | Admin dashboard live functies | 9, 10 |
| 12 | Resetfunctie | 11 |
| 13 | Route export/import JSON | 4, 5 |
| 14 | Afwerking + testdata | Alles |
| 15 | Eindcontrole | Alles |

---

## 9. Belangrijkste randgevallen

| Scenario | Aanpak |
|---|---|
| Tweede apparaat zelfde team | Login-check op `active_device_id`; bij mismatch blokkeren met melding |
| Refresh tijdens spel | `player_sessions.current_point_id` opslaan; bij heropen sessie hervatten |
| GPS valt weg | Melding tonen; GPS watcher blijft actief; spel pauzeert niet |
| GPS accuracy te slecht | Melding + "Controleer locatie"-knop; puntdetectie tijdelijk uitschakelen |
| Supabase realtime onderbroken | Toast melding "Verbinding onderbroken"; auto-reconnect; spel loopt door |
| Reset tijdens actief spel | Sessie markeert als `vervallen`; speler ziet melding bij volgende actie |
| Import JSON | Validatie vóór opslaan; route wordt niet automatisch actief |
| Numerieke invoer komma/punt | Normaliseren: `"1,5"` → `1.5` vóór vergelijking |
| Stemvraag | `questions.type = 'stemvraag'`; antwoord krijgt `is_correct = null` tot `lib/stemmen.ts` (`sluitStemmingen`) de meerderheid bepaalt (bij uitslag vrijgeven of /api/admin/stemming); daarna `stem_gesloten` en late stemmers meteen beoordeeld |
| Open tekstantwoord met tikfout | `tekstKlopt` (lib/geo.ts): zonder hoofdletters, accenten en leestekens; bij 5+ tekens Damerau-Levenshtein ≤ 1 |
| Geen bereik onderweg | Service worker bewaart kaarttegels (`pr-kaart-v1`, max. 4000, cache-first); bij de start haalt `lib/kaart-offline.ts` de vectortegels z10–14 rond de punten op (max. 200) |
| Scherm uit / app op achtergrond | Status- en locatiepolls slaan over; bij terugkomen meteen bijwerken |

---

## 10. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # alleen server-side, nooit naar client
```

---

*Ontwerp gereed. Volgende stap: Fase 1 — Projectsetup.*
