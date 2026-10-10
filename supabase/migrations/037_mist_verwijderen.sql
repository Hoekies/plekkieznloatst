-- Mist-modus volledig verwijderd uit de app.
-- LET OP: dit verwijdert ook alle bestaande mist-routes (met hun punten, vragen en sessies).

-- Mist-routes en alles wat eraan hangt (punten, vragen, sessies via ON DELETE CASCADE)
DELETE FROM routes WHERE modus = 'mist';

-- Alleen nog sequentieel en verspreid
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_modus_check;
ALTER TABLE routes ADD CONSTRAINT routes_modus_check CHECK (modus IN ('sequentieel', 'verspreid'));

-- Mist-tabellen
DROP TABLE IF EXISTS mist_voortgang;
DROP TABLE IF EXISTS mist_badges;
DROP TABLE IF EXISTS mist_plaats_voortgang;
DROP TABLE IF EXISTS plaats_cache;

-- Mist-kolommen
ALTER TABLE routes
  DROP COLUMN IF EXISTS mist_m2_per_ster,
  DROP COLUMN IF EXISTS start_latitude,
  DROP COLUMN IF EXISTS start_longitude;
ALTER TABLE player_sessions
  DROP COLUMN IF EXISTS mist_plaats,
  DROP COLUMN IF EXISTS mist_plaats_lat,
  DROP COLUMN IF EXISTS mist_plaats_lng;

NOTIFY pgrst, 'reload schema';
