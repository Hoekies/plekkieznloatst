-- ══════════════════════════════════════════════════════════════════════════════
-- Plekkie z'n Loatst — Migratie 005: Dief + Radar + Inventaris
-- ══════════════════════════════════════════════════════════════════════════════

-- ── CHECK constraint special_items.type uitbreiden ────────────────────────────
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'special_items'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE special_items DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE special_items
  ADD CONSTRAINT special_items_type_check
  CHECK (type IN ('spook', 'bom', 'ster', 'verdubbeling', 'wissel', 'dief', 'radar'));

-- ── CHECK constraint special_item_effects.effect_type uitbreiden ──────────────
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'special_item_effects'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%effect_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE special_item_effects DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE special_item_effects
  ADD CONSTRAINT special_item_effects_effect_type_check
  CHECK (effect_type IN ('ghost', 'punt_aftrek', 'verdubbeling', 'wissel', 'diefstal', 'radar'));

-- ── used_at kolom voor inventaris-tracking ────────────────────────────────────
-- NULL = item is in inventaris maar nog niet gebruikt
-- NOT NULL = item is gebruikt, timestamp van gebruik
ALTER TABLE special_items
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NULL DEFAULT NULL;
