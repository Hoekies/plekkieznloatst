-- ══════════════════════════════════════════════════════════════════════════════
-- Plekkie z'n Loatst — Migratie 001: Schema, constraints en indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- ── routes ───────────────────────────────────────────────────────────────────
CREATE TABLE routes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'concept'
                          CHECK (status IN ('concept', 'gepubliceerd')),
  is_active   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Maximaal één actieve route tegelijk
CREATE UNIQUE INDEX routes_one_active_idx
  ON routes (is_active) WHERE is_active = true;

-- ── route_points ──────────────────────────────────────────────────────────────
CREATE TABLE route_points (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  order_index    integer     NOT NULL,
  type           text        NOT NULL
                             CHECK (type IN ('vraagpunt', 'informatiepunt', 'eindpunt')),
  name           text        NOT NULL,
  description    text,
  latitude       float8      NOT NULL,
  longitude      float8      NOT NULL,
  radius_meters  integer     NOT NULL DEFAULT 10
                             CHECK (radius_meters >= 1),
  points         integer     NOT NULL DEFAULT 0
                             CHECK (points >= 0),
  image_path     text,
  sound_path     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, order_index)
);

CREATE INDEX route_points_route_id_idx ON route_points (route_id);

-- ── questions ─────────────────────────────────────────────────────────────────
CREATE TABLE questions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_point_id        uuid        NOT NULL REFERENCES route_points(id) ON DELETE CASCADE,
  type                  text        NOT NULL
                                    CHECK (type IN ('meerkeuze_tekst', 'meerkeuze_afbeelding', 'open')),
  question_text         text        NOT NULL,
  question_image_path   text,
  points                integer     NOT NULL DEFAULT 0
                                    CHECK (points >= 0),
  -- Alleen voor open vragen:
  correct_text_answers  text[],
  numeric_answer        float8,
  numeric_tolerance     float8      CHECK (numeric_tolerance IS NULL OR numeric_tolerance >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX questions_route_point_id_idx ON questions (route_point_id);

-- ── answer_options ────────────────────────────────────────────────────────────
CREATE TABLE answer_options (
  id           uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index  integer  NOT NULL,
  color        text     NOT NULL CHECK (color IN ('geel', 'blauw', 'rood')),
  answer_type  text     NOT NULL CHECK (answer_type IN ('tekst', 'afbeelding')),
  text         text,
  image_path   text,
  is_correct   boolean  NOT NULL DEFAULT false,
  UNIQUE (question_id, order_index),
  UNIQUE (question_id, color)
);

CREATE INDEX answer_options_question_id_idx ON answer_options (question_id);

-- ── players ───────────────────────────────────────────────────────────────────
CREATE TABLE players (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name       text        NOT NULL,
  auth_user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_device_id text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id)
);

-- ── player_sessions ───────────────────────────────────────────────────────────
CREATE TABLE player_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  route_id         uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  current_point_id uuid        REFERENCES route_points(id),
  score            integer     NOT NULL DEFAULT 0 CHECK (score >= 0),
  status           text        NOT NULL DEFAULT 'actief'
                               CHECK (status IN ('actief', 'voltooid', 'vervallen'))
);

-- Maximaal één actieve sessie per speler
CREATE UNIQUE INDEX player_sessions_one_active_idx
  ON player_sessions (player_id) WHERE status = 'actief';

CREATE INDEX player_sessions_player_id_idx  ON player_sessions (player_id);
CREATE INDEX player_sessions_route_id_idx   ON player_sessions (route_id);
CREATE INDEX player_sessions_status_idx     ON player_sessions (status);

-- ── player_point_progress ─────────────────────────────────────────────────────
CREATE TABLE player_point_progress (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id     uuid        NOT NULL REFERENCES route_points(id)  ON DELETE CASCADE,
  reached_at         timestamptz NOT NULL DEFAULT now(),
  answered_at        timestamptz,
  selected_answer_id uuid        REFERENCES answer_options(id),
  open_answer_text   text,
  is_correct         boolean,
  points_awarded     integer     NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  UNIQUE (session_id, route_point_id),
  -- Niet beide antwoordvelden tegelijk gevuld
  CONSTRAINT antwoord_xor CHECK (
    NOT (selected_answer_id IS NOT NULL AND open_answer_text IS NOT NULL)
  )
);

CREATE INDEX player_point_progress_session_id_idx     ON player_point_progress (session_id);
CREATE INDEX player_point_progress_route_point_id_idx ON player_point_progress (route_point_id);

-- ── location_updates ──────────────────────────────────────────────────────────
CREATE TABLE location_updates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  latitude         float8      NOT NULL,
  longitude        float8      NOT NULL,
  accuracy_meters  float8      NOT NULL CHECK (accuracy_meters >= 0),
  -- Afgeronde positie (~50m) voor het tonen aan andere spelers
  public_latitude  float8      NOT NULL,
  public_longitude float8      NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX location_updates_session_id_idx  ON location_updates (session_id);
CREATE INDEX location_updates_created_at_idx  ON location_updates (created_at DESC);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER route_points_updated_at
  BEFORE UPDATE ON route_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Supabase Storage buckets ──────────────────────────────────────────────────
-- Uitvoeren via Supabase dashboard of Storage API:
--   Bucket "route-afbeeldingen"  (public: false, max 500KB)
--   Bucket "vraag-afbeeldingen"  (public: false, max 500KB)
--   Bucket "geluiden"            (public: false)
