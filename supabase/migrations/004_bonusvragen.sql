-- Migratie 004: ⚡ bonusvragen (28 oktober 2026)
--
-- De beheerder zet per route een of meer bonusvragen klaar (meerkeuze of een foto-opdracht). Na een ingesteld
-- aantal minuten speeltijd (of met "Nu sturen") komt de vraag bij alle teams tegelijk in beeld, voor een
-- ingestelde tijd. Eén poging per team. Wie het eerst goed antwoordt krijgt alle punten, de tweede (n-1)/n, enz.
-- Foto's tellen pas na goedkeuring, in de volgorde waarin ze zijn ingestuurd.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS bonus_vragen (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  vraag          text        NOT NULL,
  soort          text        NOT NULL CHECK (soort IN ('meerkeuze', 'foto')),
  keuzes         jsonb,                              -- meerkeuze: ["Rood", "Blauw", …]
  goed_index     integer,                            -- meerkeuze: welke keuze goed is (vanaf 0)
  punten         integer     NOT NULL DEFAULT 100 CHECK (punten > 0),
  na_minuten     integer     CHECK (na_minuten IS NULL OR na_minuten >= 0),  -- null = alleen met "Nu sturen"
  duur_seconden  integer     NOT NULL DEFAULT 300 CHECK (duur_seconden BETWEEN 30 AND 3600),
  gestart_op     timestamptz,                        -- moment dat hij bij iedereen in beeld kwam
  aantal_teams   integer,                            -- zoveel teams speelden toen hij startte (voor de punten)
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bonus_vragen_route ON bonus_vragen (route_id);

CREATE TABLE IF NOT EXISTS bonus_antwoorden (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_id       uuid        NOT NULL REFERENCES bonus_vragen(id) ON DELETE CASCADE,
  session_id     uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  keuze          integer,                            -- meerkeuze
  foto_pad       text,                               -- foto (opslag "foto-inzendingen")
  foto_status    text        CHECK (foto_status IS NULL OR foto_status IN ('wacht', 'goedgekeurd', 'afgekeurd')),
  is_correct     boolean,                            -- null = foto nog in de keuring
  punten         integer     NOT NULL DEFAULT 0,
  beantwoord_op  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bonus_id, session_id)                      -- één poging per team
);

-- Alleen de server (service_role) komt erbij; spelers krijgen alles via de app
ALTER TABLE bonus_vragen ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_antwoorden ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonus_vragen TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonus_antwoorden TO service_role;

NOTIFY pgrst, 'reload schema';
