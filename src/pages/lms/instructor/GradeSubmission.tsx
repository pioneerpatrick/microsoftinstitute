import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  User,
  Calendar,
  CheckCircle,
  Save,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface Submission {
  id: string;
  user_id: string;
  assignment_id: string;
  content: string | null;
  file_url: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  due_date: string | null;
  courses: {
    title: string;
  };
}

interface StudentProfile {
  full_name: string | null;
  email: string | null;
}

const GradeSubmission = () => {
  const { submissionId } = useParams();
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    if (user && isStaff && submissionId) {
      fetchSubmission();
    }
  }, [user, isStaff, submissionId]);

  const fetchSubmission = async () => {
    // Fetch submission
    const { data: subData, error: subError } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (subError || !subData) {
      toast.error('Submission not found');
      navigate('/lms/instructor/assignments');
      return;
    }

    setSubmission(subData);
    setGrading({
      score: subData.score || 0,
      feedback: subData.feedback || ''
    });

    // Fetch assignment
    const { data: assignData } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        description,
        max_score,
        due_date,
        courses (
          title
        )
      `)
      .eq('id', subData.assignment_id)
      .single();

    if (assignData) {
      setAssignment(assignData as Assignment);
    }

    // Fetch student profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', subData.user_id)
      .single();

    if (profileData) {
      setStudent(profileData);
    }

    setIsLoading(false);
  };

  const saveGrade = async () => {
    if (!submission) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        score: grading.score,
        feedback: grading.feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user?.id
      })
      .eq('id', submission.id);

    if (error) {
      toast.error('Failed to save grade');
    } else {
      toast.success('Grade saved successfully!');
      fetchSubmission();
    }
    
    setIsSaving(false);
  };

  const isFilePreviewable = (url: string | null) => {
    if (!url) return false;
    const ext = url.split('.').pop()?.toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
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
      <div className="space-y-4 h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lms/instructor/assignments')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Grade Submission</h1>
              <p className="text-sm text-muted-foreground">
                {assignment?.title} - {assignment?.courses?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={submission?.status === 'graded' ? 'default' : 'secondary'}>
              {submission?.status === 'graded' ? 'Graded' : 'Pending'}
            </Badge>
            <Button onClick={saveGrade} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Grade'}
            </Button>
          </div>
        </div>

        {/* Main Content - Resizable Panels */}
        <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-12rem)] rounded-lg border">
          {/* Left Panel - Submission Content */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-muted/50">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Student Submission
                </h2>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {/* Student Info */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{student?.full_name || 'Student'}</p>
                        <p className="text-sm text-muted-foreground">{student?.email}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {submission && format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                        </div>
                        {assignment?.due_date && submission && new Date(submission.submitted_at) > new Date(assignment.due_date) && (
                          <Badge variant="destructive" className="mt-1">Late</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submission Content */}
                {submission?.content && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Written Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {submission.content}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* File Preview */}
                {submission?.file_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Attached File</span>
                        <Button variant="outline" size="sm" asChild>
                          <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in New Tab
                          </a>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isFilePreviewable(submission.file_url) ? (
                        <div className="border rounded-lg overflow-hidden bg-muted/30">
                          {submission.file_url.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                              src={submission.file_url}
                              className="w-full h-[500px]"
                              title="PDF Preview"
                            />
                          ) : (
                            <img
                              src={submission.file_url}
                              alt="Submission"
                              className="max-w-full h-auto"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg">
                          <div className="text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              File preview not available
                            </p>
                            <Button variant="outline" size="sm" className="mt-2" asChild>
                              <a href={submission.file_url} download>
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!submission?.content && !submission?.file_url && (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No content submitted
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Grading Form */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-muted/50">
                <h2 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Grading
                </h2>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Assignment Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Assignment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title:</span>
                      <span className="font-medium">{assignment?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Score:</span>
                      <span className="font-medium">{assignment?.max_score} points</span>
                    </div>
                    {assignment?.due_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span className="font-medium">
                          {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {assignment?.description && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Assignment Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{assignment.description}</p>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                {/* Score Input */}
                <div className="space-y-2">
                  <Label htmlFor="score" className="text-base font-semibold">Score</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      max={assignment?.max_score || 100}
                      value={grading.score}
                      onChange={(e) => setGrading({ ...grading, score: parseInt(e.target.value) || 0 })}
                      className="text-2xl font-bold text-center w-24"
                    />
                    <span className="text-xl text-muted-foreground">/ {assignment?.max_score || 100}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[25, 50, 75, 100].map((percent) => (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        onClick={() => setGrading({ 
                          ...grading, 
                          score: Math.round((assignment?.max_score || 100) * percent / 100) 
                        })}
                      >
                        {percent}%
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label htmlFor="feedback" className="text-base font-semibold">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={grading.feedback}
                    onChange={(e) => setGrading({ ...grading, feedback: e.target.value })}
                    placeholder="Provide detailed feedback for the student..."
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This feedback will be visible to the student once graded.
                  </p>
                </div>

                {/* Quick Feedback Templates */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick Feedback</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Excellent work!',
                      'Good effort',
                      'Needs improvement',
                      'Missing key points',
                      'Late submission'
                    ].map((template) => (
                      <Button
                        key={template}
                        variant="outline"
                        size="sm"
                        onClick={() => setGrading({ 
                          ...grading, 
                          feedback: grading.feedback ? `${grading.feedback}\n${template}` : template 
                        })}
                      >
                        {template}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Previous Grade Info */}
                {submission?.graded_at && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Last graded: {format(new Date(submission.graded_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </LMSLayout>
  );
};

export default GradeSubmission;
