-- Grab: the organiser's WeChat ID and group QR image are visible only to the
-- organiser and to people who joined the event. Kept in their own table because
-- RLS is row-level (grab_events itself is readable by every logged-in user).
-- Safe to re-run; also upgrades a database that already ran the earlier group-image migration.

CREATE TABLE IF NOT EXISTS public.grab_event_private (
  event_id         uuid PRIMARY KEY REFERENCES public.grab_events(id) ON DELETE CASCADE,
  wechat_id        text,
  group_image_path text
);

ALTER TABLE public.grab_event_private ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grab_event_private FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grab_event_private TO authenticated;

DROP POLICY IF EXISTS "grab_event_private_select" ON public.grab_event_private;
CREATE POLICY "grab_event_private_select" ON public.grab_event_private
  FOR SELECT TO authenticated
  USING (
    public.is_grab_creator(event_id)
    OR EXISTS (
      SELECT 1 FROM public.grab_participants p
      WHERE p.event_id = grab_event_private.event_id AND p.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "grab_event_private_insert" ON public.grab_event_private;
CREATE POLICY "grab_event_private_insert" ON public.grab_event_private
  FOR INSERT TO authenticated WITH CHECK (public.is_grab_creator(event_id));
DROP POLICY IF EXISTS "grab_event_private_update" ON public.grab_event_private;
CREATE POLICY "grab_event_private_update" ON public.grab_event_private
  FOR UPDATE TO authenticated
  USING (public.is_grab_creator(event_id)) WITH CHECK (public.is_grab_creator(event_id));
DROP POLICY IF EXISTS "grab_event_private_delete" ON public.grab_event_private;
CREATE POLICY "grab_event_private_delete" ON public.grab_event_private
  FOR DELETE TO authenticated USING (public.is_grab_creator(event_id));

-- Move existing data: group-order WeChat IDs were stored in grab_events.note,
-- and an earlier version kept the image path in grab_events.group_image_path.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'grab_events' AND column_name = 'group_image_path') THEN
    EXECUTE $q$
      INSERT INTO public.grab_event_private (event_id, wechat_id, group_image_path)
      SELECT id, CASE WHEN type = 'group_order' THEN note END, group_image_path
      FROM public.grab_events
      WHERE group_image_path IS NOT NULL OR (type = 'group_order' AND note IS NOT NULL)
      ON CONFLICT (event_id) DO NOTHING
    $q$;
    EXECUTE 'ALTER TABLE public.grab_events DROP COLUMN group_image_path';
  ELSE
    INSERT INTO public.grab_event_private (event_id, wechat_id)
    SELECT id, note FROM public.grab_events WHERE type = 'group_order' AND note IS NOT NULL
    ON CONFLICT (event_id) DO NOTHING;
  END IF;
  UPDATE public.grab_events SET note = NULL WHERE type = 'group_order';
END $$;

-- Group image files: readable only if the caller can see the matching private row
-- (RLS on grab_event_private applies inside this subquery) or owns the file.
DROP POLICY IF EXISTS "grab_group_select" ON storage.objects;
CREATE POLICY "grab_group_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'grab-group'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.grab_event_private gp WHERE gp.group_image_path = storage.objects.name)
    )
  );
