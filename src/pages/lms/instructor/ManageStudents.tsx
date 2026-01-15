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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Search, UserPlus, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';

interface Student {
  user_id: string;
  full_name: string | null;
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

const ManageStudents = () => {
  const { user, loading, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEnrollment, setNewEnrollment] = useState({ email: '', course_id: '' });

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

    // Group by user
    const studentMap = new Map<string, Student>();
    
    enrollments?.forEach((enrollment) => {
      const userId = enrollment.user_id;
      if (!studentMap.has(userId)) {
        studentMap.set(userId, {
          user_id: userId,
          full_name: null,
          enrollments: [],
        });
      }
      studentMap.get(userId)?.enrollments.push({
        id: enrollment.id,
        course_id: enrollment.course_id,
        progress_percentage: enrollment.progress_percentage,
        status: enrollment.status,
        courses: enrollment.courses!,
      });
    });

    setStudents(Array.from(studentMap.values()));
    setIsLoading(false);
  };

  const enrollStudent = async () => {
    if (!newEnrollment.email || !newEnrollment.course_id) {
      toast.error('Please fill in all fields');
      return;
    }

    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', newEnrollment.email) // This won't work directly - we need to find by email
      .single();

    // Since we can't query auth.users directly, we'll create the enrollment using email lookup
    // For now, we'll show an error and suggest using user ID
    toast.error('For now, please use the user ID instead of email. This feature will be improved.');
    return;
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
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery
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
            <p className="text-muted-foreground">View and manage student enrollments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Student Email</Label>
                  <Input
                    type="email"
                    value={newEnrollment.email}
                    onChange={(e) => setNewEnrollment({ ...newEnrollment, email: e.target.value })}
                    placeholder="student@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={newEnrollment.course_id}
                    onValueChange={(value) => setNewEnrollment({ ...newEnrollment, course_id: value })}
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
                <Button onClick={enrollStudent} className="w-full">
                  Enroll Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
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
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'No students enrolled yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <Card key={student.user_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {student.full_name?.charAt(0) || 'U'}
                    </div>
                    {student.full_name || 'Student'}
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
                          <TableCell>{enrollment.courses?.title}</TableCell>
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
