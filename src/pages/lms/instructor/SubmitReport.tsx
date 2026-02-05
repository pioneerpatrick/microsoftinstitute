import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Send, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Course {
  id: string;
  title: string;
}

interface Report {
  id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  content: string;
  status: string;
  submitted_at: string | null;
  feedback: string | null;
  student_count: number | null;
  courses?: { title: string } | null;
}

const SubmitReport = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);

  const [form, setForm] = useState({
    course_id: '',
    report_type: 'monthly',
    report_period_start: '',
    report_period_end: '',
    content: '',
    student_count: '',
    attendance_summary: '',
    performance_summary: '',
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
      fetchData();
    }
  }, [user, isStaff]);

  const fetchData = async () => {
    // Fetch courses taught by instructor
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('instructor_id', user?.id);

    if (coursesData) setCourses(coursesData);

    // Fetch reports by instructor
    const { data: reportsData } = await supabase
      .from('instructor_reports')
      .select('*, courses(title)')
      .eq('instructor_id', user?.id)
      .order('created_at', { ascending: false });

    if (reportsData) setReports(reportsData as Report[]);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.report_period_start || !form.report_period_end || !form.content) {
      toast.error('Please fill all required fields');
      return;
    }

    const { error } = await supabase
      .from('instructor_reports')
      .insert({
        instructor_id: user?.id,
        course_id: form.course_id || null,
        report_type: form.report_type,
        report_period_start: form.report_period_start,
        report_period_end: form.report_period_end,
        content: form.content,
        student_count: form.student_count ? parseInt(form.student_count) : null,
        attendance_summary: form.attendance_summary ? { notes: form.attendance_summary } : null,
        performance_summary: form.performance_summary ? { notes: form.performance_summary } : null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Failed to submit report');
      console.error(error);
    } else {
      toast.success('Report submitted successfully');
      setDialogOpen(false);
      setForm({
        course_id: '',
        report_type: 'monthly',
        report_period_start: '',
        report_period_end: '',
        content: '',
        student_count: '',
        attendance_summary: '',
        performance_summary: '',
      });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      submitted: <Clock className="h-3 w-3" />,
      reviewed: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
    };
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      submitted: 'secondary',
      reviewed: 'default',
      rejected: 'destructive',
    };
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {icons[status]} {status}
      </Badge>
    );
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
            <h1 className="text-2xl font-bold">Submit Reports</h1>
            <p className="text-muted-foreground">Submit monthly/term reports for your courses and departments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit New Report</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select
                      value={form.report_type}
                      onValueChange={(v) => setForm({ ...form, report_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="term">Term</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Course (Optional)</Label>
                    <Select
                      value={form.course_id || "all"}
                      onValueChange={(v) => setForm({ ...form, course_id: v === "all" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period Start *</Label>
                    <Input
                      type="date"
                      value={form.report_period_start}
                      onChange={(e) => setForm({ ...form, report_period_start: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period End *</Label>
                    <Input
                      type="date"
                      value={form.report_period_end}
                      onChange={(e) => setForm({ ...form, report_period_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Student Count</Label>
                  <Input
                    type="number"
                    value={form.student_count}
                    onChange={(e) => setForm({ ...form, student_count: e.target.value })}
                    placeholder="Number of students in period"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Report Content *</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Detailed report of activities, achievements, and observations..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attendance Summary</Label>
                  <Textarea
                    value={form.attendance_summary}
                    onChange={(e) => setForm({ ...form, attendance_summary: e.target.value })}
                    placeholder="Summary of student attendance patterns and issues..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Performance Summary</Label>
                  <Textarea
                    value={form.performance_summary}
                    onChange={(e) => setForm({ ...form, performance_summary: e.target.value })}
                    placeholder="Summary of student performance, grades, and improvements..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Reports
            </CardTitle>
            <CardDescription>Reports you've submitted for review</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports submitted yet. Click "New Report" to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="capitalize">{report.report_type}</TableCell>
                      <TableCell>{report.courses?.title || 'All Courses'}</TableCell>
                      <TableCell>
                        {format(new Date(report.report_period_start), 'MMM d')} -{' '}
                        {format(new Date(report.report_period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{report.student_count || '-'}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        {report.submitted_at
                          ? format(new Date(report.submitted_at), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Report Dialog */}
        <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
            </DialogHeader>
            {viewReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="capitalize font-medium">{viewReport.report_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Course</Label>
                    <p className="font-medium">{viewReport.courses?.title || 'All Courses'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Period</Label>
                    <p className="font-medium">
                      {format(new Date(viewReport.report_period_start), 'MMM d, yyyy')} -{' '}
                      {format(new Date(viewReport.report_period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(viewReport.status)}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Content</Label>
                  <p className="whitespace-pre-wrap bg-muted p-3 rounded mt-1">
                    {viewReport.content}
                  </p>
                </div>
                {viewReport.feedback && (
                  <div>
                    <Label className="text-muted-foreground">Admin Feedback</Label>
                    <p className="whitespace-pre-wrap bg-blue-50 dark:bg-blue-950 p-3 rounded mt-1 border border-blue-200 dark:border-blue-800">
                      {viewReport.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default SubmitReport;
