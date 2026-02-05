import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, Users, BookOpen, DollarSign, Calendar, TrendingUp,
  FileText, CheckCircle, Clock, Eye, MessageSquare, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface InstructorReport {
  id: string;
  instructor_id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  content: string;
  status: string;
  student_count: number | null;
  feedback: string | null;
  submitted_at: string | null;
  profiles?: { full_name: string | null; email: string | null };
  courses?: { title: string } | null;
}

const AdminReports = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<InstructorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InstructorReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalRevenue: 0,
    totalPendingReports: 0,
    avgAttendance: 0,
    monthlyEnrollments: 0,
    monthlyPayments: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/lms/dashboard');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    // Fetch all instructor reports
    const { data: reportsData } = await supabase
      .from('instructor_reports')
      .select('*, courses(title)')
      .order('submitted_at', { ascending: false });

    if (reportsData) {
      const instructorIds = [...new Set(reportsData.map(r => r.instructor_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', instructorIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const enrichedReports = reportsData.map(r => ({
        ...r,
        profiles: profilesMap.get(r.instructor_id),
      }));
      setReports(enrichedReports as InstructorReport[]);
    }

    // Fetch comprehensive stats
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [
      { count: studentsCount },
      { count: instructorsCount },
      { count: coursesCount },
      { data: paymentsData },
      { count: pendingReportsCount },
      { data: attendanceData },
      { count: monthlyEnrollmentsCount },
    ] = await Promise.all([
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('fee_payments').select('amount'),
      supabase.from('instructor_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('attendance_records').select('status'),
      supabase.from('enrollments').select('*', { count: 'exact', head: true })
        .gte('enrolled_at', monthStart.toISOString())
        .lte('enrolled_at', monthEnd.toISOString()),
    ]);

    const totalRevenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
    const totalAttendance = attendanceData?.length || 1;
    const avgAttendance = Math.round((presentCount / totalAttendance) * 100);

    // Monthly payments
    const { data: monthlyPaymentsData } = await supabase
      .from('fee_payments')
      .select('amount')
      .gte('payment_date', monthStart.toISOString())
      .lte('payment_date', monthEnd.toISOString());

    const monthlyPayments = monthlyPaymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;

    setStats({
      totalStudents: studentsCount || 0,
      totalInstructors: instructorsCount || 0,
      totalCourses: coursesCount || 0,
      totalRevenue,
      totalPendingReports: pendingReportsCount || 0,
      avgAttendance,
      monthlyEnrollments: monthlyEnrollmentsCount || 0,
      monthlyPayments,
    });

    setIsLoading(false);
  };

  const handleReviewReport = async (status: 'reviewed' | 'rejected') => {
    if (!selectedReport) return;

    const { error } = await supabase
      .from('instructor_reports')
      .update({
        status,
        feedback: feedback || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedReport.id);

    if (error) {
      toast.error('Failed to update report');
    } else {
      toast.success(`Report ${status}`);
      setSelectedReport(null);
      setFeedback('');
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
      submitted: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      reviewed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { variant: 'destructive', icon: <MessageSquare className="h-3 w-3" /> },
    };
    const c = config[status] || config.submitted;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        {c.icon} {status}
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Admin Reports Dashboard
          </h1>
          <p className="text-muted-foreground">Cross-department analytics and instructor reports</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{stats.totalStudents}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{stats.totalInstructors}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Instructors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-green-100 rounded-lg shrink-0">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold truncate">{stats.avgAttendance}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground shrink-0">Enrollments</span>
                <Badge variant="outline" className="truncate max-w-[50%]">{stats.monthlyEnrollments}</Badge>
              </div>
              <div className="flex justify-between items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground shrink-0">Payments</span>
                <Badge variant="outline" className="truncate max-w-[60%] text-xs">{formatCurrency(stats.monthlyPayments)}</Badge>
              </div>
              <div className="flex justify-between items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground shrink-0">Courses</span>
                <Badge variant="outline" className="truncate max-w-[50%]">{stats.totalCourses}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-yellow-100 rounded-full shrink-0">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl sm:text-3xl font-bold truncate">{stats.totalPendingReports}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Reports awaiting review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start text-sm" 
                variant="outline"
                size="sm"
                onClick={() => navigate('/lms/admin/students')}
              >
                <Users className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Manage Students</span>
              </Button>
              <Button 
                className="w-full justify-start text-sm" 
                variant="outline"
                size="sm"
                onClick={() => navigate('/lms/admin/staff')}
              >
                <UserCheck className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Manage Staff</span>
              </Button>
              <Button 
                className="w-full justify-start text-sm" 
                variant="outline"
                size="sm"
                onClick={() => navigate('/lms/admin/accounting')}
              >
                <DollarSign className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">View Accounting</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructor Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Instructor Reports
            </CardTitle>
            <CardDescription>Review and respond to instructor submitted reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({reports.filter(r => r.status === 'submitted').length})
                </TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                <TabsTrigger value="all">All Reports</TabsTrigger>
              </TabsList>

              {['pending', 'reviewed', 'all'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Instructor</TableHead>
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
                      {reports
                        .filter(r => {
                          if (tab === 'pending') return r.status === 'submitted';
                          if (tab === 'reviewed') return r.status === 'reviewed';
                          return true;
                        })
                        .map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{report.profiles?.full_name || 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{report.profiles?.email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{report.report_type}</TableCell>
                            <TableCell>{report.courses?.title || 'All Courses'}</TableCell>
                            <TableCell>
                              {format(new Date(report.report_period_start), 'MMM d')} -{' '}
                              {format(new Date(report.report_period_end), 'MMM d')}
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
                                onClick={() => {
                                  setSelectedReport(report);
                                  setFeedback(report.feedback || '');
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {reports.filter(r => {
                    if (tab === 'pending') return r.status === 'submitted';
                    if (tab === 'reviewed') return r.status === 'reviewed';
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No reports found
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Review Report Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Instructor</p>
                    <p className="font-medium">{selectedReport.profiles?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{selectedReport.report_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {format(new Date(selectedReport.report_period_start), 'MMM d, yyyy')} -{' '}
                      {format(new Date(selectedReport.report_period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Student Count</p>
                    <p className="font-medium">{selectedReport.student_count || 'Not specified'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Report Content</p>
                  <div className="bg-muted p-4 rounded whitespace-pre-wrap">
                    {selectedReport.content}
                  </div>
                </div>

                {selectedReport.status === 'submitted' && (
                  <div className="space-y-2">
                    <Label>Your Feedback (Optional)</Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback to the instructor..."
                      rows={3}
                    />
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleReviewReport('reviewed')}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReviewReport('rejected')}
                        className="flex-1"
                      >
                        Request Revision
                      </Button>
                    </div>
                  </div>
                )}

                {selectedReport.feedback && selectedReport.status !== 'submitted' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Feedback Given</p>
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded border border-blue-200 dark:border-blue-800">
                      {selectedReport.feedback}
                    </div>
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

export default AdminReports;
