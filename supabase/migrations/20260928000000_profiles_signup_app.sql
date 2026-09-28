-- Which app each user registered on: 'booking' (instrument booking) or 'grab'.
-- Both apps share one account table; this only decides which admin page lists the user.
-- Run in the Supabase SQL editor. Safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_app text
  CHECK (signup_app IN ('booking', 'grab'));

-- New profiles take the app recorded at sign-up (auth metadata signup_app).
CREATE OR REPLACE FUNCTION public.profiles_set_signup_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.signup_app IS NULL THEN
    SELECT CASE WHEN u.raw_user_meta_data->>'signup_app' IN ('booking', 'grab')
                THEN u.raw_user_meta_data->>'signup_app' END
      INTO NEW.signup_app
      FROM auth.users u WHERE u.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_signup_app ON public.profiles;
CREATE TRIGGER profiles_set_signup_app
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_set_signup_app();

-- Backfill existing users (admins can correct any of these on the admin pages):
--   1. sign-up metadata, if recorded
--   2. registered before Grab launched (2026-09-21 15:04 +08) → booking
--   3. has bookings → booking; has Grab activity → grab
--   4. otherwise left NULL ("unassigned")
UPDATE public.profiles p
SET signup_app = CASE
  WHEN u.raw_user_meta_data->>'signup_app' IN ('booking', 'grab') THEN u.raw_user_meta_data->>'signup_app'
  WHEN u.created_at < '2026-09-21 07:04:00+00' THEN 'booking'
  WHEN EXISTS (SELECT 1 FROM public.bookings b WHERE b.user_id = p.id) THEN 'booking'
  WHEN EXISTS (SELECT 1 FROM public.grab_events e WHERE e.creator_id = p.id)
    OR EXISTS (SELECT 1 FROM public.grab_participants g WHERE g.user_id = p.id) THEN 'grab'
END
FROM auth.users u
WHERE u.id = p.id AND p.signup_app IS NULL;
