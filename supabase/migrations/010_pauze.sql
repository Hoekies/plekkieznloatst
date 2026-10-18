-- Spel pauzeren: alle teams staan even stil (onweer, lunch, iemand kwijt).
-- routes.gepauzeerd_sinds: null = het spel loopt. Bij verder spelen schuift de eindtijd mee.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS gepauzeerd_sinds timestamptz;

-- Pauzeren hoort bij het spelen, niet bij het bewerken: telt niet mee voor "laatst aangepast"
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at', 'spelers_vernieuwen_at', 'eindtijd',
                              'gepauzeerd_sinds'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';
