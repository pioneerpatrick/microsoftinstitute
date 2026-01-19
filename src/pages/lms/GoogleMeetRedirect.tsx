import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Video, Shield, Loader2, ExternalLink, Check, X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Session {
  id: string;
  title: string;
  meeting_url: string | null;
  moderation_enabled: boolean;
  status: string;
  instructor_id: string | null;
  courses: {
    title: string;
  };
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

const GoogleMeetRedirect = () => {
  const { sessionId } = useParams();
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [accessStatus, setAccessStatus] = useState<'checking' | 'approved' | 'pending' | 'denied' | 'open'>('checking');
  const [hasOpened, setHasOpened] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  const isInstructor = session?.instructor_id === user?.id || isStaff;

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

  // Auto-open for instructors and setup moderation
  useEffect(() => {
    if (!session || !user) return;

    // Staff/Instructors - auto-open and setup moderation
    if (isInstructor) {
      setAccessStatus('approved');
      recordAttendance();
      
      // Auto-open Google Meet for instructors
      if (session.meeting_url && !hasOpened) {
        setHasOpened(true);
        window.open(session.meeting_url, '_blank');
      }

      // Fetch and subscribe to join requests for moderation
      if (session.moderation_enabled) {
        fetchJoinRequests();
        
        const channel = supabase
          .channel(`instructor-requests-${session.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'live_session_requests',
              filter: `session_id=eq.${session.id}`
            },
            () => {
              fetchJoinRequests();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
      return;
    }

    // Non-moderated sessions are open
    if (!session.moderation_enabled) {
      setAccessStatus('open');
      recordAttendance();
      return;
    }

    // Students - check if approved
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
  }, [session, user, isInstructor]);

  const fetchJoinRequests = async () => {
    if (!sessionId) return;

    const { data: requestsData } = await supabase
      .from('live_session_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('requested_at', { ascending: true });

    if (!requestsData || requestsData.length === 0) {
      setJoinRequests([]);
      return;
    }

    const userIds = requestsData.map(r => r.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const combinedData = requestsData.map(request => ({
      ...request,
      profiles: profilesMap.get(request.user_id) || { full_name: 'Unknown User', email: 'No email' }
    }));

    setJoinRequests(combinedData as unknown as JoinRequest[]);
  };

  const handleJoinRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('live_session_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
      })
      .eq('id', requestId);

    if (error) {
      toast.error(`Failed to ${status} request`);
    } else {
      toast.success(`Student ${status === 'approved' ? 'approved' : 'rejected'}`);
      fetchJoinRequests();
    }
  };

  const approveAllPending = async () => {
    const pendingRequests = joinRequests.filter(r => r.status === 'pending');
    for (const request of pendingRequests) {
      await handleJoinRequest(request.id, 'approved');
    }
    toast.success(`Approved ${pendingRequests.length} students`);
  };

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

  // Instructor view with moderation panel
  if (isInstructor && session) {
    const pendingRequests = joinRequests.filter(r => r.status === 'pending');
    const approvedRequests = joinRequests.filter(r => r.status === 'approved');

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-16 border-b bg-background flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lms/instructor/live-sessions')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{session.title}</h1>
              {session.courses?.title && (
                <p className="text-sm text-muted-foreground">{session.courses.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {approvedRequests.length} joined
            </Badge>
            <Button onClick={openGoogleMeet}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Meet
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Meeting Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Video className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Meeting Opened</h3>
                    <p className="text-sm text-muted-foreground">Google Meet in new tab</p>
                  </div>
                </div>
                <Button variant="outline" onClick={openGoogleMeet} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Meet Again
                </Button>
              </CardContent>
            </Card>

            {/* Pending Requests */}
            {session.moderation_enabled && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Waiting Room</h3>
                      {pendingRequests.length > 0 && (
                        <Badge variant="destructive">{pendingRequests.length}</Badge>
                      )}
                    </div>
                    {pendingRequests.length > 0 && (
                      <Button size="sm" onClick={approveAllPending}>
                        Approve All
                      </Button>
                    )}
                  </div>

                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No pending requests
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {request.profiles?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.profiles?.email}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleJoinRequest(request.id, 'approved')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleJoinRequest(request.id, 'rejected')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Approved Students */}
          {session.moderation_enabled && approvedRequests.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Approved Students ({approvedRequests.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {approvedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm"
                    >
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">{request.profiles?.full_name || request.profiles?.email}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Student waiting room
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

  // Student approved - show join button
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
