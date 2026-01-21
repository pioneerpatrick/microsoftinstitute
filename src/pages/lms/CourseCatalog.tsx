import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Clock, Users, Search, GraduationCap, CheckCircle, Loader2 } from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  difficulty_level: string | null;
  duration_hours: number | null;
  is_published: boolean;
  enrollments: { count: number }[];
}

const CourseCatalog = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCourses();
      fetchEnrollments();
    }
  }, [user]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        category,
        difficulty_level,
        duration_hours,
        is_published,
        enrollments(count)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCourses(data as Course[]);
    }
    setIsLoading(false);
  };

  const fetchEnrollments = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id);

    if (!error && data) {
      setEnrolledCourseIds(data.map(e => e.course_id));
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    setEnrollingCourseId(courseId);

    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        status: 'active',
        progress_percentage: 0
      });

    if (error) {
      console.error('Enrollment error:', error);
      toast.error('Failed to enroll. Please try again.');
    } else {
      // Send enrollment confirmation email
      const course = courses.find(c => c.id === courseId);
      try {
        await supabase.functions.invoke('send-enrollment-email', {
          body: {
            studentEmail: user.email,
            studentName: user.user_metadata?.full_name || user.email,
            courseTitle: course?.title || 'New Course',
            courseDescription: course?.description,
            courseDuration: course?.duration_hours,
          },
        });
      } catch (emailError) {
        console.error('Enrollment email failed:', emailError);
      }

      toast.success('Successfully enrolled! Check your email for confirmation.');
      setEnrolledCourseIds([...enrolledCourseIds, courseId]);
    }

    setEnrollingCourseId(null);
  };

  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))];
  const difficulties = [...new Set(courses.map(c => c.difficulty_level).filter(Boolean))];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || course.difficulty_level === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const isEnrolled = (courseId: string) => enrolledCourseIds.includes(courseId);

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
          <h1 className="text-2xl font-bold">Course Catalog</h1>
          <p className="text-muted-foreground">Browse and enroll in available courses</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {difficulties.map((diff) => (
                <SelectItem key={diff} value={diff!} className="capitalize">{diff}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No courses are available at the moment'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <GraduationCap className="h-16 w-16 text-primary/50" />
                    </div>
                  )}
                  {isEnrolled(course.id) && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enrolled
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg line-clamp-2 mb-2">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {course.category && (
                      <Badge variant="secondary" className="text-xs">
                        {course.category}
                      </Badge>
                    )}
                    {course.difficulty_level && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {course.difficulty_level}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    {course.duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration_hours}h</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.enrollments[0]?.count || 0} students</span>
                    </div>
                  </div>
                  {isEnrolled(course.id) ? (
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/lms/course/${course.id}`)}
                    >
                      Continue Learning
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingCourseId === course.id}
                    >
                      {enrollingCourseId === course.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll Now'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LMSLayout>
  );
};

export default CourseCatalog;
