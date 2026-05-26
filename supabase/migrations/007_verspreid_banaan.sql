-- Verspreid-modus op routes
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS modus TEXT NOT NULL DEFAULT 'sequentieel';

ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_modus_check;
ALTER TABLE routes ADD CONSTRAINT routes_modus_check
  CHECK (modus IN ('sequentieel', 'verspreid'));

-- Punt-volgorde per sessie (voor verspreid-modus en banaan-swaps)
CREATE TABLE IF NOT EXISTS session_point_order (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  volgorde       INTEGER NOT NULL,
  route_point_id UUID NOT NULL REFERENCES route_points(id),
  UNIQUE (session_id, volgorde),
  UNIQUE (session_id, route_point_id)
);

ALTER TABLE session_point_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eigen sessie zien" ON session_point_order;
CREATE POLICY "eigen sessie zien" ON session_point_order
  FOR SELECT USING (
    session_id IN (
      SELECT ps.id FROM player_sessions ps
      JOIN players p ON p.id = ps.player_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Banaan toevoegen aan special_items type
ALTER TABLE special_items DROP CONSTRAINT IF EXISTS special_items_type_check;
ALTER TABLE special_items ADD CONSTRAINT special_items_type_check
  CHECK (type IN ('spook','bom','ster','verdubbeling','wissel','dief','radar','banaan'));

-- Banaan toevoegen aan special_item_effects effect_type
ALTER TABLE special_item_effects DROP CONSTRAINT IF EXISTS special_item_effects_effect_type_check;
ALTER TABLE special_item_effects ADD CONSTRAINT special_item_effects_effect_type_check
  CHECK (effect_type IN ('ghost','punt_aftrek','verdubbeling','wissel','diefstal','radar','banaan'));
