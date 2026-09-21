-- Grab: every pickup organiser uploads their own payment QR codes.
-- Files live in the private grab-pay bucket at users/<uid>/alipay and users/<uid>/wechat.
-- Anyone logged in can read them (payers need to see the organiser's code);
-- only the owner can write. Safe to re-run.

DROP POLICY IF EXISTS "grab_pay_insert" ON storage.objects;
CREATE POLICY "grab_pay_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'grab-pay'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "grab_pay_update" ON storage.objects;
CREATE POLICY "grab_pay_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'grab-pay'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'grab-pay'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "grab_pay_delete" ON storage.objects;
CREATE POLICY "grab_pay_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'grab-pay'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
