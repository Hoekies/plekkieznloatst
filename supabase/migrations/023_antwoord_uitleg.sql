-- 💬 Uitleg per antwoord van een meerkeuzevraag: waarom dit antwoord (niet) goed is. De speler ziet die na het
-- antwoorden. Optioneel; leeg = geen uitleg. Geen nieuwe tabel, alleen een kolom bij answer_options.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE answer_options ADD COLUMN IF NOT EXISTS uitleg text;   -- korte uitleg, leeg = geen

NOTIFY pgrst, 'reload schema';
