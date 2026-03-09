
-- Create student-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);

-- Allow admins/staff to upload student photos
CREATE POLICY "Staff can upload student photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-photos' AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()));

-- Allow admins/staff to update/delete
CREATE POLICY "Staff can manage student photos" ON storage.objects FOR ALL
  USING (bucket_id = 'student-photos' AND auth.uid() IS NOT NULL AND public.is_staff(auth.uid()));

-- Allow authenticated to view
CREATE POLICY "Anyone can view student photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-photos');

-- Allow students to upload own photo
CREATE POLICY "Students can upload own photo" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-photos' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);
