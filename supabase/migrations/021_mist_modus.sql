-- Mist-modus: teams spelen mist weg door te lopen, sterren per weggespeelde m².
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_modus_check;
ALTER TABLE routes ADD CONSTRAINT routes_modus_check
  CHECK (modus IN ('sequentieel', 'verspreid', 'mist'));

ALTER TABLE routes
  ADD COLUMN mist_m2_per_ster INTEGER NOT NULL DEFAULT 2500 CHECK (mist_m2_per_ster > 0),
  ADD COLUMN start_latitude DOUBLE PRECISION,
  ADD COLUMN start_longitude DOUBLE PRECISION;

CREATE TABLE mist_voortgang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  cell_x INTEGER NOT NULL,
  cell_y INTEGER NOT NULL,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, cell_x, cell_y)
);
CREATE INDEX mist_voortgang_session_idx ON mist_voortgang(session_id);

ALTER TABLE mist_voortgang ENABLE ROW LEVEL SECURITY;
-- Geen policies: alleen de service-role (via de admin-client in de API-routes) raakt
-- deze tabel, zoals overal elders in deze app.
