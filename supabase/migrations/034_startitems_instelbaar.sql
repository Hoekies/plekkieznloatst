-- Per route instelbaar welke items elk team bij de start gratis in de balk krijgt,
-- bijvoorbeeld {"banaan": 1, "bom": 2}. Sequentieel had altijd vast één banaan: die blijft de standaard.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS startitems JSONB;
UPDATE routes SET startitems = '{"banaan": 1}'::jsonb WHERE startitems IS NULL AND modus = 'sequentieel';

NOTIFY pgrst, 'reload schema';
