-- Startitems: items die een team bij het begin krijgt (bij Sequentieel: één banaan).
-- Ze liggen meteen in de inventaris, staan nooit op een kaart en worden bij een reset verwijderd.
ALTER TABLE special_items ADD COLUMN IF NOT EXISTS is_startitem BOOLEAN NOT NULL DEFAULT false;

-- Een opgepakt item mag het verwijderen van een sessie niet blokkeren (Reset spel liep hierop vast)
ALTER TABLE special_items
  DROP CONSTRAINT IF EXISTS special_items_claimed_by_session_id_fkey,
  ADD CONSTRAINT special_items_claimed_by_session_id_fkey
    FOREIGN KEY (claimed_by_session_id) REFERENCES player_sessions(id) ON DELETE SET NULL;
