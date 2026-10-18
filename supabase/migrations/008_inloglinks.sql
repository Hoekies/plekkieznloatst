-- Inloglinks: de beheerder stuurt een team een link waarmee het zonder loginnaam en wachtwoord
-- inlogt, voor een bepaalde tijd (bijv. een halve dag). Daarna wordt het team uitgelogd.
-- Alleen een hash van de code wordt bewaard; de link zelf staat nergens in de database.
--
-- Uitvoeren: Supabase → SQL Editor → dit hele bestand plakken → Run. Mag vaker gedraaid worden.

CREATE TABLE IF NOT EXISTS inlog_links (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  token_hash       text        NOT NULL UNIQUE,
  geldig_tot       timestamptz NOT NULL,
  ingetrokken      boolean     NOT NULL DEFAULT false,
  laatst_gebruikt  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inlog_links_speler_idx ON inlog_links (player_id);
-- Alleen de server (service-role) komt erbij
ALTER TABLE inlog_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON inlog_links FROM anon, authenticated;

-- Ingelogd via een link: tot dit moment. Daarna logt de app het team uit (null = geen limiet)
ALTER TABLE players ADD COLUMN IF NOT EXISTS toegang_tot timestamptz;

NOTIFY pgrst, 'reload schema';
