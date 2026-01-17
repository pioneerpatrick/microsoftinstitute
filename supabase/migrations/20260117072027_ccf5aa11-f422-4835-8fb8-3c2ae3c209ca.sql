-- Create table for live session join requests
CREATE TABLE public.live_session_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.live_session_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can request to join"
ON public.live_session_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests"
ON public.live_session_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all requests"
ON public.live_session_requests
FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update requests"
ON public.live_session_requests
FOR UPDATE
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete requests"
ON public.live_session_requests
FOR DELETE
USING (is_staff(auth.uid()));

-- Add unique constraint to prevent duplicate requests
ALTER TABLE public.live_session_requests 
ADD CONSTRAINT unique_session_user_request UNIQUE (session_id, user_id);

-- Add moderation_enabled column to live_sessions
ALTER TABLE public.live_sessions 
ADD COLUMN moderation_enabled BOOLEAN DEFAULT true;

-- Enable realtime for join requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_requests;