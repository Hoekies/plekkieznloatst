-- Herstel: migraties 013, 017 en 022 bleken niet op de database te staan.
-- Alles is idempotent (IF NOT EXISTS), dus dit kan veilig opnieuw gedraaid worden.

-- 013: ster- en bomwaarde per route
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS ster_waarde INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS bom_waarde INTEGER NOT NULL DEFAULT 30;

-- 017: na hoeveel minuten opgepakte items terugkomen (verspreid + respawn)
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS respawn_minuten INTEGER NOT NULL DEFAULT 15 CHECK (respawn_minuten > 0);

-- 022: mist-badges per plaats en algemene mijlpalen
CREATE TABLE IF NOT EXISTS mist_plaats_voortgang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  plaats TEXT NOT NULL,
  cellen INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, plaats)
);
CREATE INDEX IF NOT EXISTS mist_plaats_voortgang_session_idx ON mist_plaats_voortgang(session_id);

CREATE TABLE IF NOT EXISTS mist_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  plaats TEXT NOT NULL DEFAULT '',   -- lege string = algemene badge
  behaald_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, code, plaats)
);
CREATE INDEX IF NOT EXISTS mist_badges_session_idx ON mist_badges(session_id);

CREATE TABLE IF NOT EXISTS plaats_cache (
  cel_key TEXT PRIMARY KEY,
  plaats TEXT,
  opgehaald_op TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE player_sessions
  ADD COLUMN IF NOT EXISTS mist_plaats TEXT,
  ADD COLUMN IF NOT EXISTS mist_plaats_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mist_plaats_lng DOUBLE PRECISION;

ALTER TABLE mist_plaats_voortgang ENABLE ROW LEVEL SECURITY;
ALTER TABLE mist_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaats_cache ENABLE ROW LEVEL SECURITY;

-- Supabase laat de API de nieuwe kolommen meteen zien
NOTIFY pgrst, 'reload schema';
