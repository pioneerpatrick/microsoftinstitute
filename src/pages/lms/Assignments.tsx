import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format, isPast, formatDistanceToNow } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number;
  course_id: string;
  courses: {
    title: string;
  };
  submission?: {
    id: string;
    status: string;
    score: number | null;
    feedback: string | null;
    submitted_at: string;
  };
}

const Assignments = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseFilter = searchParams.get('course');
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user, courseFilter]);

  const fetchAssignments = async () => {
    if (!user) return;

    let query = supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        due_date,
        max_score,
        course_id,
        courses (
          title
        )
      `)
      .eq('is_published', true)
      .order('due_date', { ascending: true });

    if (courseFilter) {
      query = query.eq('course_id', courseFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Fetch user's submissions for these assignments
      const assignmentIds = data.map(a => a.id);
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('user_id', user.id)
        .in('assignment_id', assignmentIds);

      const assignmentsWithSubmissions = data.map(assignment => ({
        ...assignment,
        submission: submissions?.find(s => s.assignment_id === assignment.id)
      }));

      setAssignments(assignmentsWithSubmissions as Assignment[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !selectedAssignment) return;
    if (!submissionContent && !submissionFile) {
      toast.error('Please add content or a file URL');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: selectedAssignment.id,
        user_id: user.id,
        content: submissionContent,
        file_url: submissionFile || null,
        status: 'submitted'
      });

    if (error) {
      toast.error('Failed to submit assignment');
    } else {
      toast.success('Assignment submitted successfully!');
      setSubmitDialogOpen(false);
      setSubmissionContent('');
      setSubmissionFile('');
      fetchAssignments();
    }

    setIsSubmitting(false);
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.submission) {
      if (assignment.submission.status === 'graded') {
        return (
          <Badge className="bg-green-500">
            Graded: {assignment.submission.score}/{assignment.max_score}
          </Badge>
        );
      }
      return <Badge className="bg-blue-500">Submitted</Badge>;
    }
    if (assignment.due_date && isPast(new Date(assignment.due_date))) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const pendingAssignments = assignments.filter(a => !a.submission);
  const submittedAssignments = assignments.filter(a => a.submission);

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </LMSLayout>
    );
  }

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(assignment)}
              <span className="text-sm text-muted-foreground">
                {assignment.courses?.title}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{assignment.title}</h3>
            {assignment.description && (
              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                {assignment.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {assignment.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Max Score: {assignment.max_score}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {assignment.submission ? (
              assignment.submission.status === 'graded' && assignment.submission.feedback ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">View Feedback</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Feedback for {assignment.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label className="text-sm font-medium">Score</Label>
                        <p className="text-2xl font-bold text-primary">
                          {assignment.submission.score}/{assignment.max_score}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Instructor Feedback</Label>
                        <p className="mt-1 text-muted-foreground">
                          {assignment.submission.feedback}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button variant="outline" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submitted
                </Button>
              )
            ) : (
              <Button
                onClick={() => {
                  setSelectedAssignment(assignment);
                  setSubmitDialogOpen(true);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <LMSLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">View and submit your assignments</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({submittedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingAssignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    You don't have any pending assignments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </TabsContent>

          <TabsContent value="submitted" className="mt-6 space-y-4">
            {submittedAssignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Submissions Yet</h3>
                  <p className="text-muted-foreground">
                    Your submitted assignments will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              submittedAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Submit Dialog */}
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="font-semibold">{selectedAssignment?.title}</h3>
                {selectedAssignment?.due_date && (
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(selectedAssignment.due_date), 'MMMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Your Answer</Label>
                <Textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Write your submission here..."
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label>File URL (optional)</Label>
                <Input
                  value={submissionFile}
                  onChange={(e) => setSubmissionFile(e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-muted-foreground">
                  Upload your file to Google Drive or another service and paste the link here
                </p>
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={isSubmitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default Assignments;
