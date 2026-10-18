-- 1. Punten handmatig aanpassen: bonus of aftrek per team, met een reden (tijdlijn en rapport)
-- 2. Eindtijd van het spel: daarna is iedereen gefinisht en telt de stand
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS score_correcties (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  delta       integer     NOT NULL,              -- + bonus, − aftrek
  reden       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS score_correcties_sessie_idx ON score_correcties (session_id);
-- Alleen de server (service-role) komt erbij
ALTER TABLE score_correcties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON score_correcties FROM anon, authenticated;

ALTER TABLE routes ADD COLUMN IF NOT EXISTS eindtijd timestamptz;

-- De eindtijd hoort bij het spelen, niet bij het bewerken: telt niet mee voor "laatst aangepast"
CREATE OR REPLACE FUNCTION route_bewerkt_op() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  spelvelden text[] := ARRAY['updated_at', 'bewerkt_op', 'is_active', 'status', 'tussenstand_trigger_at',
                              'uitslag_vrijgegeven', 'items_last_rotated_at', 'spelers_vernieuwen_at', 'eindtijd'];
BEGIN
  IF (to_jsonb(NEW) - spelvelden) IS DISTINCT FROM (to_jsonb(OLD) - spelvelden) THEN
    NEW.bewerkt_op := now();
  END IF;
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';
