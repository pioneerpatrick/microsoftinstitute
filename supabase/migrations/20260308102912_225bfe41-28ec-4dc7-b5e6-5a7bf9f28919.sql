
-- Create storage bucket for session files
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-files', 'session-files', true);

-- RLS policies for session-files bucket
CREATE POLICY "Staff can upload session files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-files' AND
  is_staff(auth.uid())
);

CREATE POLICY "Authenticated can view session files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'session-files');

CREATE POLICY "Staff can delete session files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-files' AND
  is_staff(auth.uid())
);

-- Table to track shared files in sessions
CREATE TABLE public.session_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view session files"
ON public.session_files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can upload session files"
ON public.session_files FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()) AND auth.uid() = uploaded_by);

CREATE POLICY "Staff can delete session files"
ON public.session_files FOR DELETE
TO authenticated
USING (is_staff(auth.uid()));

-- Enable realtime for session files
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_files;
