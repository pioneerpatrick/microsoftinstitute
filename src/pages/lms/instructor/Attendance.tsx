import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Calendar as CalendarIcon, 
  Users, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Clock,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface Course {
  id: string;
  title: string;
}

interface EnrolledStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: string;
  session_time: string | null;
  created_at: string;
  courses: { title: string } | null;
  attendance_records: {
    student_id: string;
    status: string;
  }[];
}

const Attendance = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // New session dialog
  const [newSessionDialog, setNewSessionDialog] = useState(false);
  const [newSessionCourse, setNewSessionCourse] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

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

  useEffect(() => {
    if (newSessionCourse) {
      fetchEnrolledStudents(newSessionCourse);
    }
  }, [newSessionCourse]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    
    setCourses(coursesData || []);

    // Fetch attendance sessions
    const { data: sessionsData } = await supabase
      .from('class_attendance')
      .select(`
        id,
        course_id,
        session_date,
        session_time,
        created_at,
        courses (title),
        attendance_records (student_id, status)
      `)
      .order('session_date', { ascending: false })
      .limit(50);

    setSessions((sessionsData as unknown as AttendanceSession[]) || []);
    setIsLoading(false);
  };

  const fetchEnrolledStudents = async (courseId: string) => {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (!enrollments?.length) {
      setEnrolledStudents([]);
      return;
    }

    const userIds = enrollments.map(e => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const students = profiles?.map(p => ({
      user_id: p.id,
      full_name: p.full_name,
      email: p.email,
    })) || [];

    setEnrolledStudents(students);
    
    // Initialize attendance marks
    const marks: Record<string, string> = {};
    students.forEach(s => {
      marks[s.user_id] = 'present';
    });
    setAttendanceMarks(marks);
  };

  const createAttendanceSession = async () => {
    if (!newSessionCourse || enrolledStudents.length === 0) {
      toast.error('Please select a course with enrolled students');
      return;
    }

    setIsCreating(true);

    try {
      // Create attendance session
      const { data: session, error: sessionError } = await supabase
        .from('class_attendance')
        .insert({
          course_id: newSessionCourse,
          session_date: format(new Date(), 'yyyy-MM-dd'),
          session_time: format(new Date(), 'HH:mm:ss'),
          instructor_id: user?.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create attendance records
      const records = Object.entries(attendanceMarks).map(([studentId, status]) => ({
        attendance_id: session.id,
        student_id: studentId,
        status,
        marked_by: user?.id,
      }));

      const { error: recordsError } = await supabase
        .from('attendance_records')
        .insert(records);

      if (recordsError) throw recordsError;

      toast.success('Attendance recorded successfully!');
      setNewSessionDialog(false);
      setNewSessionCourse('');
      setEnrolledStudents([]);
      setAttendanceMarks({});
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record attendance');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendanceMarks(prev => {
      const current = prev[studentId];
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const filteredSessions = selectedCourse
    ? sessions.filter(s => s.course_id === selectedCourse)
    : sessions;

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
            <h1 className="text-2xl font-bold">Student Attendance</h1>
            <p className="text-muted-foreground">Mark and track student attendance</p>
          </div>
          <Button onClick={() => setNewSessionDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Take Attendance
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-4">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No attendance records yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => {
                      const present = session.attendance_records?.filter(r => r.status === 'present').length || 0;
                      const absent = session.attendance_records?.filter(r => r.status === 'absent').length || 0;
                      const late = session.attendance_records?.filter(r => r.status === 'late').length || 0;

                      return (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(session.session_date), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.session_time ? format(new Date(`2000-01-01T${session.session_time}`), 'h:mm a') : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {session.courses?.title}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {present}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800 gap-1">
                              <XCircle className="h-3 w-3" />
                              {absent}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                              <Clock className="h-3 w-3" />
                              {late}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Take Attendance Dialog */}
        <Dialog open={newSessionDialog} onOpenChange={setNewSessionDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Take Attendance</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Course</Label>
                <Select value={newSessionCourse} onValueChange={setNewSessionCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {enrolledStudents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mark Attendance</Label>
                    <div className="flex gap-2 text-xs">
                      <Badge className="bg-green-100 text-green-800">Present</Badge>
                      <Badge className="bg-red-100 text-red-800">Absent</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Click on a student to cycle through statuses</p>
                  
                  <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                    {enrolledStudents.map((student) => {
                      const status = attendanceMarks[student.user_id] || 'present';
                      return (
                        <div
                          key={student.user_id}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleAttendance(student.user_id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {student.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-medium">{student.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                          <Badge 
                            className={
                              status === 'present' ? 'bg-green-100 text-green-800' :
                              status === 'absent' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {status === 'present' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {status === 'absent' && <XCircle className="h-3 w-3 mr-1" />}
                            {status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {newSessionCourse && enrolledStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active students enrolled in this course</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewSessionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={createAttendanceSession}
                disabled={!newSessionCourse || enrolledStudents.length === 0 || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Attendance'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default Attendance;
