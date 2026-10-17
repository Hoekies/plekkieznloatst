-- Pushmeldingen voor de beheerder: per toestel waar de meldingen heen moeten
-- (bij een ingestuurde foto of een hulpvraag van een team).
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS push_abonnementen (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,              -- de beheerder (auth.users)
  endpoint        text        NOT NULL UNIQUE,       -- adres van de meldingendienst (Google/Apple/Mozilla)
  p256dh          text        NOT NULL,
  auth            text        NOT NULL,
  toestel         text,                              -- korte omschrijving, bv. "iPhone" of "Android"
  created_at      timestamptz NOT NULL DEFAULT now(),
  laatst_gebruikt timestamptz
);

-- Alleen de server (service-role) komt erbij: geen regels voor de openbare sleutel
ALTER TABLE push_abonnementen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_abonnementen FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
