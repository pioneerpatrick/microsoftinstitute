import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, Users, Download, Eye, GraduationCap, AlertTriangle, 
  CheckCircle, XCircle, Clock, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  student_status: string | null;
  created_at: string;
  enrollments: Array<{
    course_id: string;
    status: string;
    courses: { title: string } | null;
  }>;
  fees: Array<{
    amount_due: number;
    amount_paid: number;
    balance: number;
    status: string;
  }>;
}

const MasterStudents = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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
      fetchStudents();
    }
  }, [user, isAdmin]);

  const fetchStudents = async () => {
    // Get all students (those with student role)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    const studentIds = rolesData?.map(r => r.user_id) || [];

    if (studentIds.length === 0) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    // Get profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, student_status, created_at')
      .in('id', studentIds);

    // Get enrollments
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('user_id, course_id, status, courses(title)')
      .in('user_id', studentIds);

    // Get fees
    const { data: feesData } = await supabase
      .from('student_fees')
      .select('user_id, amount_due, amount_paid, balance, status')
      .in('user_id', studentIds);

    // Combine data
    const studentsData: Student[] = (profilesData || []).map(profile => ({
      ...profile,
      enrollments: (enrollmentsData || [])
        .filter(e => e.user_id === profile.id)
        .map(e => ({
          course_id: e.course_id,
          status: e.status || 'active',
          courses: e.courses as { title: string } | null,
        })),
      fees: (feesData || []).filter(f => f.user_id === profile.id),
    }));

    setStudents(studentsData);
    setIsLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      active: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      suspended: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      expelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      deferred: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const config = statusConfig[status || 'active'] || statusConfig.active;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon} {status || 'active'}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (s.student_status || 'active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const csv = [
      'Name,Email,Status,Courses,Total Due,Total Paid,Balance,Created',
      ...filteredStudents.map(s => {
        const totalDue = s.fees.reduce((sum, f) => sum + f.amount_due, 0);
        const totalPaid = s.fees.reduce((sum, f) => sum + f.amount_paid, 0);
        const balance = s.fees.reduce((sum, f) => sum + f.balance, 0);
        const courses = s.enrollments.map(e => e.courses?.title).join('; ');
        return `"${s.full_name || ''}","${s.email || ''}","${s.student_status || 'active'}","${courses}",${totalDue},${totalPaid},${balance},"${format(new Date(s.created_at), 'yyyy-MM-dd')}"`;
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master-students-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Student data exported');
  };

  // Stats
  const activeCount = students.filter(s => (s.student_status || 'active') === 'active').length;
  const suspendedCount = students.filter(s => s.student_status === 'suspended').length;
  const expelledCount = students.filter(s => s.student_status === 'expelled').length;
  const deferredCount = students.filter(s => s.student_status === 'deferred').length;

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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Master Students Table
            </h1>
            <p className="text-muted-foreground">Comprehensive view of all students in the system</p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{suspendedCount}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{expelledCount}</p>
                  <p className="text-sm text-muted-foreground">Expelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deferredCount}</p>
                  <p className="text-sm text-muted-foreground">Deferred</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="expelled">Expelled</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Students ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Fees Due</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const totalDue = student.fees.reduce((sum, f) => sum + f.amount_due, 0);
                      const balance = student.fees.reduce((sum, f) => sum + f.balance, 0);
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{student.full_name || 'Unnamed'}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(student.student_status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {student.enrollments.length === 0 ? (
                                <span className="text-muted-foreground">No courses</span>
                              ) : (
                                student.enrollments.slice(0, 2).map((e, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {e.courses?.title?.substring(0, 20)}...
                                  </Badge>
                                ))
                              )}
                              {student.enrollments.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{student.enrollments.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(totalDue)}</TableCell>
                          <TableCell>
                            <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                              {formatCurrency(balance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(student.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Details Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedStudent.full_name || 'Unnamed'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedStudent.student_status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {format(new Date(selectedStudent.created_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Enrolled Courses</h4>
                  {selectedStudent.enrollments.length === 0 ? (
                    <p className="text-muted-foreground">No course enrollments</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudent.enrollments.map((e, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span>{e.courses?.title}</span>
                          <Badge variant="outline">{e.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Fee Summary</h4>
                  {selectedStudent.fees.length === 0 ? (
                    <p className="text-muted-foreground">No fees assigned</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-lg font-bold">
                            {formatCurrency(selectedStudent.fees.reduce((s, f) => s + f.amount_due, 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Due</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(selectedStudent.fees.reduce((s, f) => s + f.amount_paid, 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Paid</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(selectedStudent.fees.reduce((s, f) => s + f.balance, 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">Balance</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedStudent(null);
                      navigate('/lms/admin/students');
                    }}
                  >
                    Manage Status
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default MasterStudents;
