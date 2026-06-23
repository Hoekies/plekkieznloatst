ALTER TABLE routes
  ADD COLUMN respawn_minuten INTEGER NOT NULL DEFAULT 15 CHECK (respawn_minuten > 0);
