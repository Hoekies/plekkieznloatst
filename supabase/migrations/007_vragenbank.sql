-- Vragenbank: vragen als favoriet markeren of uit de bank halen (de vraag blijft in zijn route).
-- Een aparte tabel, zodat dit niet telt als "laatst aangepast" van de route.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS vragenbank_markering (
  question_id uuid        PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  favoriet    boolean     NOT NULL DEFAULT false,
  verborgen   boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
-- Alleen de server (service-role) komt erbij
ALTER TABLE vragenbank_markering ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vragenbank_markering FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
