-- ══════════════════════════════════════════════════════════════════════════════
-- Migratie 010: Gelijkmatige teamverdeling voor verspreid-modus
--   • verwacht_aantal_teams — admin geeft op hoeveel teams er spelen
--   • doel_afstand_km       — admin geeft de gewenste totale routelengte op
--     (gebruikt voor de aanbevolen-afstand cirkel in de editor)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS verwacht_aantal_teams INTEGER NOT NULL DEFAULT 2
  CONSTRAINT routes_teams_check CHECK (verwacht_aantal_teams >= 2);

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS doel_afstand_km FLOAT8 NOT NULL DEFAULT 0;
