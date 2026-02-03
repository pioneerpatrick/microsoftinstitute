import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  Award,
  TrendingUp,
  Plus,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';

const InstructorDashboard = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    activeCourses: 0,
  });
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && user && !isStaff) {
      navigate('/lms/dashboard');
    }
  }, [user, loading, isStaff, navigate]);

  useEffect(() => {
    if (user && isStaff) {
      fetchStats();
      fetchRecentEnrollments();
    }
  }, [user, isStaff]);

  const fetchStats = async () => {
    // Fetch courses count
    const { count: coursesCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // Fetch published courses
    const { count: activeCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    // Fetch total enrollments
    const { count: enrollmentsCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true });

    // Fetch unique students
    const { data: uniqueStudents } = await supabase
      .from('enrollments')
      .select('user_id');

    const uniqueStudentIds = new Set(uniqueStudents?.map(e => e.user_id) || []);

    setStats({
      totalCourses: coursesCount || 0,
      activeCourses: activeCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalStudents: uniqueStudentIds.size,
    });
  };

  const fetchRecentEnrollments = async () => {
    const { data } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        progress_percentage,
        profiles:user_id (
          full_name
        ),
        courses (
          title
        )
      `)
      .order('enrolled_at', { ascending: false })
      .limit(5);

    if (data) {
      setRecentEnrollments(data);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
            <p className="text-muted-foreground">Manage your courses and students</p>
          </div>
          <Button onClick={() => navigate('/lms/instructor/courses/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{stats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold">{stats.activeCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
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
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enrollments</p>
                  <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you might want to do</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/lms/instructor/courses')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Manage Courses
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/lms/instructor/students')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Students
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/lms/instructor/exams')}
              >
                <Award className="h-4 w-4 mr-2" />
                Manage Quizzes & Exams
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/lms/instructor/reports')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Reports
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Enrollments</CardTitle>
              <CardDescription>Latest student enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              {recentEnrollments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No enrollments yet</p>
              ) : (
                <div className="space-y-4">
                  {recentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {enrollment.profiles?.full_name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.courses?.title}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{enrollment.progress_percentage}%</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LMSLayout>
  );
};

export default InstructorDashboard;
