import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Video, Shield, Clock, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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

const GoogleMeetRedirect = () => {
  const { sessionId } = useParams();
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [accessStatus, setAccessStatus] = useState<'checking' | 'approved' | 'pending' | 'denied' | 'open'>('checking');
  const [hasOpened, setHasOpened] = useState(false);

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

  const openGoogleMeet = () => {
    if (session?.meeting_url) {
      setHasOpened(true);
      window.open(session.meeting_url, '_blank');
    } else {
      toast.error('No meeting link available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Waiting room for pending students
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

  // Approved - show join button
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
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{session?.title}</h2>
            {session?.courses?.title && (
              <p className="text-muted-foreground mb-6">{session.courses.title}</p>
            )}
            
            {session?.meeting_url ? (
              <>
                {!hasOpened ? (
                  <Button size="lg" onClick={openGoogleMeet} className="w-full">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Join Google Meet
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Meeting opened in a new tab
                    </p>
                    <Button variant="outline" onClick={openGoogleMeet} className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Again
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/lms/live-sessions')} className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sessions
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="text-destructive mb-4">No meeting link available</p>
                <Button variant="outline" onClick={() => navigate('/lms/live-sessions')}>
                  Back to Sessions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleMeetRedirect;
