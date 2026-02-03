import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Play, CheckCircle, Clock } from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';

interface Enrollment {
  id: string;
  course_id: string;
  progress_percentage: number;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  courses: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    category: string | null;
    difficulty_level: string | null;
    duration_hours: number | null;
  };
}

const MyCourses = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEnrollments();
    }
  }, [user]);

  const fetchEnrollments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        progress_percentage,
        status,
        enrolled_at,
        completed_at,
        courses (
          id,
          title,
          description,
          thumbnail_url,
          category,
          difficulty_level,
          duration_hours
        )
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (!error && data) {
      setEnrollments(data as Enrollment[]);
    }
    setIsLoading(false);
  };

  const activeCourses = enrollments.filter((e) => e.status === 'active');
  const completedCourses = enrollments.filter((e) => e.status === 'completed');

  const CourseCard = ({ enrollment }: { enrollment: Enrollment }) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group"
      onClick={() => navigate(`/lms/courses/${enrollment.course_id}`)}
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {enrollment.courses?.thumbnail_url ? (
          <img 
            src={enrollment.courses.thumbnail_url} 
            alt={enrollment.courses.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {enrollment.status === 'completed' && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Button 
            size="lg" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="h-5 w-5 mr-2" />
            Continue
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold line-clamp-2">{enrollment.courses?.title}</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
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
        {enrollment.courses?.duration_hours && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span>{enrollment.courses.duration_hours} hours</span>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{enrollment.progress_percentage}%</span>
          </div>
          <Progress value={enrollment.progress_percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );

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
      <div className="space-y-6 w-full min-w-0 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">Track your learning progress</p>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeCourses.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({enrollments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeCourses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No active courses</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any active courses yet.
                  </p>
                  <Button onClick={() => navigate('/lms/catalog')}>
                    Browse Course Catalog
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedCourses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No completed courses yet</h3>
                  <p className="text-muted-foreground">
                    Complete your first course to see it here!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No courses</h3>
                  <p className="text-muted-foreground">
                    You haven't been enrolled in any courses yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default MyCourses;
