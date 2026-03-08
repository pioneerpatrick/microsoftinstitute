import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Video, 
  Trash2, 
  Users,
  Play,
  Shield,
  Check,
  X,
  UserCheck,
  Loader2,
  Radio,
  Mail,
  BookOpen
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
  const [startClassDialogOpen, setStartClassDialogOpen] = useState(false);
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isStartingClass, setIsStartingClass] = useState(false);
  const [instructorProfile, setInstructorProfile] = useState<{ full_name: string | null }>({ full_name: null });

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
      fetchInstructorProfile();
    }
  }, [user, isStaff]);

  const fetchInstructorProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (data) setInstructorProfile(data);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true)
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
      .order('scheduled_at', { ascending: false })
      .limit(20);

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
    const { data: requestsData, error: requestsError } = await supabase
      .from('live_session_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('requested_at', { ascending: true });

    if (requestsError || !requestsData || requestsData.length === 0) {
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

  const openModerationDialog = (session: LiveSession) => {
    setSelectedSession(session);
    fetchJoinRequests(session.id);
    setModerationDialogOpen(true);

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
      
      if (status === 'approved' && request && selectedSession) {
        const studentEmail = request.profiles?.email;
        const studentName = request.profiles?.full_name || 'Student';
        
        if (studentEmail) {
          try {
            await supabase.functions.invoke('send-session-approval', {
              body: {
                studentEmail,
                studentName,
                sessionTitle: selectedSession.title,
                sessionDate: format(new Date(selectedSession.scheduled_at), 'MMMM d, yyyy h:mm a'),
                meetingUrl: `${window.location.origin}/lms/meet/${selectedSession.id}`
              }
            });
          } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
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

  const startClass = async () => {
    if (!selectedCourseId || !user) {
      toast.error('Please select a course');
      return;
    }

    setIsStartingClass(true);

    try {
      // Get course title
      const course = courses.find(c => c.id === selectedCourseId);
      const sessionTitle = `${course?.title || 'Class'} - Live Session`;

      // Create the live session (scheduled for now)
      const { data: session, error: sessionError } = await supabase
        .from('live_sessions')
        .insert({
          title: sessionTitle,
          course_id: selectedCourseId,
          scheduled_at: new Date().toISOString(),
          duration_minutes: 60,
          instructor_id: user.id,
          status: 'live',
          moderation_enabled: true
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      toast.success('Class started! Notifying students...');

      // Send email notifications to enrolled students
      try {
        const { data: notifyResult } = await supabase.functions.invoke('send-class-notification', {
          body: {
            courseId: selectedCourseId,
            sessionId: session.id,
            sessionTitle,
            instructorName: instructorProfile.full_name || 'Your Instructor'
          }
        });

        if (notifyResult?.emailsSent > 0) {
          toast.success(`${notifyResult.emailsSent} students notified via email!`);
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
        // Continue anyway - class is started
      }

      setStartClassDialogOpen(false);
      setSelectedCourseId('');
      
      // Navigate to the live session room
      navigate(`/lms/meet/${session.id}`);
    } catch (error: any) {
      console.error('Error starting class:', error);
      toast.error('Failed to start class');
    } finally {
      setIsStartingClass(false);
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

  const endSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('live_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    if (!error) {
      toast.success('Session ended');
      fetchSessions();
    }
  };

  const resumeSession = (session: LiveSession) => {
    navigate(`/lms/meet/${session.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 animate-pulse">🔴 Live</Badge>;
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

  const liveSessions = sessions.filter(s => s.status === 'live');
  const pastSessions = sessions.filter(s => s.status !== 'live');

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
        {/* Header with Start Class Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Classes</h1>
            <p className="text-muted-foreground">Start a class and instantly notify your students</p>
          </div>
          <Button 
            size="lg" 
            className="bg-red-500 hover:bg-red-600 gap-2"
            onClick={() => setStartClassDialogOpen(true)}
          >
            <Radio className="h-5 w-5" />
            Start Class
          </Button>
        </div>

        {/* Start Class Dialog */}
        <Dialog open={startClassDialogOpen} onOpenChange={setStartClassDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-red-500" />
                Start Live Class
              </DialogTitle>
              <DialogDescription>
                Select a course to start a live class. All enrolled students will be notified instantly via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Course</label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {course.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCourseId && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-800">Instant Notification</p>
                        <p className="text-green-600">
                          All enrolled students will receive an email to join your class immediately.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={startClass} 
                className="w-full bg-red-500 hover:bg-red-600 gap-2"
                disabled={!selectedCourseId || isStartingClass}
              >
                {isStartingClass ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting Class...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Start Class Now
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Moderation Dialog */}
        <Dialog open={moderationDialogOpen} onOpenChange={setModerationDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Student Requests - {selectedSession?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={approveAllPending} size="sm" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    Approve All ({joinRequests.filter(r => r.status === 'pending').length})
                  </Button>
                </div>
              )}
              
              {joinRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No join requests yet</p>
                  <p className="text-sm">Students will appear here when they request to join</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {joinRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{request.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(request.requested_at), 'h:mm a')}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                          {request.status === 'approved' && <Badge className="bg-green-500">Approved</Badge>}
                          {request.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleJoinRequest(request.id, 'approved')}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleJoinRequest(request.id, 'rejected')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Live Now Section */}
        {liveSessions.length > 0 && (
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                Live Now
              </CardTitle>
              <CardDescription>Your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(session.status)}
                          <span className="text-sm text-muted-foreground">{session.courses?.title}</span>
                        </div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {session.attendance_count} in session
                          </span>
                          {session.pending_requests! > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Shield className="h-4 w-4" />
                              {session.pending_requests} waiting
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {session.pending_requests! > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openModerationDialog(session)}
                            className="gap-1"
                          >
                            <Shield className="h-4 w-4" />
                            Manage ({session.pending_requests})
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          onClick={() => resumeSession(session)}
                          className="gap-1"
                        >
                          <Play className="h-4 w-4" />
                          Resume
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Past Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Previous live sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {pastSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sessions yet</p>
                <p className="text-sm">Start your first class above!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.title}</TableCell>
                      <TableCell className="text-muted-foreground">{session.courses?.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(session.scheduled_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {session.attendance_count}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LMSLayout>
  );
};

export default ManageLiveSessions;
