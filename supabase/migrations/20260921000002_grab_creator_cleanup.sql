-- Grab: let an event's creator delete participants' pickup QR files
-- (used when the creator deletes the whole event).
CREATE POLICY "grab_qr_delete_by_creator" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'grab-qr'
    AND EXISTS (
      SELECT 1 FROM public.grab_participants p
      WHERE p.qr_path = storage.objects.name
        AND public.is_grab_creator(p.event_id)
    )
  );
