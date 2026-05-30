-- Explicit grants for Data API access (required for all projects from Oct 30 2026).
-- See: https://github.com/orgs/supabase/discussions/45329
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/zqmgdlaqsjomagzguxna/sql

-- This is an internal tool — anonymous access is never valid.
-- Revoke all table-level grants from the anon role (belt-and-suspenders with RLS).
REVOKE ALL ON public.profiles  FROM anon;
REVOKE ALL ON public.equipment FROM anon;
REVOKE ALL ON public.bookings  FROM anon;

-- Authenticated users get explicit grants. RLS (see previous migration) further
-- restricts what each user can see or modify within these grants.
GRANT SELECT, INSERT, UPDATE         ON public.profiles  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings  TO authenticated;
