-- Per item instellen welke items een gefinisht team nog mag inzetten, bijvoorbeeld ["bom","spook"].
-- NULL = oude instelling (items_na_finish aan = alle items, uit = geen).
ALTER TABLE routes ADD COLUMN IF NOT EXISTS items_na_finish_types JSONB;

NOTIFY pgrst, 'reload schema';
