# Technisch ontwerp — Plekkie z'n Loatst

## 1. Architectuuroverzicht

### Doel
Een Nederlandstalige PWA voor een route-gebaseerd quizspel op een kaart. Groepen lopen een route langs GPS-waypoints. Bij elk punt verschijnt een vraag. Scores worden live bijgehouden op een leaderboard.

### Twee interfaces
| Interface | Doelgroep | Apparaat |
|---|---|---|
| Beheerder-app | Spelleider | Desktop |
| Speler-app | Deelnemende groepen | Mobiel |

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

```
plekkie-zn-loatst/
├── app/
│   ├── layout.tsx                  → root layout
│   ├── page.tsx                    → redirect op rol (admin/speler)
│   ├── login/
│   │   └── page.tsx                → inlogpagina
│   ├── admin/
│   │   ├── layout.tsx              → admin shell + navigatie
│   │   ├── page.tsx                → dashboard (speleroverzicht + leaderboard)
│   │   ├── routes/
│   │   │   ├── page.tsx            → route-overzicht
│   │   │   └── [id]/
│   │   │       ├── page.tsx        → route-editor (Leaflet kaart)
│   │   │       └── punten/
│   │   │           └── [pid]/
│   │   │               └── page.tsx → punt + vraag-editor
│   │   └── live/
│   │       └── page.tsx            → live kaart alle spelers
│   └── speler/
│       ├── layout.tsx              → speler shell
│       ├── page.tsx                → intro-scherm (5 sec) → startflow
│       ├── kaart/
│       │   └── page.tsx            → spelerskaart + GPS
│       └── finish/
│           └── page.tsx            → eindscherm + leaderboard
├── components/
│   ├── admin/
│   │   ├── RouteEditor.tsx
│   │   ├── PuntForm.tsx
│   │   ├── VraagEditor.tsx
│   │   └── LiveKaart.tsx
│   ├── speler/
│   │   ├── SpeelKaart.tsx
│   │   ├── VraagPopup.tsx
│   │   └── Leaderboard.tsx
│   └── shared/
│       ├── GeenInternet.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── supabase.ts                 → Supabase client (browser + server)
│   ├── auth.ts                     → rol-check helpers, route guards
│   └── geo.ts                      → Haversine, GPS utilities
├── types/
│   └── database.ts                 → TypeScript types van schema
├── styles/
│   └── globals.css
├── public/
│   └── intro-map.png               → placeholder kaart (fase 6)
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql
│       └── 002_rls.sql
├── next.config.ts
├── package.json
└── .env.local.example
```

---

## 3. Datamodel

### Tabellen

#### `routes`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| name | text | |
| status | text | `concept` / `gepubliceerd` |
| is_active | boolean | Max. 1 route actief tegelijk (constraint) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `route_points`
| Kolom | Type | Opmerkingen |
|---|---|---|
| id | uuid PK | |
| route_id | uuid FK → routes | |
| order_index | integer | Volgorde |
| type | text | `vraagpunt` / `informatiepunt` / `eindpunt` |
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
| group_name | text | Naam van de groep |
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

---

## 4. Constraints & regels

| Regel | Hoe afdwingen |
|---|---|
| Max. 1 actieve route | Partial unique index op `routes(is_active)` WHERE `is_active = true` |
| Max. 1 actieve sessie per groep | Unique constraint `player_sessions(player_id)` WHERE `status = 'actief'` |
| Max. 1 apparaat per groep | Controleren in login-flow: `active_device_id` vergelijken, blokkeer tweede apparaat |
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
| `/admin/routes` | Admin | Lijst routes, aanmaken, publiceren, activeren |
| `/admin/routes/[id]` | Admin | Route-editor: Leaflet kaart, punten plaatsen/verslepen |
| `/admin/routes/[id]/punten/[pid]` | Admin | Punt bewerken + vraag-editor |
| `/admin/live` | Admin | Live kaart met exacte locaties alle spelers |
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
| Tweede apparaat zelfde groep | Login-check op `active_device_id`; bij mismatch blokkeren met melding |
| Refresh tijdens spel | `player_sessions.current_point_id` opslaan; bij heropen sessie hervatten |
| GPS valt weg | Melding tonen; GPS watcher blijft actief; spel pauzeert niet |
| GPS accuracy te slecht | Melding + "Controleer locatie"-knop; puntdetectie tijdelijk uitschakelen |
| Supabase realtime onderbroken | Toast melding "Verbinding onderbroken"; auto-reconnect; spel loopt door |
| Reset tijdens actief spel | Sessie markeert als `vervallen`; speler ziet melding bij volgende actie |
| Import JSON | Validatie vóór opslaan; route wordt niet automatisch actief |
| Numerieke invoer komma/punt | Normaliseren: `"1,5"` → `1.5` vóór vergelijking |

---

## 10. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # alleen server-side, nooit naar client
```

---

*Ontwerp gereed. Volgende stap: Fase 1 — Projectsetup.*
