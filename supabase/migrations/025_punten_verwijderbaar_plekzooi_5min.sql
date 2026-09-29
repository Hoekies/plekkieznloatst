-- Routepunten waren niet te verwijderen zodra er ooit een sessie op had gespeeld:
-- deze twee koppelingen blokkeerden de DELETE, waardoor "Genereer punten in cirkel"
-- de oude punten stilletjes liet staan en spelers de oude kaart bleven zien.
ALTER TABLE session_point_order
  DROP CONSTRAINT IF EXISTS session_point_order_route_point_id_fkey,
  ADD CONSTRAINT session_point_order_route_point_id_fkey
    FOREIGN KEY (route_point_id) REFERENCES route_points(id) ON DELETE CASCADE;

ALTER TABLE player_sessions
  DROP CONSTRAINT IF EXISTS player_sessions_current_point_id_fkey,
  ADD CONSTRAINT player_sessions_current_point_id_fkey
    FOREIGN KEY (current_point_id) REFERENCES route_points(id) ON DELETE SET NULL;

-- Plek zooi standaard 5 minuten
ALTER TABLE routes ALTER COLUMN plekzooi_duur_seconden SET DEFAULT 300;
UPDATE routes SET plekzooi_duur_seconden = 300 WHERE plekzooi_duur_seconden = 120;
