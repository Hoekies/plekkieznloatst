-- ══════════════════════════════════════════════════════════════════════════════
-- Plekkie z'n Loatst — Migratie 003: Foto-opdracht, QR-unlock, Broadcasts
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Nieuw vraagtype: foto_opdracht ─────────────────────────────────────────
ALTER TABLE questions DROP CONSTRAINT questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
  CHECK (type IN ('meerkeuze_tekst', 'meerkeuze_afbeelding', 'open', 'foto_opdracht'));

-- ── 2. Foto-inzendingen tabel ─────────────────────────────────────────────────
-- Eén foto per team per punt. Admin keurt goed of af.
CREATE TABLE foto_inzendingen (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid        NOT NULL REFERENCES player_sessions(id) ON DELETE CASCADE,
  route_point_id    uuid        NOT NULL REFERENCES route_points(id)    ON DELETE CASCADE,
  foto_pad          text        NOT NULL,
  status            text        NOT NULL DEFAULT 'wacht'
                                CHECK (status IN ('wacht', 'goedgekeurd', 'afgekeurd')),
  punten_toegekend  integer     NOT NULL DEFAULT 0 CHECK (punten_toegekend >= 0),
  beoordeeld_op     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, route_point_id)
);

CREATE INDEX foto_inzendingen_status_idx         ON foto_inzendingen (status);
CREATE INDEX foto_inzendingen_route_point_id_idx ON foto_inzendingen (route_point_id);
CREATE INDEX foto_inzendingen_session_id_idx     ON foto_inzendingen (session_id);

-- Storage bucket aanmaken via Supabase dashboard:
--   Bucket "foto-inzendingen"  (public: false, alleen server-side toegang)

-- ── 3. QR-unlock kolommen op route_points ────────────────────────────────────
ALTER TABLE route_points
  ADD COLUMN qr_unlock_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN qr_secret         text;

-- ── 4. Broadcasts tabel ───────────────────────────────────────────────────────
-- Admin stuurt berichten naar alle actieve spelers via Realtime.
CREATE TABLE broadcasts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bericht    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Realtime replication inschakelen voor broadcasts:
-- Voer uit in Supabase SQL-editor:
--   ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;
