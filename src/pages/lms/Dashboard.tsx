import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Award, 
  Calendar,
  Bell,
  Play,
  ChevronRight
} from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';
import AttendanceCard from '@/components/lms/dashboard/AttendanceCard';
import PendingFeesCard from '@/components/lms/dashboard/PendingFeesCard';
import UpcomingAssignmentsCard from '@/components/lms/dashboard/UpcomingAssignmentsCard';
import RecentCertificatesCard from '@/components/lms/dashboard/RecentCertificatesCard';

interface Enrollment {
  id: string;
  course_id: string;
  progress_percentage: number;
  status: string;
  enrolled_at: string;
  courses: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    category: string | null;
    difficulty_level: string | null;
    instructor_id: string | null;
  };
  instructor?: {
    full_name: string | null;
  } | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_global: boolean;
  created_at: string;
}

interface LiveSession {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  courses: {
    title: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const Dashboard = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalCertificates: 0,
    hoursLearned: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Fetch enrollments with course details
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        progress_percentage,
        status,
        enrolled_at,
        courses (
          id,
          title,
          thumbnail_url,
          category,
          difficulty_level,
          instructor_id
        )
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (enrollmentData) {
      // Fetch instructor profiles for courses
      const instructorIds = enrollmentData
        .map(e => e.courses?.instructor_id)
        .filter((id): id is string => !!id);
      
      let instructorMap = new Map<string, { full_name: string | null }>();
      if (instructorIds.length > 0) {
        const { data: instructorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', instructorIds);
        
        instructorMap = new Map(instructorProfiles?.map(p => [p.id, { full_name: p.full_name }]) || []);
      }

      const enrichedEnrollments = enrollmentData.map(e => ({
        ...e,
        instructor: e.courses?.instructor_id ? instructorMap.get(e.courses.instructor_id) : null
      })) as Enrollment[];

      setEnrollments(enrichedEnrollments);
      setStats(prev => ({
        ...prev,
        totalCourses: enrollmentData.length,
        completedCourses: enrollmentData.filter(e => e.status === 'completed').length,
      }));
    }

    // Fetch certificates count
    const { count: certCount } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setStats(prev => ({ ...prev, totalCertificates: certCount || 0 }));

    // Fetch hours learned from lesson progress
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('time_spent_seconds')
      .eq('user_id', user.id);
    
    if (progressData) {
      const totalSeconds = progressData.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
      setStats(prev => ({ ...prev, hoursLearned: Math.round(totalSeconds / 3600) }));
    }

    // Fetch announcements
    const { data: announcementData } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (announcementData) {
      setAnnouncements(announcementData);
    }

    // Fetch upcoming live sessions
    const { data: sessionData } = await supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        scheduled_at,
        status,
        courses (
          title
        )
      `)
      .gte('scheduled_at', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (sessionData) {
      setUpcomingSessions(sessionData as LiveSession[]);
    }

    // Fetch recent notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifData) {
      setNotifications(notifData as Notification[]);
    }
  };

  if (loading) {
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
      <div className="space-y-8 w-full min-w-0 overflow-hidden">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-4 sm:p-8 text-primary-foreground overflow-hidden">
          <h1 className="text-xl sm:text-3xl font-bold mb-2 break-words">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h1>
          <p className="text-primary-foreground/80">
            Continue your learning journey. You have {enrollments.length} active course{enrollments.length !== 1 ? 's' : ''}.
          </p>
          {isStaff && (
            <Button 
              variant="secondary" 
              className="mt-4"
              onClick={() => navigate('/lms/instructor')}
            >
              Go to Instructor Dashboard
            </Button>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg shrink-0">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Enrolled Courses</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg shrink-0">
                  <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.completedCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg shrink-0">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Certificates</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalCertificates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Hours Learned</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.hoursLearned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics Row - Attendance, Fees, Assignments */}
        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AttendanceCard userId={user.id} />
            <PendingFeesCard userId={user.id} />
            <UpcomingAssignmentsCard userId={user.id} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 w-full min-w-0">
          {/* Continue Learning */}
          <div className="lg:col-span-2 space-y-4 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Continue Learning</h2>
              <Button variant="ghost" onClick={() => navigate('/lms/courses')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't been enrolled in any courses yet. Contact an administrator to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {enrollments.slice(0, 3).map((enrollment) => (
                  <Card 
                    key={enrollment.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/lms/courses/${enrollment.course_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {enrollment.courses?.thumbnail_url ? (
                            <img 
                              src={enrollment.courses.thumbnail_url} 
                              alt={enrollment.courses.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-semibold truncate">{enrollment.courses?.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {enrollment.courses?.category && (
                              <Badge variant="secondary" className="text-xs">
                                {enrollment.courses.category}
                              </Badge>
                            )}
                            {enrollment.courses?.difficulty_level && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {enrollment.courses.difficulty_level}
                              </Badge>
                            )}
                          </div>
                          {enrollment.instructor?.full_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Instructor: {enrollment.instructor.full_name}
                            </p>
                          )}
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{enrollment.progress_percentage}%</span>
                            </div>
                            <Progress value={enrollment.progress_percentage} className="h-2" />
                          </div>
                        </div>
                        <Button size="icon" variant="ghost">
                          <Play className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 min-w-0 overflow-hidden">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Live Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted">
                        <div className="p-2 bg-primary/10 rounded">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.scheduled_at).toLocaleDateString()} at{' '}
                            {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Announcements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No announcements</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="border-l-2 border-primary pl-3">
                        <p className="font-medium text-sm">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LMSLayout>
  );
};

export default Dashboard;
