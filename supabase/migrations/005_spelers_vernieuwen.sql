-- "Wijzigingen naar spelers sturen": tijdstip waarop de beheerder de spelers-apps de route
-- opnieuw laat inlezen (verschoven punten, nieuwe namen of stralen). De app kijkt elke paar
-- seconden of dit tijdstip veranderd is.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS spelers_vernieuwen_at timestamptz;

-- Hoort bij het spelen, niet bij het bewerken: telt niet mee voor "laatst aangepast" (migratie 003)
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at', 'spelers_vernieuwen_at'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';
