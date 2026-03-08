import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Users, Download, Eye, GraduationCap, AlertTriangle, 
  CheckCircle, XCircle, Clock, Filter, Trash2, Loader2, Mail, RefreshCw, UserPlus, Copy, Pencil
} from 'lucide-react';
import EditStudentDialog from '@/components/admin/EditStudentDialog';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  student_status: string | null;
  admission_number: string | null;
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

interface Course {
  id: string;
  title: string;
  description: string | null;
  duration_hours: number | null;
  category?: string | null;
}

interface FeeStructure {
  id: string;
  name: string;
  course_id: string | null;
  amount: number;
  currency: string;
}

interface ExistingProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const MasterStudents = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [existingProfiles, setExistingProfiles] = useState<ExistingProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  
  // Enrollment dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  
  // New student form
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    email: '',
    password: '',
    fee_structure_id: '',
  });

  // Existing student enrollment
  const [existingEnrollment, setExistingEnrollment] = useState({
    student_id: '',
    fee_structure_id: '',
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
      fetchStudents();
      fetchFeeStructures();
      fetchCourses();
      fetchExistingProfiles();
    }
  }, [user, isAdmin]);

  const fetchFeeStructures = async () => {
    const { data } = await supabase
      .from('fee_structures')
      .select('id, name, course_id, amount, currency')
      .eq('is_active', true)
      .order('name');
    if (data) setFeeStructures(data);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title, description, duration_hours, category')
      .order('title');
    if (data) setCourses(data);
  };

  const fetchExistingProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    if (data) setExistingProfiles(data);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const assignAdmissionNumber = async (userId: string) => {
    // Check if already has admission number
    const { data: profile } = await supabase
      .from('profiles')
      .select('admission_number')
      .eq('id', userId)
      .single();
    
    if (profile?.admission_number) return profile.admission_number;

    // Generate via DB function
    const { data: result } = await supabase.rpc('generate_admission_number');
    if (result) {
      await supabase
        .from('profiles')
        .update({ admission_number: result })
        .eq('id', userId);
      return result as string;
    }
    return null;
  };

  const copyCredentials = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(
        `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
      );
      setCopiedCredentials(true);
      toast.success('Credentials copied to clipboard!');
      setTimeout(() => setCopiedCredentials(false), 2000);
    }
  };

  const createStudentAndEnroll = async () => {
    if (!newStudent.full_name || !newStudent.email || !newStudent.fee_structure_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    const password = newStudent.password || generatePassword();

    try {
      let userId: string | null = null;
      let isExistingUser = false;

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newStudent.email)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
        isExistingUser = true;
      } else {
        // Create user via edge function
        const response = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'create_user',
            email: newStudent.email,
            password: password,
            full_name: newStudent.full_name,
            role: 'student',
          },
        });

        if (response.error) throw new Error(response.error.message);
        if (response.data.error) {
          if (response.data.error.includes('already been registered')) {
            const { data: retryProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', newStudent.email)
              .maybeSingle();
            if (retryProfile) {
              userId = retryProfile.id;
              isExistingUser = true;
            } else {
              throw new Error('User exists but profile not found.');
            }
          } else {
            throw new Error(response.data.error);
          }
        } else {
          userId = response.data.user?.id;
        }
      }

      if (userId) {
        // Auto-assign admission number
        const admNo = await assignAdmissionNumber(userId);
        
        const selectedFeeStructure = feeStructures.find(f => f.id === newStudent.fee_structure_id);
        const course = selectedFeeStructure?.course_id 
          ? courses.find(c => c.id === selectedFeeStructure.course_id)
          : null;

        // Enroll in course if fee structure has a course
        if (selectedFeeStructure?.course_id) {
          const { data: existingEnroll } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', selectedFeeStructure.course_id)
            .maybeSingle();

          if (!existingEnroll) {
            await supabase.from('enrollments').insert({
              user_id: userId,
              course_id: selectedFeeStructure.course_id,
              status: 'active',
              progress_percentage: 0,
            });
          }
        }

        // Create student fee record
        if (selectedFeeStructure) {
          await supabase.from('student_fees').insert({
            user_id: userId,
            fee_structure_id: selectedFeeStructure.id,
            course_id: selectedFeeStructure.course_id,
            amount_due: selectedFeeStructure.amount,
            amount_paid: 0,
            balance: selectedFeeStructure.amount,
            status: 'pending',
          });
        }

        // Send enrollment email
        try {
          await supabase.functions.invoke('send-enrollment-email', {
            body: {
              studentEmail: newStudent.email,
              studentName: newStudent.full_name,
              courseTitle: course?.title || selectedFeeStructure?.name || 'New Program',
              courseDescription: course?.description,
              courseDuration: course?.duration_hours,
              courseCategory: course?.category,
              courseSchedule: 'Classes held Monday to Friday, 8:00 AM - 5:00 PM EAT',
              credentials: isExistingUser ? undefined : { email: newStudent.email, password },
              feeStructure: selectedFeeStructure ? {
                name: selectedFeeStructure.name,
                amount: selectedFeeStructure.amount,
                currency: selectedFeeStructure.currency,
              } : undefined,
            },
          });
        } catch (emailError) {
          console.error('Enrollment email failed:', emailError);
        }
      }

      if (!isExistingUser) {
        setCreatedCredentials({ email: newStudent.email, password });
        toast.success('Student account created and enrolled successfully!');
      } else {
        toast.success('Existing student enrolled successfully!');
        setEnrollDialogOpen(false);
      }

      setNewStudent({ full_name: '', email: '', password: '', fee_structure_id: '' });
      fetchStudents();
      fetchExistingProfiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create student account');
    } finally {
      setCreating(false);
    }
  };

  const enrollExistingStudent = async () => {
    if (!existingEnrollment.student_id || !existingEnrollment.fee_structure_id) {
      toast.error('Please select a student and fee structure');
      return;
    }

    setEnrolling(true);

    try {
      // Auto-assign admission number
      await assignAdmissionNumber(existingEnrollment.student_id);
      
      const selectedFeeStructure = feeStructures.find(f => f.id === existingEnrollment.fee_structure_id);
      const student = existingProfiles.find(s => s.id === existingEnrollment.student_id);
      const course = selectedFeeStructure?.course_id 
        ? courses.find(c => c.id === selectedFeeStructure.course_id)
        : null;

      // Enroll in course if applicable
      if (selectedFeeStructure?.course_id) {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', existingEnrollment.student_id)
          .eq('course_id', selectedFeeStructure.course_id)
          .maybeSingle();

        if (existing) {
          toast.error('Student is already enrolled in this course');
          setEnrolling(false);
          return;
        }

        await supabase.from('enrollments').insert({
          user_id: existingEnrollment.student_id,
          course_id: selectedFeeStructure.course_id,
          status: 'active',
          progress_percentage: 0,
        });
      }

      // Create fee record
      if (selectedFeeStructure) {
        await supabase.from('student_fees').insert({
          user_id: existingEnrollment.student_id,
          fee_structure_id: selectedFeeStructure.id,
          course_id: selectedFeeStructure.course_id,
          amount_due: selectedFeeStructure.amount,
          amount_paid: 0,
          balance: selectedFeeStructure.amount,
          status: 'pending',
        });
      }

      // Send enrollment email
      try {
        await supabase.functions.invoke('send-enrollment-email', {
          body: {
            studentEmail: student?.email || '',
            studentName: student?.full_name || 'Student',
            courseTitle: course?.title || selectedFeeStructure?.name || 'New Program',
            courseDescription: course?.description,
            courseDuration: course?.duration_hours,
            courseCategory: course?.category,
            courseSchedule: 'Classes held Monday to Friday, 8:00 AM - 5:00 PM EAT',
          },
        });
      } catch (emailError) {
        console.error('Enrollment email failed:', emailError);
      }

      toast.success('Student enrolled successfully! Confirmation email sent.');
      setExistingEnrollment({ student_id: '', fee_structure_id: '' });
      setEnrollDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll student');
    } finally {
      setEnrolling(false);
    }
  };

  const fetchStudents = async () => {
    // Get all enrolled students (from enrollments table) and students with fees
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('user_id, course_id, status, courses(title)');

    const { data: feesData } = await supabase
      .from('student_fees')
      .select('user_id, amount_due, amount_paid, balance, status');

    // Collect all unique student IDs from enrollments and fees
    const enrolledUserIds = enrollmentsData?.map(e => e.user_id) || [];
    const feeUserIds = feesData?.map(f => f.user_id) || [];
    const allStudentIds = [...new Set([...enrolledUserIds, ...feeUserIds])];

    if (allStudentIds.length === 0) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    // Get profiles for these students
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, student_status, admission_number, created_at')
      .in('id', allStudentIds);

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
      'Admission No,Name,Email,Status,Courses,Total Due,Total Paid,Balance,Created',
      ...filteredStudents.map(s => {
        const totalDue = s.fees.reduce((sum, f) => sum + f.amount_due, 0);
        const totalPaid = s.fees.reduce((sum, f) => sum + f.amount_paid, 0);
        const balance = s.fees.reduce((sum, f) => sum + f.balance, 0);
        const courses = s.enrollments.map(e => e.courses?.title).join('; ');
        return `"${s.admission_number || ''}","${s.full_name || ''}","${s.email || ''}","${s.student_status || 'active'}","${courses}",${totalDue},${totalPaid},${balance},"${format(new Date(s.created_at), 'yyyy-MM-dd')}"`;
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

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete all related data in order (cascade delete)
      
      // 1. Delete assignment submissions
      await supabase
        .from('assignment_submissions')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 2. Delete lesson progress
      await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 3. Delete quiz attempts
      await supabase
        .from('quiz_attempts')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 4. Delete exam attempts
      await supabase
        .from('exam_attempts')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 5. Delete fee payments
      await supabase
        .from('fee_payments')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 6. Delete student fees
      await supabase
        .from('student_fees')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 7. Delete certificates
      await supabase
        .from('certificates')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 8. Delete enrollments
      await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 9. Delete attendance records
      await supabase
        .from('attendance_records')
        .delete()
        .eq('student_id', studentToDelete.id);
      
      // 10. Delete live session attendance
      await supabase
        .from('live_session_attendance')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 11. Delete live session requests
      await supabase
        .from('live_session_requests')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 12. Delete forum replies
      await supabase
        .from('forum_replies')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 13. Delete forum topics
      await supabase
        .from('forum_topics')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 14. Delete messages (sent and received)
      await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${studentToDelete.id},recipient_id.eq.${studentToDelete.id}`);
      
      // 15. Delete user roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', studentToDelete.id);
      
      // 16. Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', studentToDelete.id);
      
      // 17. Delete the auth user via edge function
      const { error: deleteError } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete_user',
          user_id: studentToDelete.id,
        },
      });
      
      if (deleteError) throw deleteError;
      
      toast.success(`Student ${studentToDelete.full_name || studentToDelete.email} deleted successfully`);
      setStudentToDelete(null);
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendEnrollmentEmail = async (student: Student) => {
    setSendingEmail(student.id);
    try {
      // Get the first enrollment with course details
      const enrollment = student.enrollments[0];
      if (!enrollment) {
        toast.error('Student has no course enrollments');
        return;
      }

      // Generate a temporary password hint (they should reset their password)
      const response = await supabase.functions.invoke('send-enrollment-email', {
        body: {
          studentEmail: student.email,
          studentName: student.full_name,
          courseTitle: enrollment.courses?.title || 'Course',
          courseSchedule: 'Monday to Friday, 8:00 AM - 5:00 PM EAT',
          enrollmentDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          credentials: {
            email: student.email,
            password: '(Use password reset if forgotten)',
          },
        },
      });

      if (response.error) throw response.error;
      toast.success(`Enrollment email sent to ${student.email}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email: ' + error.message);
    } finally {
      setSendingEmail(null);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Master Students Table
            </h1>
            <p className="text-muted-foreground">Comprehensive view of all students in the system</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={enrollDialogOpen} onOpenChange={(open) => {
              setEnrollDialogOpen(open);
              if (!open) setCreatedCredentials(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enroll Student</DialogTitle>
                </DialogHeader>
                
                {createdCredentials ? (
                  <div className="space-y-4 py-4">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Account Created Successfully!</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Share these login credentials with the student:
                      </p>
                      <div className="bg-background rounded-md p-3 font-mono text-sm space-y-1">
                        <p><strong>Email:</strong> {createdCredentials.email}</p>
                        <p><strong>Password:</strong> {createdCredentials.password}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={copyCredentials} variant="outline" className="flex-1">
                        {copiedCredentials ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Credentials
                          </>
                        )}
                      </Button>
                      <Button onClick={() => {
                        setCreatedCredentials(null);
                        setEnrollDialogOpen(false);
                      }} className="flex-1">
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Tabs defaultValue="new" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="new">New Student</TabsTrigger>
                      <TabsTrigger value="existing">Existing Student</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="new" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={newStudent.full_name}
                          onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          value={newStudent.email}
                          onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                          placeholder="student@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password (leave empty to auto-generate)</Label>
                        <Input
                          type="text"
                          value={newStudent.password}
                          onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                          placeholder="Auto-generated if empty"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fee Structure / Program *</Label>
                        <Select
                          value={newStudent.fee_structure_id}
                          onValueChange={(value) => setNewStudent({ ...newStudent, fee_structure_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a fee structure" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {feeStructures.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No fee structures available
                              </div>
                            ) : (
                              feeStructures.map((fee) => (
                                <SelectItem key={fee.id} value={fee.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{fee.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {fee.currency} {fee.amount.toLocaleString()}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={createStudentAndEnroll} disabled={creating} className="w-full">
                        {creating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create & Enroll Student
                          </>
                        )}
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="existing" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Select Student</Label>
                        <Select
                          value={existingEnrollment.student_id}
                          onValueChange={(value) => setExistingEnrollment({ ...existingEnrollment, student_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                          <SelectContent>
                            {existingProfiles.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name || student.email || student.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fee Structure / Program</Label>
                        <Select
                          value={existingEnrollment.fee_structure_id}
                          onValueChange={(value) => setExistingEnrollment({ ...existingEnrollment, fee_structure_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a fee structure" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeStructures.map((fee) => (
                              <SelectItem key={fee.id} value={fee.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{fee.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {fee.currency} {fee.amount.toLocaleString()}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={enrollExistingStudent} disabled={enrolling} className="w-full">
                        {enrolling ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Enroll Student
                          </>
                        )}
                      </Button>
                    </TabsContent>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
                      <TableHead>Adm. No.</TableHead>
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
                            <span className="font-mono text-xs font-medium text-primary">
                              {student.admission_number || '—'}
                            </span>
                          </TableCell>
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
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStudent(student)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStudentToEdit(student)}
                                title="Edit Student"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendEnrollmentEmail(student)}
                                disabled={sendingEmail === student.id || student.enrollments.length === 0}
                                title="Resend Enrollment Email"
                              >
                                {sendingEmail === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStudentToDelete(student)}
                                className="text-destructive hover:text-destructive"
                                title="Delete Student"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{studentToDelete?.full_name || studentToDelete?.email}</strong>? 
                This will permanently remove all their data including:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Profile and account</li>
                  <li>Course enrollments</li>
                  <li>Fees and payment history</li>
                  <li>Assignment submissions</li>
                  <li>Certificates</li>
                  <li>Forum posts and messages</li>
                </ul>
                <p className="mt-2 font-semibold text-destructive">This action cannot be undone.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Student'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Student Dialog */}
        <EditStudentDialog
          student={studentToEdit}
          open={!!studentToEdit}
          onOpenChange={(open) => !open && setStudentToEdit(null)}
          courses={courses}
          feeStructures={feeStructures}
          onStudentUpdated={() => {
            fetchStudents();
            fetchExistingProfiles();
          }}
        />
      </div>
    </LMSLayout>
  );
};

export default MasterStudents;
