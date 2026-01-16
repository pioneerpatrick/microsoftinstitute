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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Users, 
  CheckCircle,
  Clock,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number;
  is_published: boolean;
  course_id: string;
  courses: {
    title: string;
  };
  submissions_count?: number;
  graded_count?: number;
}

interface Submission {
  id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface Course {
  id: string;
  title: string;
}

const ManageAssignments = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    max_score: 100,
    is_published: false
  });
  const [grading, setGrading] = useState({
    score: 0,
    feedback: ''
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
      fetchAssignments();
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

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        due_date,
        max_score,
        is_published,
        course_id,
        courses (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get submission counts
      const assignmentsWithCounts = await Promise.all(
        data.map(async (assignment) => {
          const { count: totalCount } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);

          const { count: gradedCount } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)
            .eq('status', 'graded');

          return {
            ...assignment,
            submissions_count: totalCount || 0,
            graded_count: gradedCount || 0
          };
        })
      );

      setAssignments(assignmentsWithCounts as Assignment[]);
    }
    setIsLoading(false);
  };

  const fetchSubmissions = async (assignmentId: string) => {
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (data) {
      // Fetch profiles
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const submissionsWithProfiles = data.map(sub => ({
        ...sub,
        profiles: profilesMap.get(sub.user_id)
      }));

      setSubmissions(submissionsWithProfiles);
    }
  };

  const createAssignment = async () => {
    if (!newAssignment.title || !newAssignment.course_id) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase
      .from('assignments')
      .insert({
        title: newAssignment.title,
        description: newAssignment.description || null,
        course_id: newAssignment.course_id,
        due_date: newAssignment.due_date || null,
        max_score: newAssignment.max_score,
        is_published: newAssignment.is_published
      });

    if (error) {
      toast.error('Failed to create assignment');
    } else {
      toast.success('Assignment created');
      setDialogOpen(false);
      setNewAssignment({
        title: '',
        description: '',
        course_id: '',
        due_date: '',
        max_score: 100,
        is_published: false
      });
      fetchAssignments();
    }
  };

  const gradeSubmission = async () => {
    if (!selectedSubmission) return;

    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        score: grading.score,
        feedback: grading.feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user?.id
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      toast.error('Failed to grade submission');
    } else {
      toast.success('Submission graded');
      setGradeDialogOpen(false);
      setGrading({ score: 0, feedback: '' });
      if (selectedAssignment) {
        fetchSubmissions(selectedAssignment.id);
      }
      fetchAssignments();
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm('Delete this assignment and all submissions?')) return;

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Assignment deleted');
      fetchAssignments();
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('assignments')
      .update({ is_published: !current })
      .eq('id', id);

    if (!error) {
      toast.success(current ? 'Unpublished' : 'Published');
      fetchAssignments();
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
            <h1 className="text-2xl font-bold">Manage Assignments</h1>
            <p className="text-muted-foreground">Create assignments and grade submissions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Course *</Label>
                  <Select
                    value={newAssignment.course_id}
                    onValueChange={(v) => setNewAssignment({ ...newAssignment, course_id: v })}
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
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="Assignment title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    placeholder="Instructions for students..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="datetime-local"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Score</Label>
                    <Input
                      type="number"
                      value={newAssignment.max_score}
                      onChange={(e) => setNewAssignment({ ...newAssignment, max_score: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newAssignment.is_published}
                    onCheckedChange={(c) => setNewAssignment({ ...newAssignment, is_published: c })}
                  />
                  <Label>Publish immediately</Label>
                </div>
                <Button onClick={createAssignment} className="w-full">
                  Create Assignment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions" disabled={!selectedAssignment}>
              Submissions {selectedAssignment && `(${submissions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-6">
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Assignments</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first assignment to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.title}</TableCell>
                        <TableCell>{assignment.courses?.title}</TableCell>
                        <TableCell>
                          {assignment.due_date 
                            ? format(new Date(assignment.due_date), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {assignment.graded_count}/{assignment.submissions_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.is_published ? 'default' : 'secondary'}>
                            {assignment.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                fetchSubmissions(assignment.id);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePublish(assignment.id, assignment.is_published)}
                            >
                              {assignment.is_published ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteAssignment(assignment.id)}
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
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            {selectedAssignment && (
              <>
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>{selectedAssignment.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedAssignment.courses?.title} • Max Score: {selectedAssignment.max_score}
                    </p>
                  </CardHeader>
                </Card>

                {submissions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No Submissions Yet</h3>
                      <p className="text-muted-foreground">
                        Students haven't submitted this assignment yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              {submission.profiles?.full_name || submission.profiles?.email || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(submission.submitted_at), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                                {submission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {submission.score !== null 
                                ? `${submission.score}/${selectedAssignment.max_score}`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <Dialog open={gradeDialogOpen && selectedSubmission?.id === submission.id} onOpenChange={(open) => {
                                setGradeDialogOpen(open);
                                if (open) {
                                  setSelectedSubmission(submission);
                                  setGrading({
                                    score: submission.score || 0,
                                    feedback: submission.feedback || ''
                                  });
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    {submission.status === 'graded' ? 'Edit Grade' : 'Grade'}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Grade Submission</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div>
                                      <Label className="text-sm font-medium">Student Answer</Label>
                                      <Card className="mt-2">
                                        <CardContent className="p-4">
                                          <p className="text-sm whitespace-pre-wrap">
                                            {submission.content || 'No text content'}
                                          </p>
                                          {submission.file_url && (
                                            <a 
                                              href={submission.file_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-primary text-sm hover:underline mt-2 block"
                                            >
                                              View attached file
                                            </a>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Score (out of {selectedAssignment?.max_score})</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={selectedAssignment?.max_score}
                                        value={grading.score}
                                        onChange={(e) => setGrading({ ...grading, score: parseInt(e.target.value) })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Feedback</Label>
                                      <Textarea
                                        value={grading.feedback}
                                        onChange={(e) => setGrading({ ...grading, feedback: e.target.value })}
                                        placeholder="Provide feedback to the student..."
                                        rows={4}
                                      />
                                    </div>
                                    <Button onClick={gradeSubmission} className="w-full">
                                      <Save className="h-4 w-4 mr-2" />
                                      Save Grade
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default ManageAssignments;
