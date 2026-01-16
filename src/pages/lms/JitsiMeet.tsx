import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Video, Mic, MicOff, VideoOff, Phone, Users } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const JitsiMeet = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get('room') || sessionId;
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [isJitsiLoaded, setIsJitsiLoaded] = useState(false);
  const [api, setApi] = useState<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (sessionId && user) {
      fetchSession();
      recordAttendance();
    }
  }, [sessionId, user]);

  useEffect(() => {
    // Load Jitsi Meet External API script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => setIsJitsiLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (api) {
        api.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (isJitsiLoaded && jitsiContainerRef.current && roomName && user) {
      initJitsi();
    }
  }, [isJitsiLoaded, roomName, user]);

  const fetchSession = async () => {
    if (!sessionId) return;
    
    const { data } = await supabase
      .from('live_sessions')
      .select(`
        *,
        courses (title)
      `)
      .eq('id', sessionId)
      .single();

    if (data) {
      setSession(data);
    }
  };

  const recordAttendance = async () => {
    if (!sessionId || !user) return;

    await supabase
      .from('live_session_attendance')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        joined_at: new Date().toISOString()
      });
  };

  const updateAttendance = async () => {
    if (!sessionId || !user) return;

    const { data } = await supabase
      .from('live_session_attendance')
      .select('id, joined_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const durationSeconds = Math.floor(
        (new Date().getTime() - new Date(data.joined_at).getTime()) / 1000
      );

      await supabase
        .from('live_session_attendance')
        .update({
          left_at: new Date().toISOString(),
          duration_seconds: durationSeconds
        })
        .eq('id', data.id);
    }
  };

  const initJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: `MicrosoftInstitute_${roomName}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: user?.user_metadata?.full_name || user?.email || 'Student',
        email: user?.email
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        enableClosePage: false,
        toolbarButtons: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'chat',
          'recording',
          'livestreaming',
          'etherpad',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'participants-pane',
          'tileview',
          'select-background',
          'mute-everyone'
        ]
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        DEFAULT_LOGO_URL: '',
        DEFAULT_WELCOME_PAGE_LOGO_URL: '',
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'desktop',
          'fullscreen',
          'hangup',
          'chat',
          'raisehand',
          'tileview',
          'participants-pane'
        ]
      }
    };

    const jitsiApi = new window.JitsiMeetExternalAPI(domain, options);

    jitsiApi.addEventListeners({
      readyToClose: () => {
        updateAttendance();
        navigate('/lms/live-sessions');
      },
      participantJoined: (participant: any) => {
        console.log('Participant joined:', participant);
      },
      participantLeft: (participant: any) => {
        console.log('Participant left:', participant);
      }
    });

    setApi(jitsiApi);
  };

  const handleLeave = () => {
    if (api) {
      api.executeCommand('hangup');
    }
    updateAttendance();
    navigate('/lms/live-sessions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLeave}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">
              {session?.title || 'Live Session'}
            </h1>
            {session?.courses?.title && (
              <p className="text-sm text-muted-foreground">
                {session.courses.title}
              </p>
            )}
          </div>
        </div>
        <Button variant="destructive" onClick={handleLeave}>
          <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />
          Leave Session
        </Button>
      </header>

      {/* Jitsi Container */}
      <div className="flex-1 relative">
        {!isJitsiLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading video conference...</p>
            </div>
          </div>
        )}
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full"
          style={{ minHeight: 'calc(100vh - 64px)' }}
        />
      </div>
    </div>
  );
};

export default JitsiMeet;
