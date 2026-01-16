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
  Copy
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
  courses: {
    title: string;
  };
  attendance_count?: number;
}

interface Course {
  id: string;
  title: string;
}

const ManageLiveSessions = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    course_id: '',
    scheduled_at: '',
    duration_minutes: 60
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
        courses (
          title
        )
      `)
      .order('scheduled_at', { ascending: false });

    if (!error && data) {
      // Get attendance counts
      const sessionsWithCounts = await Promise.all(
        data.map(async (session) => {
          const { count } = await supabase
            .from('live_session_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          return {
            ...session,
            attendance_count: count || 0
          };
        })
      );

      setSessions(sessionsWithCounts as LiveSession[]);
    }
    setIsLoading(false);
  };

  const createSession = async () => {
    if (!newSession.title || !newSession.course_id || !newSession.scheduled_at) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase
      .from('live_sessions')
      .insert({
        title: newSession.title,
        description: newSession.description || null,
        course_id: newSession.course_id,
        scheduled_at: new Date(newSession.scheduled_at).toISOString(),
        duration_minutes: newSession.duration_minutes,
        instructor_id: user?.id,
        status: 'scheduled'
      });

    if (error) {
      toast.error('Failed to create session');
    } else {
      toast.success('Session scheduled');
      setDialogOpen(false);
      setNewSession({
        title: '',
        description: '',
        course_id: '',
        scheduled_at: '',
        duration_minutes: 60
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

  const startSession = (sessionId: string) => {
    // Update status to live
    updateStatus(sessionId, 'live');
    // Navigate to Jitsi meeting
    navigate(`/lms/meet/${sessionId}`);
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
            <p className="text-muted-foreground">Schedule and manage live classes with Jitsi Meet</p>
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
                <Button onClick={createSession} className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Sessions Scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first live session with Jitsi Meet
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
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {session.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => startSession(session.id)}
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
