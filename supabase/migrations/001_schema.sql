-- ══════════════════════════════════════════════════════════════════════════════
-- PointRush (Plekkie z'n Loatst) — volledig databaseschema
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Dit is de samengevoegde eindstand van de oude migraties 001 t/m 038, plus de latere
-- migraties 002 t/m 026 (oktober 2026). Die latere staan onderaan, elk onder een eigen kopje
-- met hun oude nummer (meldingen in de app noemen dat nummer nog, bijv. "migratie 023").
-- Alleen nodig voor een NIEUW, leeg Supabase-project: voer het in één keer uit in de
-- SQL Editor. De bestaande database heeft dit allemaal al — daar niet opnieuw uitvoeren.
-- Alles mag vaker gedraaid worden. Nieuwe wijzigingen komen weer als 002_…, 003_… enz.
--
-- Na het uitvoeren, via het Supabase-dashboard:
--   1. Storage: maak drie buckets aan: "route-afbeeldingen" en "vraag-afbeeldingen"
--      (openbaar: de app toont ze via een openbare link) en "foto-inzendingen" (niet openbaar).
--   2. Authentication > Users: maak de beheerder aan en geef hem de rol admin:
--        UPDATE auth.users
--        SET raw_app_meta_data = raw_app_meta_data || '{"rol": "admin"}'
--        WHERE email = 'jouw@email.nl';
--      Spelersgroepen maak je daarna aan in de app (Groepen → Nieuwe groep).
-- ══════════════════════════════════════════════════════════════════════════════


-- ── Hulpfuncties ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── Routes ───────────────────────────────────────────────────────────────────

CREATE TABLE routes (
  id                            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          text        NOT NULL,
  status                        text        NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepubliceerd')),
  is_active                     boolean     NOT NULL DEFAULT false,
  modus                         text        NOT NULL DEFAULT 'sequentieel',
  -- Verspreid
  verwacht_aantal_teams         integer     NOT NULL DEFAULT 2 CONSTRAINT routes_teams_check CHECK (verwacht_aantal_teams >= 2),
  doel_afstand_km               float8      NOT NULL DEFAULT 0,
  omgekeerde_teams              jsonb       NOT NULL DEFAULT '[]'::jsonb,   -- teams die het rondje andersom lopen
  instappunten                  jsonb       NOT NULL DEFAULT '{}'::jsonb,   -- zelfgekozen instappunt per team
  -- Items
  ster_waarde                   integer     NOT NULL DEFAULT 50,
  bom_waarde                    integer     NOT NULL DEFAULT 30,
  item_respawn                  boolean     NOT NULL DEFAULT false,
  respawn_minuten               integer     NOT NULL DEFAULT 15  CHECK (respawn_minuten > 0),
  items_last_rotated_at         timestamptz,
  plekzooi_duur_seconden        integer     NOT NULL DEFAULT 300 CHECK (plekzooi_duur_seconden > 0),
  spook_duur_seconden           integer     NOT NULL DEFAULT 600 CHECK (spook_duur_seconden > 0),
  startitems                    jsonb,                                       -- per type het aantal; NULL = standaard
  items_na_finish               boolean     NOT NULL DEFAULT false,
  items_na_finish_types         jsonb,                                       -- welke items na de finish nog mogen
  -- Tussenstand en uitslag
  tussenstand_interval_minuten  integer     NOT NULL DEFAULT 0  CHECK (tussenstand_interval_minuten >= 0),
  tussenstand_duur_seconden     integer     NOT NULL DEFAULT 10 CHECK (tussenstand_duur_seconden > 0),
  tussenstand_trigger_at        timestamptz,
  uitslag_vrijgegeven           boolean     NOT NULL DEFAULT false,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT routes_modus_check CHECK (modus IN ('sequentieel', 'verspreid'))
);
-- Maximaal één actieve route
CREATE UNIQUE INDEX routes_one_active_idx ON routes (is_active) WHERE is_active = true;
CREATE TRIGGER routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE route_points (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id           uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  order_index        integer     NOT NULL,
  type               text        NOT NULL CHECK (type IN ('vraagpunt', 'informatiepunt', 'eindpunt')),
  name               text        NOT NULL,
  description        text,
  latitude           float8      NOT NULL,
  longitude          float8      NOT NULL,
  radius_meters      integer     NOT NULL DEFAULT 10 CHECK (radius_meters >= 1),
  points             integer     NOT NULL DEFAULT 0  CHECK (points >= 0),
  image_path         text,
  sound_path         text,
  qr_unlock_enabled  boolean     NOT NULL DEFAULT false,
  qr_secret          text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, order_index)
);
CREATE INDEX route_points_route_id_idx ON route_points (route_id);
CREATE TRIGGER route_points_updated_at BEFORE UPDATE ON route_points FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE questions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_point_id        uuid        NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
  type                  text        NOT NULL CONSTRAINT questions_type_check
                                    CHECK (type IN ('meerkeuze_tekst', 'meerkeuze_afbeelding', 'open', 'foto_opdracht')),
  question_text         text        NOT NULL,
  question_image_path   text,
  points                integer     NOT NULL DEFAULT 0 CHECK (points >= 0),
  correct_text_answers  text[],
  numeric_answer        float8,
  numeric_tolerance     float8      CHECK (numeric_tolerance IS NULL OR numeric_tolerance >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_route_point_id_idx ON questions (route_point_id);
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE answer_options (
  id           uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index  integer  NOT NULL,
  color        text     NOT NULL CONSTRAINT answer_options_color_check CHECK (color IN ('geel', 'blauw', 'rood', 'groen')),
  answer_type  text     NOT NULL CHECK (answer_type IN ('tekst', 'afbeelding')),
  text         text,
  image_path   text,
  is_correct   boolean  NOT NULL DEFAULT false,
  punten       integer,  -- eigen punten per antwoord (mag negatief); NULL = standaard
  UNIQUE (question_id, order_index),
  UNIQUE (question_id, color)
);
CREATE INDEX answer_options_question_id_idx ON answer_options (question_id);


-- ── Spelers en sessies ───────────────────────────────────────────────────────

CREATE TABLE players (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name        text        NOT NULL,
  auth_user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_name        text,
  nickname          text,                    -- teamnaam, zelf gekozen bij de start
  icon              text        NOT NULL DEFAULT '🦊',
  active_device_id  text,
  is_uitgeschakeld  boolean     NOT NULL DEFAULT false,
  force_logout_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id)
);
CREATE UNIQUE INDEX players_login_name_idx ON players (login_name) WHERE login_name IS NOT NULL;


CREATE TABLE player_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  route_id          uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  current_point_id  uuid        REFERENCES route_points(id) ON DELETE SET NULL,
  score             integer     NOT NULL DEFAULT 0 CHECK (score >= 0),
  status            text        NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'voltooid', 'vervallen')),
  afstand_m         float8      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX player_sessions_one_active_idx ON player_sessions (player_id) WHERE status = 'actief';
CREATE INDEX player_sessions_player_id_idx ON player_sessions (player_id);
CREATE INDEX player_sessions_route_id_idx  ON player_sessions (route_id);
CREATE INDEX player_sessions_status_idx    ON player_sessions (status);


CREATE TABLE player_point_progress (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id      uuid        NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
  reached_at          timestamptz NOT NULL DEFAULT now(),
  answered_at         timestamptz,
  selected_answer_id  uuid        REFERENCES answer_options(id),
  open_answer_text    text,
  is_correct          boolean,
  points_awarded      integer     NOT NULL DEFAULT 0,  -- mag negatief (minpunten per antwoord)
  UNIQUE (session_id, route_point_id),
  CONSTRAINT antwoord_xor CHECK (NOT (selected_answer_id IS NOT NULL AND open_answer_text IS NOT NULL))
);
CREATE INDEX player_point_progress_session_id_idx     ON player_point_progress (session_id);
CREATE INDEX player_point_progress_route_point_id_idx ON player_point_progress (route_point_id);


-- Eigen puntvolgorde per team (verspreid, en de banaan bij sequentieel)
CREATE TABLE session_point_order (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid    NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  volgorde        integer NOT NULL,
  route_point_id  uuid    NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
  UNIQUE (session_id, volgorde),
  UNIQUE (session_id, route_point_id)
);


CREATE TABLE location_updates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  latitude          float8      NOT NULL,
  longitude         float8      NOT NULL,
  accuracy_meters   float8      NOT NULL CHECK (accuracy_meters >= 0),
  public_latitude   float8      NOT NULL,
  public_longitude  float8      NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_updates_session_id_idx ON location_updates (session_id);
CREATE INDEX location_updates_created_at_idx ON location_updates (created_at DESC);


CREATE TABLE foto_inzendingen (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id    uuid        NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
  foto_pad          text        NOT NULL,
  status            text        NOT NULL DEFAULT 'wacht' CHECK (status IN ('wacht', 'goedgekeurd', 'afgekeurd')),
  punten_toegekend  integer     NOT NULL DEFAULT 0 CHECK (punten_toegekend >= 0),
  beoordeeld_op     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, route_point_id)
);
CREATE INDEX foto_inzendingen_status_idx         ON foto_inzendingen (status);
CREATE INDEX foto_inzendingen_route_point_id_idx ON foto_inzendingen (route_point_id);
CREATE INDEX foto_inzendingen_session_id_idx     ON foto_inzendingen (session_id);


CREATE TABLE hulpverzoeken (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id  uuid        REFERENCES route_points(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'toegekend', 'genegeerd')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  afgehandeld_at  timestamptz
);
CREATE INDEX hulpverzoeken_session_idx ON hulpverzoeken (session_id);


CREATE TABLE broadcasts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bericht     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── Speciale items ───────────────────────────────────────────────────────────

CREATE TABLE special_items (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id               uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  type                   text        NOT NULL CONSTRAINT special_items_type_check
                                     CHECK (type IN ('spook','bom','ster','verdubbeling','wissel','dief','radar','banaan','plekzooi','vraagteken')),
  name                   text        NOT NULL,
  latitude               float8      NOT NULL,
  longitude              float8      NOT NULL,
  radius_meters          integer     NOT NULL DEFAULT 15 CHECK (radius_meters >= 1),
  points_effect          integer     NOT NULL DEFAULT 0,
  claimed                boolean     NOT NULL DEFAULT false,
  claimed_by_session_id  uuid        REFERENCES player_sessions(id) ON DELETE SET NULL,
  claimed_at             timestamptz,
  used_at                timestamptz,
  respawn_at             timestamptz,
  is_startitem           boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX special_items_route_id_idx ON special_items (route_id);
CREATE INDEX special_items_claimed_idx  ON special_items (claimed);
CREATE TRIGGER special_items_updated_at BEFORE UPDATE ON special_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE special_item_effects (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  special_item_id    uuid        NOT NULL REFERENCES special_items(id) ON DELETE CASCADE,
  target_session_id  uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  effect_type        text        NOT NULL CONSTRAINT special_item_effects_effect_type_check
                                 CHECK (effect_type IN ('ghost','punt_aftrek','verdubbeling','wissel','diefstal','radar','banaan','plekzooi')),
  expires_at         timestamptz,
  applied_at         timestamptz NOT NULL DEFAULT now(),
  notification       text,
  UNIQUE (special_item_id, target_session_id)
);
CREATE INDEX special_item_effects_target_session_idx ON special_item_effects (target_session_id);
CREATE INDEX special_item_effects_expires_at_idx     ON special_item_effects (expires_at);


-- Logboek van ingezette en ontvangen items (rapport, terugkijken, gelopen route)
CREATE TABLE item_log (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gebruiker_session_id  uuid        REFERENCES player_sessions(id) ON DELETE CASCADE,  -- NULL bij plek zooi
  doel_session_id       uuid        REFERENCES player_sessions(id) ON DELETE CASCADE,  -- NULL zonder doelteam
  item_type             text        NOT NULL,
  omschrijving          text,
  latitude              float8,
  longitude             float8,
  doel_latitude         float8,
  doel_longitude        float8,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX item_log_gebruiker_idx ON item_log (gebruiker_session_id);
CREATE INDEX item_log_doel_idx      ON item_log (doel_session_id);


-- Houdt het gratis Supabase-project wakker (wordt periodiek bijgewerkt)
CREATE TABLE keepalive (
  id         integer     PRIMARY KEY DEFAULT 1,
  pinged_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT keepalive_single_row CHECK (id = 1)
);
INSERT INTO keepalive (id, pinged_at) VALUES (1, now()) ON CONFLICT (id) DO NOTHING;


-- ── Toegang (Row Level Security) ─────────────────────────────────────────────
-- De app zelf werkt via de service-role op de server; deze regels beschermen
-- tegen directe toegang met de openbare sleutel.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION mijn_player_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM players WHERE auth_user_id = auth.uid();
$$;

ALTER TABLE routes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_points          ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options        ENABLE ROW LEVEL SECURITY;
ALTER TABLE players               ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_point_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_point_order   ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_updates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE foto_inzendingen      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hulpverzoeken         ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_item_effects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE keepalive             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_admin_alles" ON routes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "routes_speler_actief_lezen" ON routes FOR SELECT TO authenticated USING (NOT is_admin() AND is_active = true);

CREATE POLICY "route_points_admin_alles" ON route_points FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "route_points_speler_lezen" ON route_points FOR SELECT TO authenticated
  USING (NOT is_admin() AND route_id IN (SELECT id FROM routes WHERE is_active = true));

CREATE POLICY "questions_admin_alles" ON questions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "questions_speler_lezen" ON questions FOR SELECT TO authenticated
  USING (NOT is_admin() AND route_point_id IN (
    SELECT rp.id FROM route_points rp JOIN routes r ON rp.route_id = r.id WHERE r.is_active = true));

CREATE POLICY "answer_options_admin_alles" ON answer_options FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "answer_options_speler_lezen" ON answer_options FOR SELECT TO authenticated
  USING (NOT is_admin() AND question_id IN (
    SELECT q.id FROM questions q JOIN route_points rp ON q.route_point_id = rp.id JOIN routes r ON rp.route_id = r.id
    WHERE r.is_active = true));

CREATE POLICY "players_admin_alles" ON players FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "players_speler_eigen_lezen" ON players FOR SELECT TO authenticated USING (NOT is_admin() AND auth_user_id = auth.uid());
CREATE POLICY "players_speler_eigen_updaten" ON players FOR UPDATE TO authenticated
  USING (NOT is_admin() AND auth_user_id = auth.uid()) WITH CHECK (NOT is_admin() AND auth_user_id = auth.uid());

CREATE POLICY "player_sessions_admin_alles" ON player_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "player_sessions_speler_eigen" ON player_sessions FOR ALL TO authenticated
  USING (NOT is_admin() AND player_id = mijn_player_id()) WITH CHECK (NOT is_admin() AND player_id = mijn_player_id());

CREATE POLICY "progress_admin_alles" ON player_point_progress FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "progress_speler_eigen" ON player_point_progress FOR ALL TO authenticated
  USING (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()))
  WITH CHECK (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

CREATE POLICY "spo_admin_alles" ON session_point_order FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "eigen sessie zien" ON session_point_order FOR SELECT
  USING (session_id IN (SELECT ps.id FROM player_sessions ps JOIN players p ON p.id = ps.player_id WHERE p.auth_user_id = auth.uid()));

CREATE POLICY "location_updates_admin_alles" ON location_updates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "location_updates_speler_schrijven" ON location_updates FOR INSERT TO authenticated
  WITH CHECK (NOT is_admin() AND session_id IN (
    SELECT id FROM player_sessions WHERE player_id = mijn_player_id() AND status = 'actief'));

CREATE POLICY "foto_inzendingen_admin_alles" ON foto_inzendingen FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "foto_inzendingen_speler_eigen" ON foto_inzendingen FOR ALL TO authenticated
  USING (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()))
  WITH CHECK (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

CREATE POLICY "broadcasts_admin_alles" ON broadcasts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "broadcasts_speler_lezen" ON broadcasts FOR SELECT TO authenticated USING (NOT is_admin());

CREATE POLICY "special_items_admin_alles" ON special_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "special_items_speler_lezen" ON special_items FOR SELECT TO authenticated
  USING (NOT is_admin() AND route_id IN (SELECT id FROM routes WHERE is_active = true));

CREATE POLICY "special_item_effects_admin_alles" ON special_item_effects FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "special_item_effects_speler_eigen" ON special_item_effects FOR SELECT TO authenticated
  USING (NOT is_admin() AND target_session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

-- hulpverzoeken, item_log en keepalive: geen regels, alleen de server (service-role) komt erbij

-- Antwoorden, vragen, punten en items nooit direct leesbaar met de openbare sleutel
-- (de app haalt ze via de server op, zonder het goede antwoord te verklappen)
REVOKE SELECT ON answer_options FROM anon, authenticated;
REVOKE SELECT ON questions      FROM anon, authenticated;
REVOKE SELECT ON route_points   FROM anon, authenticated;
REVOKE SELECT ON special_items  FROM anon, authenticated;


-- ── Openbare posities (afgerond), voor de live weergave ──────────────────────

CREATE OR REPLACE VIEW public_locaties AS
SELECT lu.id, lu.session_id, lu.public_latitude AS latitude, lu.public_longitude AS longitude, lu.created_at, p.group_name
FROM location_updates lu
JOIN player_sessions ps ON lu.session_id = ps.id
JOIN players p ON ps.player_id = p.id
WHERE ps.status = 'actief';

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 002 (was 002_beveiliging_spelers_alleen_lezen.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Beveiliging: spelers mogen hun eigen gegevens alleen LEZEN met de openbare sleutel.
--
-- Waarom: de app zelf schrijft altijd via de server (service-role). Maar een speler kan met zijn
-- eigen inlog ook rechtstreeks met de database praten, buiten de app om. Met de oude regels kon
-- hij dan zijn eigen score, voortgang en foto-keuring aanpassen (valsspelen), of zichzelf weer
-- inschakelen na "uitgeschakeld". De live-updates in de app hebben alleen leesrechten nodig.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

-- Functies: vaste zoekpad (aanbevolen bij SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION mijn_player_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM players WHERE auth_user_id = auth.uid();
$$;

-- 1. Alle schrijfregels voor spelers weghalen (de admin-regels blijven staan)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('players', 'player_sessions', 'player_point_progress', 'foto_inzendingen', 'location_updates')
      AND cmd <> 'SELECT'
      AND policyname NOT LIKE '%admin%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. Leesregels voor de eigen gegevens (nodig voor de live-updates in de app)
DROP POLICY IF EXISTS "player_sessions_speler_eigen_lezen" ON player_sessions;
CREATE POLICY "player_sessions_speler_eigen_lezen" ON player_sessions FOR SELECT TO authenticated
  USING (NOT is_admin() AND player_id = mijn_player_id());

DROP POLICY IF EXISTS "progress_speler_eigen_lezen" ON player_point_progress;
CREATE POLICY "progress_speler_eigen_lezen" ON player_point_progress FOR SELECT TO authenticated
  USING (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

DROP POLICY IF EXISTS "foto_inzendingen_speler_eigen_lezen" ON foto_inzendingen;
CREATE POLICY "foto_inzendingen_speler_eigen_lezen" ON foto_inzendingen FOR SELECT TO authenticated
  USING (NOT is_admin() AND session_id IN (SELECT id FROM player_sessions WHERE player_id = mijn_player_id()));

-- 3. Oude weergave met (afgeronde) posities van alle spelers: wordt niet meer gebruikt
DROP VIEW IF EXISTS public_locaties;

-- 4. Controle: hieronder mogen voor spelers alleen nog SELECT-regels staan
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('players', 'player_sessions', 'player_point_progress', 'foto_inzendingen', 'location_updates')
ORDER BY tablename, policyname;


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 003 (was 003_routes_bewerkt_op.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- "Laatst aangepast" per route: alleen echte bewerkingen in de editor tellen mee
-- (naam, instellingen, punten, vragen, antwoorden en geplaatste items), niet wat er tijdens
-- het spelen verandert (activeren, tussenstand, uitslag, opgepakte items, startitems).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS bewerkt_op timestamptz NOT NULL DEFAULT now();

-- Startwaarde voor bestaande routes: de laatste wijziging aan punten of vragen (anders het aanmaken)
UPDATE routes r SET bewerkt_op = greatest(
  r.created_at,
  coalesce((SELECT max(rp.updated_at) FROM route_points rp WHERE rp.route_id = r.id), r.created_at),
  coalesce((SELECT max(q.updated_at) FROM questions q JOIN route_points rp ON rp.id = q.route_point_id WHERE rp.route_id = r.id), r.created_at),
  coalesce((SELECT max(si.created_at) FROM special_items si WHERE si.route_id = r.id AND NOT si.is_startitem), r.created_at)
);

-- Route zelf: alleen bijwerken als er iets anders verandert dan de spel-velden
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS routes_bewerkt_op ON routes;
CREATE TRIGGER routes_bewerkt_op BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION route_bewerkt_op();

-- Hulpje: de route van een wijziging een nieuwe "bewerkt op" geven
CREATE OR REPLACE FUNCTION markeer_route_bewerkt(rid uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE routes SET bewerkt_op = now() WHERE id = rid;
$$;

-- Punten
CREATE OR REPLACE FUNCTION punt_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM markeer_route_bewerkt(coalesce(NEW.route_id, OLD.route_id));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS route_points_bewerkt ON route_points;
CREATE TRIGGER route_points_bewerkt AFTER INSERT OR UPDATE OR DELETE ON route_points FOR EACH ROW EXECUTE FUNCTION punt_bewerkt();

-- Vragen
CREATE OR REPLACE FUNCTION vraag_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM markeer_route_bewerkt((SELECT route_id FROM route_points WHERE id = coalesce(NEW.route_point_id, OLD.route_point_id)));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS questions_bewerkt ON questions;
CREATE TRIGGER questions_bewerkt AFTER INSERT OR UPDATE OR DELETE ON questions FOR EACH ROW EXECUTE FUNCTION vraag_bewerkt();

-- Antwoorden
CREATE OR REPLACE FUNCTION antwoord_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM markeer_route_bewerkt((
    SELECT rp.route_id FROM questions q JOIN route_points rp ON rp.id = q.route_point_id
    WHERE q.id = coalesce(NEW.question_id, OLD.question_id)));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS answer_options_bewerkt ON answer_options;
CREATE TRIGGER answer_options_bewerkt AFTER INSERT OR UPDATE OR DELETE ON answer_options FOR EACH ROW EXECUTE FUNCTION antwoord_bewerkt();

-- Items: plaatsen, verplaatsen, aanpassen en verwijderen tellen; oppakken, inzetten,
-- terugkomen en startitems (die horen bij het spelen) niet
CREATE OR REPLACE FUNCTION item_bewerkt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.is_startitem THEN PERFORM markeer_route_bewerkt(NEW.route_id); END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT OLD.is_startitem THEN PERFORM markeer_route_bewerkt(OLD.route_id); END IF;
  ELSIF NOT NEW.is_startitem AND (NEW.type, NEW.name, NEW.latitude, NEW.longitude, NEW.radius_meters, NEW.points_effect)
        IS DISTINCT FROM (OLD.type, OLD.name, OLD.latitude, OLD.longitude, OLD.radius_meters, OLD.points_effect) THEN
    PERFORM markeer_route_bewerkt(NEW.route_id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS special_items_bewerkt ON special_items;
CREATE TRIGGER special_items_bewerkt AFTER INSERT OR UPDATE OR DELETE ON special_items FOR EACH ROW EXECUTE FUNCTION item_bewerkt();

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 004 (was 004_pushmeldingen.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Pushmeldingen voor de beheerder: per toestel waar de meldingen heen moeten
-- (bij een ingestuurde foto of een hulpvraag van een team).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS push_abonnementen (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,              -- de beheerder (auth.users)
  endpoint        text        NOT NULL UNIQUE,       -- adres van de meldingendienst (Google/Apple/Mozilla)
  p256dh          text        NOT NULL,
  auth            text        NOT NULL,
  toestel         text,                              -- korte omschrijving, bv. "iPhone" of "Android"
  created_at      timestamptz NOT NULL DEFAULT now(),
  laatst_gebruikt timestamptz
);

-- Alleen de server (service-role) komt erbij: geen regels voor de openbare sleutel
ALTER TABLE push_abonnementen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_abonnementen FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 005 (was 005_spelers_vernieuwen.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- "Wijzigingen naar spelers sturen": tijdstip waarop de beheerder de spelers-apps de route
-- opnieuw laat inlezen (verschoven punten, nieuwe namen of stralen). De app kijkt elke paar
-- seconden of dit tijdstip veranderd is.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS spelers_vernieuwen_at timestamptz;

-- Hoort bij het spelen, niet bij het bewerken: telt niet mee voor "laatst aangepast" (migratie 003)
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at', 'spelers_vernieuwen_at'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 006 (was 006_correcties_en_eindtijd.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Punten handmatig aanpassen: bonus of aftrek per team, met een reden (tijdlijn en rapport)
-- 2. Eindtijd van het spel: daarna is iedereen gefinisht en telt de stand
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS score_correcties (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  delta       integer     NOT NULL,              -- + bonus, − aftrek
  reden       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS score_correcties_sessie_idx ON score_correcties (session_id);
-- Alleen de server (service-role) komt erbij
ALTER TABLE score_correcties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON score_correcties FROM anon, authenticated;

ALTER TABLE routes ADD COLUMN IF NOT EXISTS eindtijd timestamptz;

-- De eindtijd hoort bij het spelen, niet bij het bewerken: telt niet mee voor "laatst aangepast"
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at', 'spelers_vernieuwen_at', 'eindtijd'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 007 (was 007_vragenbank.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Vragenbank: vragen als favoriet markeren of uit de bank halen (de vraag blijft in zijn route).
-- Een aparte tabel, zodat dit niet telt als "laatst aangepast" van de route.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS vragenbank_markering (
  question_id uuid        PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  favoriet    boolean     NOT NULL DEFAULT false,
  verborgen   boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
-- Alleen de server (service-role) komt erbij
ALTER TABLE vragenbank_markering ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vragenbank_markering FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 008 (was 008_inloglinks.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Inloglinks: de beheerder stuurt een team een link waarmee het zonder loginnaam en wachtwoord
-- inlogt, voor een bepaalde tijd (bijv. een halve dag). Daarna wordt het team uitgelogd.
-- Alleen een hash van de code wordt bewaard; de link zelf staat nergens in de database.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS inlog_links (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  token_hash       text        NOT NULL UNIQUE,
  geldig_tot       timestamptz NOT NULL,
  ingetrokken      boolean     NOT NULL DEFAULT false,
  laatst_gebruikt  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inlog_links_speler_idx ON inlog_links (player_id);
-- Alleen de server (service-role) komt erbij
ALTER TABLE inlog_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON inlog_links FROM anon, authenticated;

-- Ingelogd via een link: tot dit moment. Daarna logt de app het team uit (null = geen limiet)
ALTER TABLE players ADD COLUMN IF NOT EXISTS toegang_tot timestamptz;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 009 (was 009_teambericht_en_telefoon.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Bericht aan één team: broadcasts.player_id (leeg = alle teams)
-- 2. Telefoonnummer per team: WhatsApp opent meteen de juiste chat, en bellen vanuit het beheer
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES players(id) ON DELETE CASCADE;

-- Spelers lezen alleen berichten aan iedereen en aan hun eigen team
DROP POLICY IF EXISTS "broadcasts_speler_lezen" ON broadcasts;
CREATE POLICY "broadcasts_speler_lezen" ON broadcasts FOR SELECT TO authenticated
  USING (NOT is_admin() AND (player_id IS NULL OR player_id IN (SELECT id FROM players WHERE auth_user_id = auth.uid())));

ALTER TABLE players ADD COLUMN IF NOT EXISTS telefoon text;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 010 (was 010_pauze.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Spel pauzeren: alle teams staan even stil (onweer, lunch, iemand kwijt).
-- routes.gepauzeerd_sinds: null = het spel loopt. Bij verder spelen schuift de eindtijd mee.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS gepauzeerd_sinds timestamptz;

-- Pauzeren hoort bij het spelen, niet bij het bewerken: telt niet mee voor "laatst aangepast"
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at', 'spelers_vernieuwen_at', 'eindtijd',
                              'gepauzeerd_sinds'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 011 (was 011_wachtwoord_bewaren.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Wachtwoord van een team versleuteld bewaren, zodat de beheerder bij opnieuw versturen hetzelfde
-- wachtwoord meestuurt (tenzij hij met 🎲 een nieuw kiest). Inloggen blijft via Supabase Auth gaan;
-- dit is alleen een versleutelde kopie die alleen de server kan openen.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE players ADD COLUMN IF NOT EXISTS wachtwoord_versleuteld text;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 012 (was 012_hele_route_zichtbaar.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Route op volgorde: de spelers zien meteen de hele route (alle punten en de lijn ertussen),
-- in plaats van alleen het volgende punt. Handig bij een ingelezen wandeling (GPX).
-- routes.alle_punten_zichtbaar: false = zoals altijd (alleen het volgende punt).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS alle_punten_zichtbaar boolean NOT NULL DEFAULT false;


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 013 (was 013_doorlooppunt.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Nieuwe soort punt: "doorlooppunt" (🚶 Doorlopen). De speler krijgt hier geen scherm; het punt
-- telt vanzelf als gepasseerd en het volgende punt verschijnt. Naast vraagpunt, informatiepunt en eindpunt.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE route_points DROP CONSTRAINT IF EXISTS route_points_type_check;
ALTER TABLE route_points ADD CONSTRAINT route_points_type_check
  CHECK (type IN ('vraagpunt', 'informatiepunt', 'eindpunt', 'doorlooppunt'));


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 014 (was 014_vraagopties_puzzel_verboden.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Per vraag: antwoorden husselen, een geluidsfragment en een tijdslimiet (elk aan of uit).
-- Per route: een puzzelwoord (elke goede vraag geeft een letter) en verboden gebieden op de kaart.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig. Wel een nieuwe opslagmap voor geluid (openbaar te lezen,
-- uploaden gaat alleen via de server).

-- Vragen
ALTER TABLE questions ADD COLUMN IF NOT EXISTS antwoorden_husselen boolean NOT NULL DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS geluid_pad text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tijdslimiet_seconden integer;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_tijdslimiet_check;
ALTER TABLE questions ADD CONSTRAINT questions_tijdslimiet_check
  CHECK (tijdslimiet_seconden IS NULL OR tijdslimiet_seconden BETWEEN 10 AND 600);

-- Puzzelwoord: leeg = uit. Bonus bij het goed raden aan de finish.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzelwoord text;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_bonus integer NOT NULL DEFAULT 100;
-- Omschrijving voor de spelers, bijv. "Een ander woord voor slot (7 letters)"
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_omschrijving text;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_opgelost boolean NOT NULL DEFAULT false;

-- Verboden gebieden: lijst van vlakken, elk { naam, punten: [[lat, lng], ...] }
ALTER TABLE routes ADD COLUMN IF NOT EXISTS verboden_gebieden jsonb;

-- Opslag voor geluidsfragmenten bij vragen
INSERT INTO storage.buckets (id, name, public) VALUES ('vraag-geluid', 'vraag-geluid', true)
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 015 (was 015_indexen_opruimen_foutlog.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Snellere zoekopdrachten (indexen), oude GPS-plekken na 30 dagen automatisch weg (AVG),
-- en een logboek van fouten die spelers en beheerders in de app tegenkomen.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

-- ── Indexen ─────────────────────────────────────────────────────────────────
-- Laatste plek en spoor per team (live kaart, dashboard, gelopen route)
CREATE INDEX IF NOT EXISTS location_updates_sessie_tijd_idx ON location_updates (session_id, created_at DESC);
-- Voortgang van één team bij één punt (bij elk bereikt punt en elk antwoord)
CREATE INDEX IF NOT EXISTS player_point_progress_sessie_punt_idx ON player_point_progress (session_id, route_point_id);
-- Punten van een route op volgorde
CREATE INDEX IF NOT EXISTS route_points_route_volgorde_idx ON route_points (route_id, order_index);
-- Lopende aanvallen op een team (spook, plek zooi)
CREATE INDEX IF NOT EXISTS special_item_effects_doel_tot_idx ON special_item_effects (target_session_id, expires_at);
-- Sessies van de actieve route per status
CREATE INDEX IF NOT EXISTS player_sessions_route_status_idx ON player_sessions (route_id, status);

-- ── Foutlogboek ─────────────────────────────────────────────────────────────
-- Alleen de server (service role) schrijft en leest; spelers en beheerders gaan via de API.
CREATE TABLE IF NOT EXISTS client_fouten (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  rol         text,                 -- admin, helper of speler
  wie         text,                 -- inlognaam of e-mail, om de fout terug te vinden
  pad         text,                 -- pagina waar het gebeurde
  bericht     text        NOT NULL,
  details     text,                 -- stack (ingekort)
  browser     text
);
CREATE INDEX IF NOT EXISTS client_fouten_tijd_idx ON client_fouten (created_at DESC);
ALTER TABLE client_fouten ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_fouten TO service_role;

-- ── Opruimen ────────────────────────────────────────────────────────────────
-- GPS-plekken en foutmeldingen ouder dan 30 dagen weg. Nu meteen, en daarna elke nacht om 03:00
-- (met pg_cron; lukt dat niet, dan gewoon een melding en ruimt de Systeemcheck-knop het op).
DELETE FROM location_updates WHERE created_at < now() - interval '30 days';
DELETE FROM client_fouten WHERE created_at < now() - interval '30 days';

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pointrush-opruimen';
  PERFORM cron.schedule('pointrush-opruimen', '0 3 * * *', $job$
    DELETE FROM public.location_updates WHERE created_at < now() - interval '30 days';
    DELETE FROM public.client_fouten WHERE created_at < now() - interval '30 days';
  $job$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Automatisch opruimen niet ingesteld (%): gebruik de knop in de Systeemcheck', SQLERRM;
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 016 (was 016_huisstijl_geluid_stemvraag.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Eigen huisstijl per route (kleur, logo, welkomstfoto), een geluidset per route en de stemvraag.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

-- 🎨 Huisstijl: leeg = de gewone PointRush-stijl
ALTER TABLE routes ADD COLUMN IF NOT EXISTS huisstijl_kleur text;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS huisstijl_logo_pad text;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS welkom_foto_pad text;
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_huisstijl_kleur_check;
ALTER TABLE routes ADD CONSTRAINT routes_huisstijl_kleur_check
  CHECK (huisstijl_kleur IS NULL OR huisstijl_kleur ~ '^#[0-9A-Fa-f]{6}$');

-- 🔔 Geluidset voor goed, fout, punt bereikt en finish
ALTER TABLE routes ADD COLUMN IF NOT EXISTS geluid_set text NOT NULL DEFAULT 'klassiek';
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_geluid_set_check;
ALTER TABLE routes ADD CONSTRAINT routes_geluid_set_check
  CHECK (geluid_set IN ('klassiek', 'arcade', 'zacht', 'feest'));

-- 🗳️ Stemvraag: de teams stemmen; wie met de meerderheid meestemde krijgt de punten zodra de stemming sluit
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('meerkeuze_tekst', 'meerkeuze_afbeelding', 'open', 'foto_opdracht', 'stemvraag'));
ALTER TABLE questions ADD COLUMN IF NOT EXISTS stem_gesloten boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 017 (was 017_puzzel_verdeling.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 🧩 Puzzelwoord aan of uit, en per vraag hoeveel letters een goed antwoord oplevert (0, 1 of 2).
-- Standaard geeft elke vraag één letter; is het woord korter of langer dan het aantal vragen, dan kiest
-- de beheerder welke vragen geen letter of twee letters geven.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_aan boolean;
-- { "<route_point_id>": 0 | 1 | 2 }; ontbreekt een punt, dan 1
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_verdeling jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 🧩 Punten voor het puzzelwoord, uitbetaald bij de finish:
--   puzzel_letter_punten per gevonden letter (standaard 10),
--   puzzel_bonus als alle letters met vragen gevonden zijn (standaard 100),
--   puzzel_raad_bonus als het team het woord zelf afmaakt (standaard 50).
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_letter_punten integer NOT NULL DEFAULT 10;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_raad_bonus integer NOT NULL DEFAULT 50;
-- Hoeveel letters al zijn uitbetaald (letters die later nog bijkomen, bijv. door een goedgekeurde foto, komen erbij)
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_letters_betaald integer NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 018 (was 018_puzzel_gok.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 🧩 Puzzelwoord afmaken bij de finish: één poging, binnen 1 minuut na de finish. En per route de volgorde van de letters.
-- De gok wordt bewaard, zodat de spelleider ziet wat elk team invulde en of het goed was.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.
-- Geen nieuwe tabel, dus geen extra GRANTs nodig.

ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_gok text;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_gok_goed boolean;
ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_gok_op timestamptz;

-- Volgorde waarin de letters vrijkomen: willekeurig (per team anders) of op volgorde (van links naar rechts)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS puzzel_volgorde text NOT NULL DEFAULT 'willekeurig';
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_puzzel_volgorde_check;
ALTER TABLE routes ADD CONSTRAINT routes_puzzel_volgorde_check CHECK (puzzel_volgorde IN ('willekeurig', 'op_volgorde'));

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 019 (was 019_seizoen_achtergronden.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 🗓️ Seizoensachtergronden: per thema (Halloween, Kerst, zomer, …) één achtergrond voor het welkomstscherm.
-- De app kiest op datum welke getoond wordt; een eigen welkomstfoto van de route gaat altijd voor.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS seizoen_achtergronden (
  thema       text        PRIMARY KEY,          -- sleutel uit lib/seizoenen.ts, bijv. "halloween"
  pad         text        NOT NULL,             -- bestand in de opslag "route-afbeeldingen"
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Alleen de server (service role) komt erbij; spelers krijgen de achtergrond via de pagina zelf
ALTER TABLE seizoen_achtergronden ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seizoen_achtergronden TO service_role;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 020 (was 020_seizoen_logos.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 🗓️ Seizoenslogo's: per thema (Halloween, Kerst, zomer, …) ook een eigen versie van het spellogo,
-- vierkant en breed. De app kiest op datum welke getoond wordt; zonder seizoenslogo het gewone logo.
-- Bouwt voort op migratie 019 (zelfde tabel, geen nieuwe tabel: de GRANT van 019 geldt ook hier).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE seizoen_achtergronden ALTER COLUMN pad DROP NOT NULL;              -- een thema mag alleen een logo hebben
ALTER TABLE seizoen_achtergronden ADD COLUMN IF NOT EXISTS logo_pad text;       -- vierkant logo (opslag "route-afbeeldingen")
ALTER TABLE seizoen_achtergronden ADD COLUMN IF NOT EXISTS logo_breed_pad text; -- breed logo (bovenbalk, rapport, beamer)

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 021 (was 021_score_negatief.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- ➖ Score mag onder 0: een bom, een fout antwoord met minpunten of een aftrek van de spelleider kost
-- altijd punten, ook als het team daardoor in de min komt. Zonder deze migratie blijft de score op 0 staan.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE player_sessions DROP CONSTRAINT IF EXISTS player_sessions_score_check;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 022 (was 022_routes_map_statistiek.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 📁 Routes ordenen in mappen (bijv. "Bedrijfsuitjes") en 📊 per vraag bewaren hoe vaak die goed ging,
-- ook na "Nieuw spel voorbereiden" (dan worden de antwoorden zelf gewist).
-- Geen nieuwe tabel, alleen kolommen bij routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS map text;                                      -- naam van de map, leeg = geen map
ALTER TABLE routes ADD COLUMN IF NOT EXISTS vraag_statistiek jsonb NOT NULL DEFAULT '{}'::jsonb;  -- { punt_id: { n, goed } }

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 023 (was 023_antwoord_uitleg.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 💬 Uitleg per antwoord van een meerkeuzevraag: waarom dit antwoord (niet) goed is. De speler ziet die na het
-- antwoorden. Optioneel; leeg = geen uitleg. Geen nieuwe tabel, alleen een kolom bij answer_options.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE answer_options ADD COLUMN IF NOT EXISTS uitleg text;   -- korte uitleg, leeg = geen

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 024 (was 024_puzzel_raad_start.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 🧩 Puzzelwoord raden bij de finish: de minuut loopt pas als het team op "Start" tikt (niet meer vanaf de
-- finish). Hier staat wanneer dat was. Leeg = nog niet gestart. Geen nieuwe tabel, alleen een kolom.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE player_sessions ADD COLUMN IF NOT EXISTS puzzel_raad_start timestamptz;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 025 (was 025_routes_vraag_punten.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- ❓ Standaard punten per vraag voor een route: een nieuwe vraag krijgt dit aantal (leeg = 65).
-- Geen nieuwe tabel, alleen een kolom bij routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS vraag_punten integer;

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 026 (was 026_routes_startvraag_meter.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- 🚶 Rondje: na het welkomstscherm loopt een team eerst een stukje voordat de eerste vraag komt. Hier staat
-- hoeveel meter (leeg = 25). Geen nieuwe tabel, alleen een kolom bij routes.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS startvraag_meter integer;

NOTIFY pgrst, 'reload schema';
