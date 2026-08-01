-- Mist-badges: prestaties per plaats ("Verkenner van Berghem") en algemene mijlpalen.
-- Alles hangt via session_id aan player_sessions met ON DELETE CASCADE, zodat badges
-- automatisch alleen binnen één spel gelden (admin-reset verwijdert alle sessies).

-- Hoeveel cellen heeft een sessie per plaats vrijgespeeld
CREATE TABLE mist_plaats_voortgang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  plaats TEXT NOT NULL,
  cellen INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, plaats)
);
CREATE INDEX mist_plaats_voortgang_session_idx ON mist_plaats_voortgang(session_id);

-- Behaalde badges (UNIQUE voorkomt dubbel toekennen)
-- plaats is bewust NOT NULL met lege string voor algemene badges: Postgres beschouwt
-- NULL-waarden in een UNIQUE-constraint als onderling verschillend, waardoor algemene
-- badges anders bij elke GPS-ronde opnieuw toegekend zouden worden.
CREATE TABLE mist_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  plaats TEXT NOT NULL DEFAULT '',   -- lege string = algemene badge
  behaald_op TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, code, plaats)
);
CREATE INDEX mist_badges_session_idx ON mist_badges(session_id);

-- Gedeelde cache zodat Nominatim zelden geraakt wordt (rate limit: 1 verzoek/seconde)
CREATE TABLE plaats_cache (
  cel_key TEXT PRIMARY KEY,          -- lat/lng afgerond op ~500 m
  plaats TEXT,                       -- NULL = bewust "niet gevonden"
  opgehaald_op TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onthouden waar de plaats voor het laatst bepaald is, om herhaald opzoeken te vermijden
ALTER TABLE player_sessions
  ADD COLUMN mist_plaats TEXT,
  ADD COLUMN mist_plaats_lat DOUBLE PRECISION,
  ADD COLUMN mist_plaats_lng DOUBLE PRECISION;

ALTER TABLE mist_plaats_voortgang ENABLE ROW LEVEL SECURITY;
ALTER TABLE mist_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaats_cache ENABLE ROW LEVEL SECURITY;
-- Geen policies: alleen de service-role (via de admin-client in de API-routes) raakt
-- deze tabellen, zoals overal elders in deze app.
