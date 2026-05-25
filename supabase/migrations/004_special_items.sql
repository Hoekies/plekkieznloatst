-- ══════════════════════════════════════════════════════════════════════════════
-- Plekkie z'n Loatst — Migratie 004: Speciale items (Spook, Bom, Ster, etc.)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── special_items ─────────────────────────────────────────────────────────────
CREATE TABLE special_items (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id              uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  type                  text        NOT NULL
                                    CHECK (type IN ('spook', 'bom', 'ster', 'verdubbeling', 'wissel')),
  name                  text        NOT NULL,
  latitude              float8      NOT NULL,
  longitude             float8      NOT NULL,
  radius_meters         integer     NOT NULL DEFAULT 15 CHECK (radius_meters >= 1),
  -- Signed: positief = bonus (ster), negatief = aftrek (bom), 0 = geen punteneffect (spook, verdubbeling, wissel)
  points_effect         integer     NOT NULL DEFAULT 0,
  claimed               boolean     NOT NULL DEFAULT false,
  claimed_by_session_id uuid        REFERENCES player_sessions(id),
  claimed_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX special_items_route_id_idx ON special_items (route_id);
CREATE INDEX special_items_claimed_idx  ON special_items (claimed);

CREATE TRIGGER special_items_updated_at
  BEFORE UPDATE ON special_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── special_item_effects ──────────────────────────────────────────────────────
-- Actieve effecten op een speler-sessie. Aangemaakt na het claimen + kiezen van doelteam.
CREATE TABLE special_item_effects (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  special_item_id     uuid        NOT NULL REFERENCES special_items(id) ON DELETE CASCADE,
  -- target_session_id = eigen sessie voor verdubbeling, anders het doelteam
  target_session_id   uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  effect_type         text        NOT NULL
                                  CHECK (effect_type IN ('ghost', 'punt_aftrek', 'verdubbeling', 'wissel')),
  expires_at          timestamptz,           -- alleen voor ghost (10 minuten)
  applied_at          timestamptz NOT NULL DEFAULT now(),
  notification        text,
  UNIQUE (special_item_id, target_session_id)
);

CREATE INDEX special_item_effects_target_session_idx ON special_item_effects (target_session_id);
CREATE INDEX special_item_effects_expires_at_idx     ON special_item_effects (expires_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE special_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_item_effects ENABLE ROW LEVEL SECURITY;

-- Admin: volledige toegang
CREATE POLICY "special_items_admin_alles" ON special_items
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Spelers: unclaimed items op actieve route lezen (voor de kaart)
CREATE POLICY "special_items_speler_lezen" ON special_items
  FOR SELECT TO authenticated
  USING (
    NOT is_admin() AND
    route_id IN (SELECT id FROM routes WHERE is_active = true)
  );

-- Admin: volledige toegang tot effecten
CREATE POLICY "special_item_effects_admin_alles" ON special_item_effects
  FOR ALL TO authenticated
  USING    (is_admin())
  WITH CHECK (is_admin());

-- Spelers: eigen effecten lezen (effects op eigen sessie)
CREATE POLICY "special_item_effects_speler_eigen" ON special_item_effects
  FOR SELECT TO authenticated
  USING (
    NOT is_admin() AND
    target_session_id IN (
      SELECT id FROM player_sessions WHERE player_id = mijn_player_id()
    )
  );

-- ── Realtime replication ──────────────────────────────────────────────────────
-- Voer dit uit via het Supabase SQL-editor (dashboard):
--   ALTER PUBLICATION supabase_realtime ADD TABLE special_items;
--   ALTER PUBLICATION supabase_realtime ADD TABLE special_item_effects;
