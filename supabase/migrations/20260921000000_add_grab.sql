-- Grab: coffee / milk-tea pickup and group-order module.
-- Reuses public.profiles as the shared user table. Run in the Supabase SQL editor.

CREATE TABLE public.grab_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 text NOT NULL CHECK (type IN ('pickup', 'group_order')),
  creator_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name           text NOT NULL CHECK (length(trim(store_name)) > 0),
  location_text        text,
  note                 text,
  deadline             timestamptz NOT NULL,
  expected_pickup_time timestamptz,
  max_participants     int CHECK (max_participants IS NULL OR max_participants > 0),
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz
);
CREATE INDEX grab_events_status_deadline_idx ON public.grab_events (status, deadline);
CREATE INDEX grab_events_creator_idx ON public.grab_events (creator_id);

CREATE TABLE public.grab_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.grab_events(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pickup_code   text,
  quantity      int CHECK (quantity IS NULL OR quantity > 0),
  note          text,
  pickup_status text NOT NULL DEFAULT 'pending' CHECK (pickup_status IN ('pending', 'picked_up')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX grab_participants_user_idx ON public.grab_participants (user_id);

-- profiles is only readable by its owner (and admins), so expose just id + name
-- for displaying who created / joined an event.
CREATE OR REPLACE FUNCTION public.grab_profile_names()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, COALESCE(NULLIF(p.name, ''), split_part(p.email, '@', 1)) FROM public.profiles p;
$$;
REVOKE ALL ON FUNCTION public.grab_profile_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grab_profile_names() TO authenticated;

-- Creator check as a function so participants policies don't depend on RLS recursion.
CREATE OR REPLACE FUNCTION public.is_grab_creator(eid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.grab_events WHERE id = eid AND creator_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_grab_creator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_grab_creator(uuid) TO authenticated;

ALTER TABLE public.grab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grab_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.grab_events FROM anon;
REVOKE ALL ON public.grab_participants FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grab_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grab_participants TO authenticated;

-- Events
CREATE POLICY "grab_events_select" ON public.grab_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "grab_events_insert" ON public.grab_events
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "grab_events_update" ON public.grab_events
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR public.is_admin())
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());
CREATE POLICY "grab_events_delete" ON public.grab_events
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid() OR public.is_admin());

-- Participants: joining is only allowed while the event is open, before the
-- deadline, and (if set) below max_participants.
CREATE POLICY "grab_participants_select" ON public.grab_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "grab_participants_insert" ON public.grab_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.grab_events e
      WHERE e.id = event_id
        AND e.status = 'open'
        AND e.deadline > now()
        AND (
          e.max_participants IS NULL
          OR (SELECT count(*) FROM public.grab_participants p WHERE p.event_id = e.id) < e.max_participants
        )
    )
  );
CREATE POLICY "grab_participants_update" ON public.grab_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_grab_creator(event_id))
  WITH CHECK (user_id = auth.uid() OR public.is_grab_creator(event_id));
CREATE POLICY "grab_participants_delete" ON public.grab_participants
  FOR DELETE TO authenticated
  USING (
    public.is_grab_creator(event_id)
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.grab_events e
        WHERE e.id = event_id AND e.status = 'open' AND e.deadline > now()
      )
    )
  );
