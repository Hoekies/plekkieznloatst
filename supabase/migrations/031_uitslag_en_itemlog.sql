-- Uitslag pas zichtbaar als de beheerder hem vrijgeeft (na het keuren van de foto's)
ALTER TABLE routes ADD COLUMN IF NOT EXISTS uitslag_vrijgegeven BOOLEAN NOT NULL DEFAULT false;

-- Logboek van ingezette items: wie zette wat in, op welk team, en wat gebeurde er.
-- Nodig voor het terugkijkscherm ("welke items heb ik gebruikt en van wie kreeg ik er één").
CREATE TABLE IF NOT EXISTS item_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gebruiker_session_id UUID REFERENCES player_sessions(id) ON DELETE CASCADE, -- NULL bij plek zooi
  doel_session_id UUID REFERENCES player_sessions(id) ON DELETE CASCADE,      -- NULL zonder doelteam
  item_type TEXT NOT NULL,
  omschrijving TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_log_gebruiker_idx ON item_log(gebruiker_session_id);
CREATE INDEX IF NOT EXISTS item_log_doel_idx ON item_log(doel_session_id);

ALTER TABLE item_log ENABLE ROW LEVEL SECURITY;
-- Geen policies: alleen de service-role (admin-client in de API-routes) leest en schrijft.

-- Antwoorden kunnen minpunten opleveren (migratie 028): de oude regel "points_awarded >= 0"
-- liet zo'n antwoord mislukken. De score van een team zakt nog steeds nooit onder 0.
ALTER TABLE player_point_progress DROP CONSTRAINT IF EXISTS player_point_progress_points_awarded_check;

NOTIFY pgrst, 'reload schema';
