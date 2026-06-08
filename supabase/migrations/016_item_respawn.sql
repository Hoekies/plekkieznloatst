ALTER TABLE routes
  ADD COLUMN item_respawn BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN items_last_rotated_at TIMESTAMPTZ;

ALTER TABLE special_items
  ADD COLUMN respawn_at TIMESTAMPTZ;
