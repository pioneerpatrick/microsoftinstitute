import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Search, UserPlus, Users, Loader2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';

interface Student {
  user_id: string;
  full_name: string | null;
  email: string | null;
  enrollments: {
    id: string;
    course_id: string;
    progress_percentage: number;
    status: string;
    courses: {
      title: string;
    };
  }[];
}

interface Course {
  id: string;
  title: string;
}

interface ExistingStudent {
  id: string;
  full_name: string | null;
  email: string | null;
}

const ManageStudents = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  
  // New student form
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    email: '',
    password: '',
    course_id: '',
  });

  // Existing student enrollment
  const [existingEnrollment, setExistingEnrollment] = useState({
    student_id: '',
    course_id: '',
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
      fetchStudents();
      fetchCourses();
      fetchExistingStudents();
    }
  }, [user, isStaff]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    
    if (data) {
      setCourses(data);
    }
  };

  const fetchExistingStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    if (data) {
      setExistingStudents(data);
    }
  };

  const fetchStudents = async () => {
    // Get all enrollments with course info
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        course_id,
        progress_percentage,
        status,
        courses (
          title
        )
      `)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error);
      setIsLoading(false);
      return;
    }

    // Get profiles for names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Group by user
    const studentMap = new Map<string, Student>();
    
    enrollments?.forEach((enrollment) => {
      const userId = enrollment.user_id;
      const profile = profileMap.get(userId);
      
      if (!studentMap.has(userId)) {
        studentMap.set(userId, {
          user_id: userId,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          enrollments: [],
        });
      }
      studentMap.get(userId)?.enrollments.push({
        id: enrollment.id,
        course_id: enrollment.course_id,
        progress_percentage: enrollment.progress_percentage || 0,
        status: enrollment.status || 'active',
        courses: enrollment.courses!,
      });
    });

    setStudents(Array.from(studentMap.values()));
    setIsLoading(false);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const createStudentAndEnroll = async () => {
    if (!newStudent.full_name || !newStudent.email || !newStudent.course_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    
    // Generate password if not provided
    const password = newStudent.password || generatePassword();

    try {
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

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const userId = response.data.user?.id;

      if (userId) {
        // Enroll in course
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            user_id: userId,
            course_id: newStudent.course_id,
            status: 'active',
            progress_percentage: 0,
          });

        if (enrollError) {
          console.error('Enrollment error:', enrollError);
          toast.error('User created but enrollment failed. Please enroll manually.');
        }
      }

      // Show credentials
      setCreatedCredentials({ email: newStudent.email, password });
      
      toast.success('Student account created and enrolled successfully!');
      
      // Reset form
      setNewStudent({ full_name: '', email: '', password: '', course_id: '' });
      fetchStudents();
      fetchExistingStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create student account');
    } finally {
      setCreating(false);
    }
  };

  const enrollExistingStudent = async () => {
    if (!existingEnrollment.student_id || !existingEnrollment.course_id) {
      toast.error('Please select a student and course');
      return;
    }

    setEnrolling(true);

    try {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', existingEnrollment.student_id)
        .eq('course_id', existingEnrollment.course_id)
        .maybeSingle();

      if (existing) {
        toast.error('Student is already enrolled in this course');
        setEnrolling(false);
        return;
      }

      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: existingEnrollment.student_id,
          course_id: existingEnrollment.course_id,
          status: 'active',
          progress_percentage: 0,
        });

      if (error) throw error;

      toast.success('Student enrolled successfully!');
      setExistingEnrollment({ student_id: '', course_id: '' });
      setDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll student');
    } finally {
      setEnrolling(false);
    }
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

  const updateEnrollmentStatus = async (enrollmentId: string, status: string) => {
    const { error } = await supabase
      .from('enrollments')
      .update({ status })
      .eq('id', enrollmentId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      fetchStudents();
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    !searchQuery
  );

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
            <h1 className="text-2xl font-bold">Manage Students</h1>
            <p className="text-muted-foreground">Create student accounts and manage enrollments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setCreatedCredentials(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Student to Course</DialogTitle>
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
                      setDialogOpen(false);
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
                      <Label>Enroll in Course *</Label>
                      <Select
                        value={newStudent.course_id}
                        onValueChange={(value) => setNewStudent({ ...newStudent, course_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course" />
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
                          {existingStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.full_name || student.email || student.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Enroll in Course</Label>
                      <Select
                        value={existingEnrollment.course_id}
                        onValueChange={(value) => setExistingEnrollment({ ...existingEnrollment, course_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course" />
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
                    <Button onClick={enrollExistingStudent} disabled={enrolling} className="w-full">
                      {enrolling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll Student'
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Students Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'No students enrolled yet'}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Student
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <Card key={student.user_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {student.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div>{student.full_name || 'Student'}</div>
                      {student.email && (
                        <div className="text-sm font-normal text-muted-foreground">
                          {student.email}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">{enrollment.courses?.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={enrollment.progress_percentage} className="w-24 h-2" />
                              <span className="text-sm text-muted-foreground">
                                {enrollment.progress_percentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                enrollment.status === 'completed' ? 'default' :
                                enrollment.status === 'active' ? 'secondary' : 'destructive'
                              }
                            >
                              {enrollment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={enrollment.status}
                              onValueChange={(value) => updateEnrollmentStatus(enrollment.id, value)}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LMSLayout>
  );
};

export default ManageStudents;
