import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, FileText, BookOpen, TrendingUp } from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface AssignmentGrade {
  id: string;
  assignment_title: string;
  course_title: string;
  max_score: number;
  score: number | null;
  status: string;
  feedback: string | null;
  submitted_at: string;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  progress: number;
  assignments_completed: number;
  total_assignments: number;
  avg_grade: number | null;
}

const Grades = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [overallStats, setOverallStats] = useState({
    avgGrade: 0,
    totalSubmitted: 0,
    totalGraded: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGrades();
    }
  }, [user]);

  const fetchGrades = async () => {
    if (!user) return;

    // Fetch submissions with assignment details
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select(`
        id, score, status, feedback, submitted_at,
        assignments (
          title, max_score, course_id,
          courses (title)
        )
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });

    if (submissions) {
      const gradeData: AssignmentGrade[] = submissions.map((s: any) => ({
        id: s.id,
        assignment_title: s.assignments?.title || 'Unknown',
        course_title: s.assignments?.courses?.title || 'Unknown',
        max_score: s.assignments?.max_score || 100,
        score: s.score,
        status: s.status,
        feedback: s.feedback,
        submitted_at: s.submitted_at
      }));
      setGrades(gradeData);

      // Calculate stats
      const gradedSubs = gradeData.filter(g => g.status === 'graded' && g.score !== null);
      const avgGrade = gradedSubs.length > 0
        ? gradedSubs.reduce((sum, g) => sum + ((g.score! / g.max_score) * 100), 0) / gradedSubs.length
        : 0;

      setOverallStats({
        avgGrade: Math.round(avgGrade),
        totalSubmitted: gradeData.length,
        totalGraded: gradedSubs.length
      });
    }

    // Fetch enrollments for course progress
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        course_id, progress_percentage,
        courses (title)
      `)
      .eq('user_id', user.id);

    // Fetch all assignments per course
    const { data: allAssignments } = await supabase
      .from('assignments')
      .select('id, course_id')
      .eq('is_published', true);

    if (enrollments) {
      const progressData: CourseProgress[] = enrollments.map((e: any) => {
        const courseAssignments = allAssignments?.filter(a => a.course_id === e.course_id) || [];
        const submittedForCourse = submissions?.filter(
          (s: any) => s.assignments?.course_id === e.course_id && 
          (s.status === 'submitted' || s.status === 'graded')
        ) || [];
        const gradedForCourse = submissions?.filter(
          (s: any) => s.assignments?.course_id === e.course_id && s.status === 'graded'
        ) || [];

        const avgGrade = gradedForCourse.length > 0
          ? gradedForCourse.reduce((sum: number, s: any) => 
              sum + ((s.score || 0) / (s.assignments?.max_score || 100)) * 100, 0
            ) / gradedForCourse.length
          : null;

        return {
          course_id: e.course_id,
          course_title: e.courses?.title || 'Unknown',
          progress: e.progress_percentage || 0,
          assignments_completed: submittedForCourse.length,
          total_assignments: courseAssignments.length,
          avg_grade: avgGrade ? Math.round(avgGrade) : null
        };
      });
      setCourseProgress(progressData);
    }

    setIsLoading(false);
  };

  const getGradeBadge = (score: number | null, maxScore: number, status: string) => {
    if (status !== 'graded' || score === null) {
      return <Badge variant="secondary">Pending</Badge>;
    }
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return <Badge className="bg-green-500">A ({score}/{maxScore})</Badge>;
    if (percentage >= 70) return <Badge className="bg-blue-500">B ({score}/{maxScore})</Badge>;
    if (percentage >= 60) return <Badge className="bg-yellow-500">C ({score}/{maxScore})</Badge>;
    if (percentage >= 50) return <Badge className="bg-orange-500">D ({score}/{maxScore})</Badge>;
    return <Badge variant="destructive">F ({score}/{maxScore})</Badge>;
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
          <h1 className="text-2xl font-bold">My Grades</h1>
          <p className="text-muted-foreground">Track your academic progress and scores</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Grade</p>
                  <p className="text-2xl font-bold">{overallStats.avgGrade}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold">{overallStats.totalSubmitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Graded</p>
                  <p className="text-2xl font-bold">{overallStats.totalGraded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="grades" className="w-full">
          <TabsList>
            <TabsTrigger value="grades">Assignment Grades</TabsTrigger>
            <TabsTrigger value="courses">Course Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Assignment Grades</CardTitle>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No assignment submissions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.assignment_title}</TableCell>
                          <TableCell>{grade.course_title}</TableCell>
                          <TableCell>{format(new Date(grade.submitted_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getGradeBadge(grade.score, grade.max_score, grade.status)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {grade.feedback || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <div className="grid gap-4">
              {courseProgress.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Not enrolled in any courses yet</p>
                  </CardContent>
                </Card>
              ) : (
                courseProgress.map((course) => (
                  <Card key={course.course_id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{course.course_title}</h3>
                        {course.avg_grade !== null && (
                          <Badge variant={course.avg_grade >= 70 ? 'default' : 'secondary'}>
                            Avg: {course.avg_grade}%
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Course Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Assignments Completed</span>
                          <span>{course.assignments_completed}/{course.total_assignments}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default Grades;
