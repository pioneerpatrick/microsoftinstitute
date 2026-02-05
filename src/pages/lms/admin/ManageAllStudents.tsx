import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Users, 
  Loader2, 
  UserX, 
  UserCheck, 
  Clock, 
  Ban,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface StudentProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  student_status: string | null;
  status_reason: string | null;
  status_updated_at: string | null;
  enrollments: {
    id: string;
    course_id: string;
    status: string;
    courses: { title: string } | null;
  }[];
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  expelled: 'bg-red-100 text-red-800',
  deferred: 'bg-blue-100 text-blue-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="h-4 w-4" />,
  suspended: <Clock className="h-4 w-4" />,
  expelled: <Ban className="h-4 w-4" />,
  deferred: <AlertTriangle className="h-4 w-4" />,
};

const ManageAllStudents = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Status change dialog
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && user && !isAdmin) {
      navigate('/lms/dashboard');
      toast.error('Only administrators can access this page');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchStudents();
    }
  }, [user, isAdmin]);

  const fetchStudents = async () => {
    setIsLoading(true);

    // Get students with enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        course_id,
        status,
        courses (title)
      `)
      .order('enrolled_at', { ascending: false });

    // Get all profiles with student status
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, student_status, status_reason, status_updated_at');

    // Get student role users
    const { data: studentRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    const studentIds = new Set(studentRoles?.map(r => r.user_id) || []);
    const enrolledUserIds = new Set(enrollments?.map(e => e.user_id) || []);
    
    // Combine both sets
    const allStudentIds = new Set([...studentIds, ...enrolledUserIds]);

    const studentsData: StudentProfile[] = [];
    
    for (const userId of allStudentIds) {
      const profile = profiles?.find(p => p.id === userId);
      const userEnrollments = enrollments?.filter(e => e.user_id === userId) || [];
      
      studentsData.push({
        id: userId,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        student_status: profile?.student_status || 'active',
        status_reason: profile?.status_reason || null,
        status_updated_at: profile?.status_updated_at || null,
        enrollments: userEnrollments.map(e => ({
          id: e.id,
          course_id: e.course_id,
          status: e.status || 'active',
          courses: e.courses,
        })),
      });
    }

    setStudents(studentsData);
    setIsLoading(false);
  };

  const openStatusDialog = (student: StudentProfile, status: string) => {
    setSelectedStudent(student);
    setNewStatus(status);
    setStatusReason('');
    setStatusDialog(true);
  };

  const updateStudentStatus = async () => {
    if (!selectedStudent || !newStatus) return;

    setIsUpdating(true);

    try {
      // Update profile status
      const { error } = await supabase
        .from('profiles')
        .update({
          student_status: newStatus,
          status_reason: statusReason,
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id,
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      // If student is suspended or expelled, remove their fees from accounting
      if (newStatus === 'suspended' || newStatus === 'expelled') {
        // First delete fee payments
        await supabase
          .from('fee_payments')
          .delete()
          .eq('user_id', selectedStudent.id);
        
        // Then delete student fees
        await supabase
          .from('student_fees')
          .delete()
          .eq('user_id', selectedStudent.id);
      }

      // Send notification email
      try {
        await supabase.functions.invoke('send-student-status-notification', {
          body: {
            email: selectedStudent.email,
            studentName: selectedStudent.full_name || 'Student',
            status: newStatus,
            reason: statusReason,
            effectiveDate: format(new Date(), 'MMMM d, yyyy'),
          },
        });
      } catch (emailError) {
        console.error('Status notification email failed:', emailError);
      }

      toast.success(`Student status updated to ${newStatus}`);
      setStatusDialog(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.student_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Student Management</h1>
            <p className="text-muted-foreground">Manage student statuses and enrollments</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {students.length} Students
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
              <SelectItem value="expelled">Expelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                              {student.full_name?.charAt(0) || 'S'}
                            </div>
                            <span className="truncate max-w-[150px]">
                              {student.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {student.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${statusColors[student.student_status || 'active']}`}>
                            {statusIcons[student.student_status || 'active']}
                            {student.student_status || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {student.enrollments.slice(0, 2).map(e => (
                              <Badge key={e.id} variant="outline" className="text-xs">
                                {e.courses?.title?.slice(0, 15)}...
                              </Badge>
                            ))}
                            {student.enrollments.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{student.enrollments.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {student.student_status !== 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStatusDialog(student, 'active')}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {student.student_status !== 'suspended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600"
                                onClick={() => openStatusDialog(student, 'suspended')}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}
                            {student.student_status !== 'deferred' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600"
                                onClick={() => openStatusDialog(student, 'deferred')}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            )}
                            {student.student_status !== 'expelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => openStatusDialog(student, 'expelled')}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Status Change Dialog */}
        <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {statusIcons[newStatus]}
                {newStatus === 'active' ? 'Reinstate' : 
                 newStatus === 'suspended' ? 'Suspend' :
                 newStatus === 'deferred' ? 'Defer' : 'Expel'} Student
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedStudent?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedStudent?.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Reason for Status Change *</Label>
                <Textarea
                  placeholder={`Enter reason for ${newStatus === 'active' ? 'reinstating' : newStatus === 'suspended' ? 'suspending' : newStatus === 'deferred' ? 'deferring' : 'expelling'} this student...`}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                />
              </div>

              {newStatus === 'expelled' && (
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  <strong>Warning:</strong> Expelling a student will permanently revoke their access to all courses and the LMS. This action should only be used in serious cases.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={updateStudentStatus}
                disabled={!statusReason || isUpdating}
                variant={newStatus === 'expelled' ? 'destructive' : 'default'}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Confirm ${newStatus === 'active' ? 'Reinstatement' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default ManageAllStudents;
