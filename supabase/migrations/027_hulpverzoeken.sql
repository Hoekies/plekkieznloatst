-- Meldingen van teams dat hun volgende punt niet te bereiken is (afgesloten, onveilig, …).
-- De admin kan het punt dan vrijgeven of de melding negeren.
CREATE TABLE IF NOT EXISTS hulpverzoeken (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id uuid        REFERENCES route_points(id) ON DELETE SET NULL,
  status         text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'toegekend', 'genegeerd')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  afgehandeld_at timestamptz
);

CREATE INDEX IF NOT EXISTS hulpverzoeken_session_idx ON hulpverzoeken (session_id);

-- Alleen via de server (service role); spelers en admin lopen via de API-routes
ALTER TABLE hulpverzoeken ENABLE ROW LEVEL SECURITY;
