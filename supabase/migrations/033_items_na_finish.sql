-- Per route: mogen gefinishte teams hun items nog inzetten tot de uitslag is vrijgegeven?
ALTER TABLE routes ADD COLUMN IF NOT EXISTS items_na_finish BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
