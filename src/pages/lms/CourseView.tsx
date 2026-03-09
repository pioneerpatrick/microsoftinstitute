import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Clock, 
  FileText, 
  MessageSquare,
  Award,
  ChevronLeft,
  Video,
  Lock,
  Unlock
} from 'lucide-react';
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
  instructor_id: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_preview: boolean;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
}

interface CourseExam {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  max_score: number | null;
  passing_score: number | null;
  is_published: boolean | null;
}

interface ExamAttempt {
  id: string;
  exam_id: string;
  score: number | null;
  passed: boolean | null;
  completed_at: string | null;
}

const CourseView = () => {
  const { courseId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<{ progress_percentage: number } | null>(null);
  const [exams, setExams] = useState<CourseExam[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && courseId) {
      fetchCourseData();
    }
  }, [user, courseId]);

  const fetchCourseData = async () => {
    if (!user || !courseId) return;

    // Fetch course details
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseData) {
      setCourse(courseData);
    }

    // Fetch enrollment
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('progress_percentage')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentData) {
      setEnrollment(enrollmentData);
    }

    // Fetch modules with lessons
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select(`
        id,
        title,
        description,
        order_index,
        lessons (
          id,
          title,
          content,
          video_url,
          duration_minutes,
          order_index,
          is_preview
        )
      `)
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (modulesData) {
      // Sort lessons within each module
      const sortedModules = modulesData.map(m => ({
        ...m,
        lessons: (m.lessons || []).sort((a, b) => a.order_index - b.order_index)
      }));
      setModules(sortedModules);

      // Select first lesson by default
      if (sortedModules.length > 0 && sortedModules[0].lessons?.length > 0) {
        setSelectedLesson(sortedModules[0].lessons[0]);
      }
    }

    // Fetch lesson progress
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id);

    if (progressData) {
      setLessonProgress(progressData);
      
      // Check if all lessons are completed
      if (modulesData) {
        const allLessonIds = modulesData.flatMap(m => (m.lessons || []).map(l => l.id));
        const completedIds = new Set(progressData.filter(p => p.completed).map(p => p.lesson_id));
        setAllLessonsCompleted(allLessonIds.length > 0 && allLessonIds.every(id => completedIds.has(id)));
      }
    }

    // Fetch exams for this course
    const { data: examData } = await supabase
      .from('exams')
      .select('id, title, description, duration_minutes, max_score, passing_score, is_published')
      .eq('course_id', courseId)
      .eq('is_published', true);

    if (examData) {
      setExams(examData);
    }

    // Fetch user's exam attempts
    const { data: attemptData } = await supabase
      .from('exam_attempts')
      .select('id, exam_id, score, passed, completed_at')
      .eq('user_id', user.id);

    if (attemptData) {
      setExamAttempts(attemptData as ExamAttempt[]);
    }

    setIsLoading(false);
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      });

    if (!error) {
      setLessonProgress(prev => [
        ...prev.filter(p => p.lesson_id !== lessonId),
        { lesson_id: lessonId, completed: true }
      ]);
      
      // Update enrollment progress
      const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
      const completedLessons = lessonProgress.filter(p => p.completed).length + 1;
      const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
      
      await supabase
        .from('enrollments')
        .update({ progress_percentage: progressPercentage })
        .eq('user_id', user.id)
        .eq('course_id', courseId);
        
      setEnrollment({ progress_percentage: progressPercentage });
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress.some(p => p.lesson_id === lessonId && p.completed);
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

  if (!course) {
    return (
      <LMSLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Course not found</h2>
          <Button onClick={() => navigate('/lms/courses')} className="mt-4">
            Back to My Courses
          </Button>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/lms/courses')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {course.category && (
                <Badge variant="secondary">{course.category}</Badge>
              )}
              {course.difficulty_level && (
                <Badge variant="outline" className="capitalize">{course.difficulty_level}</Badge>
              )}
              {enrollment && (
                <div className="flex items-center gap-2 ml-4">
                  <Progress value={enrollment.progress_percentage} className="w-32 h-2" />
                  <span className="text-sm text-muted-foreground">{enrollment.progress_percentage}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video/Content Player */}
            <Card>
              <CardContent className="p-0">
                {selectedLesson?.video_url ? (
                  <div className="aspect-video bg-black rounded-t-lg">
                    <iframe
                      src={selectedLesson.video_url}
                      className="w-full h-full rounded-t-lg"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2">{selectedLesson?.title || 'Select a lesson'}</h2>
                  {selectedLesson?.duration_minutes && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <Clock className="h-4 w-4" />
                      <span>{selectedLesson.duration_minutes} minutes</span>
                    </div>
                  )}
                  {selectedLesson && !isLessonCompleted(selectedLesson.id) && (
                    <Button onClick={() => markLessonComplete(selectedLesson.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </Button>
                  )}
                  {selectedLesson && isLessonCompleted(selectedLesson.id) && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lesson Content */}
            {selectedLesson?.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lesson Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {selectedLesson.content}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Resources, Quizzes, Discussion */}
            <Tabs defaultValue="resources">
              <TabsList>
                <TabsTrigger value="resources">
                  <FileText className="h-4 w-4 mr-2" />
                  Resources
                </TabsTrigger>
                <TabsTrigger value="quizzes">
                  <Award className="h-4 w-4 mr-2" />
                  Quizzes
                </TabsTrigger>
                <TabsTrigger value="discussion">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Discussion
                </TabsTrigger>
              </TabsList>
              <TabsContent value="resources" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">No resources available for this lesson.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="quizzes" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">No quizzes available for this lesson.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="discussion" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <Button onClick={() => navigate(`/lms/forums?course=${courseId}`)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Go to Course Forum
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Course Content */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Accordion type="multiple" className="w-full">
                    {modules.map((module, moduleIndex) => (
                      <AccordionItem key={module.id} value={module.id}>
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <span className="text-xs font-medium text-muted-foreground">
                              Module {moduleIndex + 1}
                            </span>
                            <span className="font-medium">{module.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <div className="border-t">
                            {module.lessons?.map((lesson, lessonIndex) => {
                              const isCompleted = isLessonCompleted(lesson.id);
                              const isSelected = selectedLesson?.id === lesson.id;
                              
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson(lesson)}
                                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors ${
                                    isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                    isCompleted 
                                      ? 'bg-green-100 text-green-600' 
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : (
                                      lessonIndex + 1
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                                    {lesson.duration_minutes && (
                                      <p className="text-xs text-muted-foreground">
                                        {lesson.duration_minutes} min
                                      </p>
                                    )}
                                  </div>
                                  {lesson.video_url && (
                                    <Video className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LMSLayout>
  );
};

export default CourseView;
