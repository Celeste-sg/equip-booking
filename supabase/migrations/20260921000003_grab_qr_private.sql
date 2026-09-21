-- Grab: pickup QR images are visible only to the uploader and to the creator
-- of the event that the QR belongs to (previously any logged-in user could read them).
DROP POLICY IF EXISTS "grab_qr_select" ON storage.objects;

CREATE POLICY "grab_qr_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'grab-qr'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.grab_participants p
        WHERE p.qr_path = storage.objects.name
          AND public.is_grab_creator(p.event_id)
      )
    )
  );
