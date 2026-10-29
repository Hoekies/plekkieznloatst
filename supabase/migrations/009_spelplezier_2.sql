-- Migratie 009: 🎉 spelplezier deel 2 (30 oktober 2026)
--
--   🥷 schaduw-item      nieuw item: een paar minuten onzichtbaar voor radar en duels
--   🃏 jokers            per team een aantal 50/50- en overslaan-jokers (aantal per route)
--   📏 kilometerbonus    punten of een item per gelopen kilometer
--   🧑‍⚖️ bezwaar          een team maakt bezwaar tegen een fout gerekend antwoord; de spelleider beslist
--   💬 chat              berichten tussen een team en de spelleider
--   🧩 fotopuzzel        per goed antwoord een stukje van een foto; raad wat het is
--   🗝️ sleutelpunt       een punt gaat pas open als het team bij het sleutelpunt is geweest
--   🔤 🔀 🗺️             nieuwe vraagsoorten: anagram, volgorde en kaartvraag
-- De instellingen staan in routes.spelplezier (migratie 008). Nodig: migratie 007 en 008.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

-- 🥷 Nieuw item en effect
ALTER TABLE special_items DROP CONSTRAINT IF EXISTS special_items_type_check;
ALTER TABLE special_items ADD CONSTRAINT special_items_type_check
  CHECK (type IN ('spook','bom','ster','verdubbeling','wissel','dief','radar','banaan','plekzooi','vraagteken','schaduw'));
ALTER TABLE special_item_effects DROP CONSTRAINT IF EXISTS special_item_effects_effect_type_check;
ALTER TABLE special_item_effects ADD CONSTRAINT special_item_effects_effect_type_check
  CHECK (effect_type IN ('ghost','punt_aftrek','verdubbeling','wissel','diefstal','radar','banaan','plekzooi','schaduw'));

-- 🔤 🔀 🗺️ Nieuwe vraagsoorten; kaartvraag: de juiste plek en binnen hoeveel meter het helemaal goed is
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('meerkeuze_tekst', 'meerkeuze_afbeelding', 'open', 'foto_opdracht', 'stemvraag', 'anagram', 'volgorde', 'kaartvraag'));
ALTER TABLE questions ADD COLUMN IF NOT EXISTS kaart_lat    double precision;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS kaart_lng    double precision;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS kaart_straal integer;            -- meter; daarbuiten minder punten
-- Het antwoord op een kaartvraag of de gekozen volgorde (de speler); de afstand in meters bij een kaartvraag
ALTER TABLE player_point_progress ADD COLUMN IF NOT EXISTS antwoord_extra jsonb;

-- 🗝️ Sleutelpunt: dit punt gaat pas open als het team bij sleutel_punt_id is geweest
ALTER TABLE route_points ADD COLUMN IF NOT EXISTS sleutel_punt_id uuid REFERENCES route_points(id) ON DELETE SET NULL;

-- 🃏 jokers, 🧑‍⚖️ bezwaren, 📏 beloonde kilometers en 🧩 fotopuzzel per spel
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS jokers_5050    integer NOT NULL DEFAULT 0;   -- zoveel gebruikt
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS jokers_over    integer NOT NULL DEFAULT 0;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS km_beloond     integer NOT NULL DEFAULT 0;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzelfoto_gok text;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzelfoto_goed boolean;

-- 🧑‍⚖️ Bezwaren: per team per punt hooguit één
CREATE TABLE IF NOT EXISTS bezwaren (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sessie_id      uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id uuid        NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
  toelichting    text,
  status         text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'toegekend', 'afgewezen')),
  punten         integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  beslist_op     timestamptz,
  UNIQUE (sessie_id, route_point_id)
);

-- 💬 Chat tussen een team en de spelleider
CREATE TABLE IF NOT EXISTS chat_berichten (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sessie_id  uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  van        text        NOT NULL CHECK (van IN ('team', 'leider')),
  tekst      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  gelezen_op timestamptz
);
CREATE INDEX IF NOT EXISTS chat_berichten_sessie ON chat_berichten (sessie_id, created_at);

-- Alleen de server (service_role) komt erbij; spelers krijgen alles via de app
ALTER TABLE bezwaren       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_berichten ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bezwaren       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_berichten TO service_role;

NOTIFY pgrst, 'reload schema';
