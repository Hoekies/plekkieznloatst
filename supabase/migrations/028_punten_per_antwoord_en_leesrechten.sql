-- Punten per antwoord. NULL = standaard: het goede antwoord krijgt de punten van de vraag,
-- de andere antwoorden 0. Ingevuld telt die waarde, ook negatief.
ALTER TABLE answer_options ADD COLUMN IF NOT EXISTS punten INTEGER;

-- Beveiliging: ingelogde spelers konden deze tabellen rechtstreeks via de API lezen, inclusief
-- de goede antwoorden, de antwoorden op open vragen, QR-codes en de locaties van plekzooi-vallen.
-- De kolom-REVOKE uit migratie 015 werkte niet, omdat Supabase 'authenticated' leesrecht op de
-- hele tabel geeft. De app leest deze tabellen alleen via de server (service role), dus spelers
-- hebben hier geen direct leesrecht nodig.
REVOKE SELECT ON answer_options FROM anon, authenticated;
REVOKE SELECT ON questions FROM anon, authenticated;
REVOKE SELECT ON route_points FROM anon, authenticated;
REVOKE SELECT ON special_items FROM anon, authenticated;
