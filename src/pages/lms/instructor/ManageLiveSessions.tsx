import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Video, 
  Trash2, 
  Calendar,
  Clock,
  Users,
  Play,
  ExternalLink,
  Copy,
  Shield,
  Check,
  X,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  status: string;
  course_id: string;
  moderation_enabled: boolean;
  courses: {
    title: string;
  };
  attendance_count?: number;
  pending_requests?: number;
}

interface Course {
  id: string;
  title: string;
}

interface JoinRequest {
  id: string;
  session_id: string;
  user_id: string;
  status: string;
  requested_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

const ManageLiveSessions = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    course_id: '',
    scheduled_at: '',
    duration_minutes: 60,
    moderation_enabled: true,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && user && !isStaff) {
      navigate('/lms/dashboard');
    }
  }, [user, loading, isStaff, navigate]);

  useEffect(() => {
    if (user && isStaff) {
      fetchSessions();
      fetchCourses();
    }
  }, [user, isStaff]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    
    if (data) setCourses(data);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        meeting_url,
        recording_url,
        status,
        course_id,
        moderation_enabled,
        courses (
          title
        )
      `)
      .order('scheduled_at', { ascending: false });

    if (!error && data) {
      // Get attendance counts and pending requests
      const sessionsWithCounts = await Promise.all(
        data.map(async (session) => {
          const { count: attendanceCount } = await supabase
            .from('live_session_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          const { count: pendingCount } = await supabase
            .from('live_session_requests')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('status', 'pending');

          return {
            ...session,
            attendance_count: attendanceCount || 0,
            pending_requests: pendingCount || 0
          };
        })
      );

      setSessions(sessionsWithCounts as LiveSession[]);
    }
    setIsLoading(false);
  };

  const fetchJoinRequests = async (sessionId: string) => {
    console.log('Fetching join requests for session:', sessionId);
    
    // First get the requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('live_session_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('requested_at', { ascending: true });

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      return;
    }

    console.log('Found requests:', requestsData);

    if (!requestsData || requestsData.length === 0) {
      setJoinRequests([]);
      return;
    }

    // Get profiles for these users
    const userIds = requestsData.map(r => r.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Combine the data
    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const combinedData = requestsData.map(request => ({
      ...request,
      profiles: profilesMap.get(request.user_id) || { full_name: 'Unknown User', email: 'No email' }
    }));

    console.log('Combined requests with profiles:', combinedData);
    setJoinRequests(combinedData as unknown as JoinRequest[]);
  };

  const openModerationDialog = (session: LiveSession) => {
    setSelectedSession(session);
    fetchJoinRequests(session.id);
    setModerationDialogOpen(true);

    // Subscribe to realtime updates for this session's requests
    const channel = supabase
      .channel(`session-requests-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_requests',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          fetchJoinRequests(session.id);
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleJoinRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    // Find the request to get student info
    const request = joinRequests.find(r => r.id === requestId);
    
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
      
      // Send email notification if approved
      if (status === 'approved' && request && selectedSession) {
        const studentEmail = request.profiles?.email;
        const studentName = request.profiles?.full_name || 'Student';
        
        if (studentEmail) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            await supabase.functions.invoke('send-session-approval', {
              body: {
                studentEmail,
                studentName,
                sessionTitle: selectedSession.title,
                sessionDate: format(new Date(selectedSession.scheduled_at), 'MMMM d, yyyy h:mm a'),
                meetingUrl: selectedSession.meeting_url || ''
              }
            });
            
            console.log('Approval email sent to:', studentEmail);
          } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't show error to user - approval was successful, email is secondary
          }
        }
      }
      
      if (selectedSession) {
        fetchJoinRequests(selectedSession.id);
        fetchSessions();
      }
    }
  };

  const approveAllPending = async () => {
    if (!selectedSession) return;

    const pendingRequests = joinRequests.filter(r => r.status === 'pending');
    
    for (const request of pendingRequests) {
      await handleJoinRequest(request.id, 'approved');
    }
    
    toast.success(`Approved ${pendingRequests.length} students`);
  };

  const validateSession = (): boolean => {
    if (!newSession.title || !newSession.course_id || !newSession.scheduled_at) {
      toast.error('Please fill in required fields');
      return false;
    }
    return true;
  };

  const createSession = async () => {
    if (!newSession.title || !newSession.course_id || !newSession.scheduled_at) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!newSession.meeting_url) {
      toast.error('Please enter your Google Meet link');
      return;
    }

    if (!validateGoogleMeetUrl(newSession.meeting_url)) {
      toast.error('Please enter a valid Google Meet URL (e.g., https://meet.google.com/abc-defg-hij)');
      return;
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        title: newSession.title,
        description: newSession.description || null,
        course_id: newSession.course_id,
        scheduled_at: new Date(newSession.scheduled_at).toISOString(),
        duration_minutes: newSession.duration_minutes,
        instructor_id: user?.id,
        meeting_url: newSession.meeting_url,
        status: 'scheduled',
        moderation_enabled: newSession.moderation_enabled
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create session');
    } else {
      toast.success('Session scheduled with Google Meet!');
      // Copy the join link to clipboard
      const internalLink = `${window.location.origin}/lms/meet/${data.id}`;
      navigator.clipboard.writeText(internalLink);
      toast.info('Join link copied to clipboard!');
      setDialogOpen(false);
      setNewSession({
        title: '',
        description: '',
        course_id: '',
        scheduled_at: '',
        duration_minutes: 60,
        moderation_enabled: true,
        meeting_url: ''
      });
      fetchSessions();
    }
  };

  const updateStatus = async (sessionId: string, status: string) => {
    const { error } = await supabase
      .from('live_sessions')
      .update({ status })
      .eq('id', sessionId);

    if (!error) {
      toast.success(`Session ${status}`);
      fetchSessions();
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this session?')) return;

    const { error } = await supabase
      .from('live_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Session deleted');
      fetchSessions();
    }
  };

  const startSession = (session: LiveSession) => {
    // Update status to live
    updateStatus(session.id, 'live');
    // Open Google Meet in new tab
    if (session.meeting_url) {
      window.open(session.meeting_url, '_blank');
    }
  };

  const copyJoinLink = (sessionId: string) => {
    const link = `${window.location.origin}/lms/meet/${sessionId}`;
    navigator.clipboard.writeText(link);
    toast.success('Join link copied!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 animate-pulse">Live</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Sessions</h1>
            <p className="text-muted-foreground">Schedule and manage live classes with Google Meet</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Live Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Course *</Label>
                  <Select
                    value={newSession.course_id}
                    onValueChange={(v) => setNewSession({ ...newSession, course_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    placeholder="e.g., Week 1 - Introduction"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newSession.description}
                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                    placeholder="What will be covered in this session..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={newSession.scheduled_at}
                      onChange={(e) => setNewSession({ ...newSession, scheduled_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={newSession.duration_minutes}
                      onChange={(e) => setNewSession({ ...newSession, duration_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Google Meet Link *</Label>
                  <Input
                    type="url"
                    value={newSession.meeting_url}
                    onChange={(e) => setNewSession({ ...newSession, meeting_url: e.target.value })}
                    placeholder="https://meet.google.com/abc-defg-hij"
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a meeting in Google Calendar or Google Meet, then paste the link here
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Waiting Room</Label>
                    <p className="text-sm text-muted-foreground">
                      Require approval before students can join
                    </p>
                  </div>
                  <Switch
                    checked={newSession.moderation_enabled}
                    onCheckedChange={(checked) => setNewSession({ ...newSession, moderation_enabled: checked })}
                  />
                </div>
                <Button onClick={createSession} className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Moderation Dialog */}
        <Dialog open={moderationDialogOpen} onOpenChange={setModerationDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Session Moderation - {selectedSession?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Pending Requests */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Pending Requests</h3>
                  {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                    <Button size="sm" onClick={approveAllPending}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Approve All
                    </Button>
                  )}
                </div>
                {joinRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending requests
                  </p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests
                      .filter(r => r.status === 'pending')
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {request.profiles?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.profiles?.email}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleJoinRequest(request.id, 'approved')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleJoinRequest(request.id, 'rejected')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Approved Students */}
              <div>
                <h3 className="font-semibold mb-3">Approved Students</h3>
                {joinRequests.filter(r => r.status === 'approved').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No approved students yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests
                      .filter(r => r.status === 'approved')
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="font-medium">
                                {request.profiles?.full_name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.profiles?.email}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">Approved</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Sessions Scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first live session with Google Meet
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Moderation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>{session.courses?.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(session.scheduled_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {session.duration_minutes} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {session.attendance_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.moderation_enabled ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="relative"
                          onClick={() => openModerationDialog(session)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Moderate
                          {session.pending_requests && session.pending_requests > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                              {session.pending_requests}
                            </span>
                          )}
                        </Button>
                      ) : (
                        <Badge variant="outline">Open Access</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {session.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => startSession(session)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyJoinLink(session.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {session.status === 'live' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/lms/meet/${session.id}`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Join
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(session.id, 'completed')}
                            >
                              End
                            </Button>
                          </>
                        )}
                        {session.status === 'completed' && session.recording_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={session.recording_url} target="_blank">
                              <Video className="h-4 w-4 mr-1" />
                              Recording
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </LMSLayout>
  );
};

export default ManageLiveSessions;
