-- Verspreid: teams (1, 2, 3 …) die het rondje in tegengestelde richting lopen, bijvoorbeeld [2]
ALTER TABLE routes ADD COLUMN IF NOT EXISTS omgekeerde_teams JSONB NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
