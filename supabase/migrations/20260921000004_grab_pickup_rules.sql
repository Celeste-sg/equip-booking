-- Grab pickup rules. Safe to re-run.
--  * anyone may start a pickup event (no organiser-only restriction)
--  * nobody can submit a pickup code to their own pickup event
--  * grab_pickup_organizer_id(): the "featured" organiser whose pickup is pinned on the home page

CREATE OR REPLACE FUNCTION public.grab_pickup_organizer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE lower(email) = 'pusiyueva@gmail.com' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.grab_pickup_organizer_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grab_pickup_organizer_id() TO authenticated;

-- Restore the original (unrestricted) event policies in case an earlier version was run.
DROP POLICY IF EXISTS "grab_events_insert" ON public.grab_events;
CREATE POLICY "grab_events_insert" ON public.grab_events
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "grab_events_update" ON public.grab_events;
CREATE POLICY "grab_events_update" ON public.grab_events
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR public.is_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "grab_participants_insert" ON public.grab_participants;
CREATE POLICY "grab_participants_insert" ON public.grab_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.grab_events e
      WHERE e.id = event_id
        AND e.status = 'open'
        AND e.deadline > now()
        AND NOT (e.type = 'pickup' AND e.creator_id = auth.uid())
        AND (
          e.max_participants IS NULL
          OR (SELECT count(*) FROM public.grab_participants p WHERE p.event_id = e.id) < e.max_participants
        )
    )
  );
