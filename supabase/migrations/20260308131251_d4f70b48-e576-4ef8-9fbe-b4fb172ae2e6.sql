
-- Allow authenticated users to upload files to session-files bucket
CREATE POLICY "Authenticated users can upload session files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'session-files');

-- Allow authenticated users to read session files
CREATE POLICY "Authenticated users can read session files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'session-files');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own session files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'session-files');

-- Also fix live_session_attendance RLS - allow authenticated users to insert
CREATE POLICY "Authenticated users can insert attendance"
ON public.live_session_attendance FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to read attendance
CREATE POLICY "Authenticated users can read attendance"
ON public.live_session_attendance FOR SELECT TO authenticated
USING (true);

-- Allow users to update their own attendance
CREATE POLICY "Users can update own attendance"
ON public.live_session_attendance FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Fix live_sessions read access
CREATE POLICY "Authenticated users can read live sessions"
ON public.live_sessions FOR SELECT TO authenticated
USING (true);
