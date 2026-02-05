import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Users, Info } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const ManageStudents = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    }
  }, [user, isStaff]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Students</h1>
            <p className="text-muted-foreground">View and manage students in your courses</p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            To enroll new students, please contact an administrator or use the Admin → Master Students page.
          </AlertDescription>
        </Alert>

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
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'No students enrolled in your courses yet'}
              </p>
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
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{student.full_name || 'Student'}</div>
                      {student.email && (
                        <div className="text-sm font-normal text-muted-foreground truncate">
                          {student.email}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
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
                  </div>
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
