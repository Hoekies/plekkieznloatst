-- Voeg login_name toe aan de players tabel
-- Spelers loggen in met deze naam i.p.v. een e-mailadres
ALTER TABLE players ADD COLUMN IF NOT EXISTS login_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Maak login_name uniek (geen duplicaten)
CREATE UNIQUE INDEX IF NOT EXISTS players_login_name_idx ON players (login_name) WHERE login_name IS NOT NULL;
