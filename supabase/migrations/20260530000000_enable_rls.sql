-- Enable Row-Level Security on all public tables.
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/zqmgdlaqsjomagzguxna/sql

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper: check if the calling user has the 'admin' role.
-- SECURITY DEFINER bypasses RLS on the inner query, preventing infinite
-- recursion when profiles policies reference this function.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- profiles
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users see their own profile; admins see all profiles.
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- On sign-up the app upserts the user's own profile row.
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users update their own profile; admins update any.
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- equipment
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can browse the equipment list.
CREATE POLICY "equipment_select"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);

-- Only admins may add, modify, or remove equipment.
CREATE POLICY "equipment_insert"
  ON public.equipment FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "equipment_update"
  ON public.equipment FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "equipment_delete"
  ON public.equipment FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- bookings
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all bookings (needed for the equipment
-- calendar view and conflict checking before creating a new booking).
CREATE POLICY "bookings_select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (true);

-- Users can only book in their own name.
CREATE POLICY "bookings_insert"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update (e.g. cancel) their own bookings; admins can update any.
CREATE POLICY "bookings_update"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Only admins can hard-delete a booking row.
CREATE POLICY "bookings_delete"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.is_admin());
