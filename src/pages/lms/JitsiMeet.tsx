import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Video, Phone, Shield, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Session {
  id: string;
  title: string;
  meeting_url: string | null;
  moderation_enabled: boolean;
  status: string;
  courses: {
    title: string;
  };
}

const JitsiMeet = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get('room') || sessionId;
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isJitsiLoaded, setIsJitsiLoaded] = useState(false);
  const [api, setApi] = useState<any>(null);
  const [accessStatus, setAccessStatus] = useState<'checking' | 'approved' | 'pending' | 'denied' | 'open'>('checking');
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (sessionId && user) {
      fetchSession();
    }
  }, [sessionId, user]);

  // Check access and setup realtime subscription
  useEffect(() => {
    if (!session || !user) return;

    // Staff always have access
    if (isStaff) {
      setAccessStatus('approved');
      recordAttendance();
      return;
    }

    // Non-moderated sessions are open
    if (!session.moderation_enabled) {
      setAccessStatus('open');
      recordAttendance();
      return;
    }

    // Check if user has approval
    const checkAccess = async () => {
      const { data } = await supabase
        .from('live_session_requests')
        .select('status')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.status === 'approved') {
        setAccessStatus('approved');
        recordAttendance();
      } else if (data?.status === 'pending') {
        setAccessStatus('pending');
      } else if (data?.status === 'rejected') {
        setAccessStatus('denied');
      } else {
        // Auto-request access if not requested yet
        await requestAccess();
      }
    };

    checkAccess();

    // Subscribe to realtime updates for approval status
    const channel = supabase
      .channel(`my-request-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_requests',
          filter: `session_id=eq.${session.id}`
        },
        (payload: any) => {
          if (payload.new && payload.new.user_id === user.id) {
            if (payload.new.status === 'approved') {
              setAccessStatus('approved');
              toast.success('You have been approved to join!');
              recordAttendance();
            } else if (payload.new.status === 'rejected') {
              setAccessStatus('denied');
              toast.error('Your request was denied');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, user, isStaff]);

  const requestAccess = async () => {
    if (!session || !user) return;

    const { error } = await supabase
      .from('live_session_requests')
      .insert({
        session_id: session.id,
        user_id: user.id,
        status: 'pending'
      });

    if (!error) {
      setAccessStatus('pending');
      toast.info('Waiting for instructor approval...');
    } else if (error.code === '23505') {
      // Already requested
      setAccessStatus('pending');
    }
  };

  useEffect(() => {
    // Load Jitsi Meet External API script
    const existingScript = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
    
    if (existingScript) {
      setIsJitsiLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      console.log('Jitsi script loaded');
      setIsJitsiLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Jitsi script');
      toast.error('Failed to load video conference');
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on cleanup - it might be needed
    };
  }, []);

  // Cleanup api on unmount
  useEffect(() => {
    return () => {
      if (api) {
        console.log('Disposing Jitsi API');
        api.dispose();
      }
    };
  }, [api]);

  useEffect(() => {
    const shouldLoadJitsi = accessStatus === 'approved' || accessStatus === 'open';
    if (isJitsiLoaded && jitsiContainerRef.current && roomName && user && shouldLoadJitsi && !api) {
      console.log('Initializing Jitsi - conditions met');
      initJitsi();
    }
  }, [isJitsiLoaded, roomName, user, accessStatus, api]);

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
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) {
      console.error('Jitsi container or API not ready');
      return;
    }

    // Clear any existing content
    jitsiContainerRef.current.innerHTML = '';

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
        // Whiteboard config for Jitsi
        whiteboard: {
          enabled: true,
          collabServerBaseUrl: 'https://excalidraw.com'
        },
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
          'whiteboard',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'participants-pane',
          'tileview',
          'select-background',
          'mute-everyone',
          'security'
        ]
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        DEFAULT_LOGO_URL: '',
        DEFAULT_WELCOME_PAGE_LOGO_URL: '',
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        FILM_STRIP_MAX_HEIGHT: 120,
        VERTICAL_FILMSTRIP: true
      }
    };

    console.log('Initializing Jitsi with options:', options);

    try {
      const jitsiApi = new window.JitsiMeetExternalAPI(domain, options);

      jitsiApi.addEventListeners({
        videoConferenceJoined: () => {
          console.log('Video conference joined successfully');
        },
        videoConferenceLeft: () => {
          console.log('Video conference left');
          updateAttendance();
        },
        readyToClose: () => {
          updateAttendance();
          navigate('/lms/live-sessions');
        },
        participantJoined: (participant: any) => {
          console.log('Participant joined:', participant);
        },
        participantLeft: (participant: any) => {
          console.log('Participant left:', participant);
        },
        errorOccurred: (error: any) => {
          console.error('Jitsi error:', error);
        }
      });

      setApi(jitsiApi);
    } catch (error) {
      console.error('Failed to initialize Jitsi:', error);
      toast.error('Failed to initialize video conference');
    }
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

  // Waiting room for pending/denied students
  if (accessStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-16 border-b bg-background flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lms/live-sessions')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{session?.title || 'Live Session'}</h1>
              {session?.courses?.title && (
                <p className="text-sm text-muted-foreground">{session.courses.title}</p>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Waiting Room</h2>
              <p className="text-muted-foreground mb-6">
                Please wait for the instructor to approve your request to join this session.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for approval...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (accessStatus === 'denied') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-16 border-b bg-background flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lms/live-sessions')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{session?.title || 'Live Session'}</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                Your request to join this session was not approved by the instructor.
              </p>
              <Button onClick={() => navigate('/lms/live-sessions')}>
                Back to Sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (accessStatus === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
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
