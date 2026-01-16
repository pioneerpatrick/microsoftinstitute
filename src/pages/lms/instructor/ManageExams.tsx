import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Trash2, Calendar, Clock, Edit } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  duration_minutes: number;
  max_score: number;
  passing_score: number;
  is_published: boolean;
  start_date: string | null;
  end_date: string | null;
  courses: { title: string };
}

interface Course {
  id: string;
  title: string;
}

const ManageExams = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    title: '',
    description: '',
    course_id: '',
    duration_minutes: 60,
    max_score: 100,
    passing_score: 50,
    is_published: false,
    start_date: '',
    end_date: ''
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
      fetchExams();
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

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        id, title, description, course_id, duration_minutes,
        max_score, passing_score, is_published, start_date, end_date,
        courses (title)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExams(data as Exam[]);
    }
    setIsLoading(false);
  };

  const createExam = async () => {
    if (!newExam.title || !newExam.course_id) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase.from('exams').insert({
      title: newExam.title,
      description: newExam.description || null,
      course_id: newExam.course_id,
      duration_minutes: newExam.duration_minutes,
      max_score: newExam.max_score,
      passing_score: newExam.passing_score,
      is_published: newExam.is_published,
      start_date: newExam.start_date ? new Date(newExam.start_date).toISOString() : null,
      end_date: newExam.end_date ? new Date(newExam.end_date).toISOString() : null
    });

    if (error) {
      toast.error('Failed to create exam');
    } else {
      toast.success('Exam created');
      setDialogOpen(false);
      setNewExam({
        title: '', description: '', course_id: '',
        duration_minutes: 60, max_score: 100, passing_score: 50,
        is_published: false, start_date: '', end_date: ''
      });
      fetchExams();
    }
  };

  const togglePublish = async (id: string, published: boolean) => {
    const { error } = await supabase
      .from('exams')
      .update({ is_published: !published })
      .eq('id', id);

    if (!error) {
      toast.success(published ? 'Exam unpublished' : 'Exam published');
      fetchExams();
    }
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam?')) return;
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (!error) {
      toast.success('Exam deleted');
      fetchExams();
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
            <h1 className="text-2xl font-bold">Manage Exams</h1>
            <p className="text-muted-foreground">Create and manage course exams</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Course *</Label>
                  <Select
                    value={newExam.course_id}
                    onValueChange={(v) => setNewExam({ ...newExam, course_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={newExam.title}
                    onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                    placeholder="Final Exam"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newExam.description}
                    onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                    placeholder="Exam description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      value={newExam.duration_minutes}
                      onChange={(e) => setNewExam({ ...newExam, duration_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Score</Label>
                    <Input
                      type="number"
                      value={newExam.max_score}
                      onChange={(e) => setNewExam({ ...newExam, max_score: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Passing Score</Label>
                    <Input
                      type="number"
                      value={newExam.passing_score}
                      onChange={(e) => setNewExam({ ...newExam, passing_score: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={newExam.start_date}
                      onChange={(e) => setNewExam({ ...newExam, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="datetime-local"
                      value={newExam.end_date}
                      onChange={(e) => setNewExam({ ...newExam, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newExam.is_published}
                    onCheckedChange={(v) => setNewExam({ ...newExam, is_published: v })}
                  />
                  <Label>Publish immediately</Label>
                </div>
                <Button onClick={createExam} className="w-full">
                  Create Exam
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Exams Created</h3>
              <p className="text-muted-foreground">Create your first exam to assess students</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>{exam.courses?.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {exam.duration_minutes} min
                      </div>
                    </TableCell>
                    <TableCell>{exam.passing_score}/{exam.max_score}</TableCell>
                    <TableCell>
                      <Badge variant={exam.is_published ? 'default' : 'secondary'}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePublish(exam.id, exam.is_published)}
                        >
                          {exam.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteExam(exam.id)}
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

export default ManageExams;
