
-- WebRTC signaling table for peer-to-peer video connections
CREATE TABLE public.webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX idx_webrtc_signals_session ON public.webrtc_signals(session_id);
CREATE INDEX idx_webrtc_signals_receiver ON public.webrtc_signals(receiver_id);

-- Enable RLS
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert signals
CREATE POLICY "Authenticated users can insert signals"
  ON public.webrtc_signals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can read signals addressed to them
CREATE POLICY "Users can read their signals"
  ON public.webrtc_signals FOR SELECT TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Users can delete their own signals
CREATE POLICY "Users can delete own signals"
  ON public.webrtc_signals FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Auto-cleanup old signals (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_webrtc_signals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.webrtc_signals WHERE created_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_webrtc_signals
  AFTER INSERT ON public.webrtc_signals
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_webrtc_signals();

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
