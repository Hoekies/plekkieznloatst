-- Verspreid: per team een zelfgekozen instappunt, bijvoorbeeld {"1": "<punt-id>", "3": "<punt-id>"}.
-- Teams zonder keuze krijgen het automatisch berekende instappunt.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS instappunten JSONB NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
