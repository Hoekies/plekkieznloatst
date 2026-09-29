ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS spook_duur_seconden INTEGER NOT NULL DEFAULT 600 CHECK (spook_duur_seconden > 0);
