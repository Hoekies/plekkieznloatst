-- ══════════════════════════════════════════════════════════════════════════════
-- PointRush (Plekkie z'n Loatst) — volledig databaseschema
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Dit is de samengevoegde eindstand van de oude migraties 001 t/m 038 (oktober 2026).
-- Alleen nodig voor een NIEUW, leeg Supabase-project: voer het in één keer uit in de
-- SQL Editor. De bestaande database heeft dit allemaal al — daar niet opnieuw uitvoeren.
-- Nieuwe wijzigingen komen als 002_…, 003_… enz. in deze map.
--
-- Na het uitvoeren, via het Supabase-dashboard:
--   1. Storage: maak de buckets "foto-inzendingen", "route-afbeeldingen" en
--      "vraag-afbeeldingen" aan (niet openbaar).
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
