
-- Session polls table
CREATE TABLE public.session_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  poll_type TEXT NOT NULL DEFAULT 'poll',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view session polls"
ON public.session_polls FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage session polls"
ON public.session_polls FOR ALL
TO authenticated
USING (is_staff(auth.uid()));

-- Session poll responses table
CREATE TABLE public.session_poll_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.session_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer INTEGER NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.session_poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view poll responses"
ON public.session_poll_responses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can submit own response"
ON public.session_poll_responses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_poll_responses;

-- Indexes
CREATE INDEX idx_session_polls_session ON public.session_polls(session_id);
CREATE INDEX idx_poll_responses_poll ON public.session_poll_responses(poll_id);
