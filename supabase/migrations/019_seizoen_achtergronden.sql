-- 🗓️ Seizoensachtergronden: per thema (Halloween, Kerst, zomer, …) één achtergrond voor het welkomstscherm.
-- De app kiest op datum welke getoond wordt; een eigen welkomstfoto van de route gaat altijd voor.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS seizoen_achtergronden (
  thema       text        PRIMARY KEY,          -- sleutel uit lib/seizoenen.ts, bijv. "halloween"
  pad         text        NOT NULL,             -- bestand in de opslag "route-afbeeldingen"
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Alleen de server (service role) komt erbij; spelers krijgen de achtergrond via de pagina zelf
ALTER TABLE seizoen_achtergronden ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seizoen_achtergronden TO service_role;

NOTIFY pgrst, 'reload schema';
