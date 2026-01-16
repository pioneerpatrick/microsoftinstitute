import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, BookOpen, TrendingUp, Award, Calendar, Clock,
  BarChart3, FileText 
} from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface StudentPerformance {
  user_id: string;
  full_name: string | null;
  email: string | null;
  course_title: string;
  progress: number;
  assignments_submitted: number;
  avg_score: number | null;
  attendance_count: number;
}

interface AttendanceRecord {
  id: string;
  user_name: string;
  session_title: string;
  course_title: string;
  joined_at: string;
  duration_seconds: number | null;
}

const Reports = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [performance, setPerformance] = useState<StudentPerformance[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEnrollments: 0,
    avgProgress: 0,
    totalSessions: 0
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
      fetchData();
    }
  }, [user, isStaff]);

  const fetchData = async () => {
    // Fetch enrollments with progress
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        user_id, progress_percentage,
        courses (title)
      `);

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Fetch assignment submissions
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('user_id, score, status');

    // Calculate performance per student per course
    const perfMap = new Map<string, StudentPerformance>();
    
    enrollments?.forEach((e: any) => {
      const key = `${e.user_id}-${e.courses?.title}`;
      const profile = profileMap.get(e.user_id);
      
      const studentSubs = submissions?.filter(s => s.user_id === e.user_id) || [];
      const gradedSubs = studentSubs.filter(s => s.status === 'graded' && s.score !== null);
      const avgScore = gradedSubs.length > 0 
        ? gradedSubs.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubs.length
        : null;

      perfMap.set(key, {
        user_id: e.user_id,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        course_title: e.courses?.title || 'Unknown',
        progress: e.progress_percentage || 0,
        assignments_submitted: studentSubs.filter(s => s.status === 'submitted' || s.status === 'graded').length,
        avg_score: avgScore,
        attendance_count: 0
      });
    });

    setPerformance(Array.from(perfMap.values()));

    // Fetch attendance
    const { data: attendanceData } = await supabase
      .from('live_session_attendance')
      .select(`
        id, user_id, joined_at, duration_seconds,
        live_sessions (
          title,
          courses (title)
        )
      `)
      .order('joined_at', { ascending: false })
      .limit(50);

    const attRecords: AttendanceRecord[] = (attendanceData || []).map((a: any) => ({
      id: a.id,
      user_name: profileMap.get(a.user_id)?.full_name || 'Unknown',
      session_title: a.live_sessions?.title || 'Unknown',
      course_title: a.live_sessions?.courses?.title || 'Unknown',
      joined_at: a.joined_at,
      duration_seconds: a.duration_seconds
    }));

    setAttendance(attRecords);

    // Calculate stats
    const uniqueStudents = new Set(enrollments?.map(e => e.user_id) || []);
    const avgProg = enrollments?.length 
      ? (enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
      : 0;

    const { count: sessionCount } = await supabase
      .from('live_sessions')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalStudents: uniqueStudents.size,
      totalEnrollments: enrollments?.length || 0,
      avgProgress: Math.round(avgProg),
      totalSessions: sessionCount || 0
    });

    setIsLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
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
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track student performance and attendance</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enrollments</p>
                  <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Live Sessions</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList>
            <TabsTrigger value="performance">
              <BarChart3 className="h-4 w-4 mr-2" />
              Student Performance
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Calendar className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance by Course</CardTitle>
              </CardHeader>
              <CardContent>
                {performance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No enrollment data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Assignments</TableHead>
                        <TableHead>Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performance.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{p.full_name || 'Unknown'}</div>
                              {p.email && (
                                <div className="text-sm text-muted-foreground">{p.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{p.course_title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={p.progress} className="w-20 h-2" />
                              <span className="text-sm">{p.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{p.assignments_submitted}</TableCell>
                          <TableCell>
                            {p.avg_score !== null ? (
                              <Badge variant={p.avg_score >= 70 ? 'default' : 'secondary'}>
                                {Math.round(p.avg_score)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Session Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Joined At</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.user_name}</TableCell>
                          <TableCell>{a.session_title}</TableCell>
                          <TableCell>{a.course_title}</TableCell>
                          <TableCell>
                            {format(new Date(a.joined_at), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>{formatDuration(a.duration_seconds)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default Reports;
