-- H1: Revoke direct is_correct column access from players
REVOKE SELECT (is_correct) ON answer_options FROM authenticated;

-- L1: Copy rol from user_metadata to app_metadata for all existing users
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', raw_user_meta_data->>'rol')
WHERE raw_user_meta_data ? 'rol';

-- Update is_admin() function to use app_metadata
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin',
    false
  );
$$;

-- L2: Remove direct player read on location_updates table
DROP POLICY IF EXISTS location_updates_speler_public_lezen ON location_updates;
