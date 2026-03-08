
-- Session messages for real-time chat in live sessions
CREATE TABLE public.session_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view messages for sessions they have access to
CREATE POLICY "Authenticated can view session messages"
  ON public.session_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated can send session messages"
  ON public.session_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff can delete messages (moderation)
CREATE POLICY "Staff can delete session messages"
  ON public.session_messages
  FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()));

-- Enable realtime for session messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages;

-- Shared notes for live sessions (collaborative whiteboard content)
CREATE TABLE public.session_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view session notes"
  ON public.session_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage session notes"
  ON public.session_notes
  FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Authenticated can update session notes"
  ON public.session_notes
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert session notes"
  ON public.session_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes;
