import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Download, Users, CheckCircle2, XCircle, Clock, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface AttendanceRecord {
  id: string;
  session_date: string;
  course_id: string;
  courses: { title: string } | null;
  attendance_records: {
    student_id: string;
    status: string;
  }[];
}

interface InstructorAttendance {
  id: string;
  instructor_id: string;
  date: string;
  status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
}

const AttendanceReports = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [instructorAttendance, setInstructorAttendance] = useState<InstructorAttendance[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Map<string, string>>(new Map());

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
  }, [user, isStaff, dateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');

    const [coursesRes, attendanceRes, instructorRes, profilesRes] = await Promise.all([
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('class_attendance')
        .select(`
          id, session_date, course_id,
          courses (title),
          attendance_records (student_id, status)
        `)
        .gte('session_date', startDate)
        .order('session_date', { ascending: false }),
      supabase.from('instructor_attendance')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);

    setCourses(coursesRes.data || []);
    setStudentAttendance((attendanceRes.data as unknown as AttendanceRecord[]) || []);
    setInstructorAttendance(instructorRes.data || []);
    
    const profileMap = new Map<string, string>();
    profilesRes.data?.forEach(p => profileMap.set(p.id, p.full_name || 'Unknown'));
    setStudentProfiles(profileMap);
    
    setIsLoading(false);
  };

  // Calculate student attendance stats
  const filteredStudentAttendance = courseFilter === 'all' 
    ? studentAttendance 
    : studentAttendance.filter(a => a.course_id === courseFilter);

  const totalStudentRecords = filteredStudentAttendance.reduce((sum, a) => sum + (a.attendance_records?.length || 0), 0);
  const presentCount = filteredStudentAttendance.reduce((sum, a) => 
    sum + (a.attendance_records?.filter(r => r.status === 'present').length || 0), 0);
  const absentCount = filteredStudentAttendance.reduce((sum, a) => 
    sum + (a.attendance_records?.filter(r => r.status === 'absent').length || 0), 0);
  const lateCount = filteredStudentAttendance.reduce((sum, a) => 
    sum + (a.attendance_records?.filter(r => r.status === 'late').length || 0), 0);

  const studentPieData = [
    { name: 'Present', value: presentCount, color: '#22c55e' },
    { name: 'Absent', value: absentCount, color: '#ef4444' },
    { name: 'Late', value: lateCount, color: '#eab308' },
  ].filter(d => d.value > 0);

  // Instructor attendance stats
  const instructorPresent = instructorAttendance.filter(a => a.status === 'present').length;
  const instructorAbsent = instructorAttendance.filter(a => a.status === 'absent').length;
  const instructorLate = instructorAttendance.filter(a => a.status === 'late').length;

  const instructorPieData = [
    { name: 'Present', value: instructorPresent, color: '#22c55e' },
    { name: 'Absent', value: instructorAbsent, color: '#ef4444' },
    { name: 'Late', value: instructorLate, color: '#eab308' },
  ].filter(d => d.value > 0);

  // Trend data - last 7 days
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const trendData = last7Days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayRecords = filteredStudentAttendance.filter(a => a.session_date === dateStr);
    
    return {
      date: format(day, 'EEE'),
      present: dayRecords.reduce((sum, a) => 
        sum + (a.attendance_records?.filter(r => r.status === 'present').length || 0), 0),
      absent: dayRecords.reduce((sum, a) => 
        sum + (a.attendance_records?.filter(r => r.status === 'absent').length || 0), 0),
      late: dayRecords.reduce((sum, a) => 
        sum + (a.attendance_records?.filter(r => r.status === 'late').length || 0), 0),
    };
  });

  // Course breakdown
  const courseBreakdown = courses.map(course => {
    const courseRecords = studentAttendance.filter(a => a.course_id === course.id);
    const total = courseRecords.reduce((sum, a) => sum + (a.attendance_records?.length || 0), 0);
    const present = courseRecords.reduce((sum, a) => 
      sum + (a.attendance_records?.filter(r => r.status === 'present').length || 0), 0);
    
    return {
      name: course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title,
      fullName: course.title,
      total,
      present,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }).filter(c => c.total > 0).sort((a, b) => b.rate - a.rate);

  const exportToCSV = () => {
    const rows = [
      'Date,Course,Student,Status',
      ...filteredStudentAttendance.flatMap(session =>
        session.attendance_records?.map(record => 
          `"${session.session_date}","${session.courses?.title}","${studentProfiles.get(record.student_id) || 'Unknown'}","${record.status}"`
        ) || []
      )
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

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
      <div className="space-y-6 w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Attendance Reports</h1>
            <p className="text-sm text-muted-foreground">Comprehensive attendance analytics for students and staff</p>
          </div>
          <Button onClick={exportToCSV} size="sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span> CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="students" className="flex-1 sm:flex-none">Students</TabsTrigger>
            <TabsTrigger value="instructors" className="flex-1 sm:flex-none">Instructors</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold truncate">{totalStudentRecords}</p>
                      <p className="text-xs text-muted-foreground truncate">Total Records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-950 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">{presentCount}</p>
                      <p className="text-xs text-muted-foreground truncate">Present</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-950 rounded-lg flex-shrink-0">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">{absentCount}</p>
                      <p className="text-xs text-muted-foreground truncate">Absent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-yellow-100 dark:bg-yellow-950 rounded-lg flex-shrink-0">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-yellow-600 truncate">{lateCount}</p>
                      <p className="text-xs text-muted-foreground truncate">Late</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Attendance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={studentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {studentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                      No attendance data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trend Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">7-Day Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="present" stroke="#22c55e" name="Present" strokeWidth={2} />
                      <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" strokeWidth={2} />
                      <Line type="monotone" dataKey="late" stroke="#eab308" name="Late" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Course Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Attendance by Course</CardTitle>
              </CardHeader>
              <CardContent>
                {courseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(200, courseBreakdown.length * 40)}>
                    <BarChart data={courseBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Rate']}
                        labelFormatter={(label) => courseBreakdown.find(c => c.name === label)?.fullName || label}
                      />
                      <Bar dataKey="rate" fill="hsl(var(--primary))" name="Attendance %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    No course data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <div className="min-w-[500px] px-3 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Absent</TableHead>
                          <TableHead className="text-center">Late</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudentAttendance.slice(0, 20).map((session) => {
                          const present = session.attendance_records?.filter(r => r.status === 'present').length || 0;
                          const absent = session.attendance_records?.filter(r => r.status === 'absent').length || 0;
                          const late = session.attendance_records?.filter(r => r.status === 'late').length || 0;
                          const total = session.attendance_records?.length || 0;
                          const rate = total > 0 ? Math.round((present / total) * 100) : 0;

                          return (
                            <TableRow key={session.id}>
                              <TableCell className="text-sm whitespace-nowrap">
                                {format(new Date(session.session_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="font-medium text-sm max-w-[150px] truncate">
                                {session.courses?.title}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">{present}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400">{absent}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">{late}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={rate >= 80 ? 'default' : rate >= 50 ? 'secondary' : 'destructive'}>
                                  {rate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructors" className="space-y-6">
            {/* Instructor Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold truncate">{instructorAttendance.length}</p>
                      <p className="text-xs text-muted-foreground truncate">Total Records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-950 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">{instructorPresent}</p>
                      <p className="text-xs text-muted-foreground truncate">Present</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-950 rounded-lg flex-shrink-0">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">{instructorAbsent}</p>
                      <p className="text-xs text-muted-foreground truncate">Absent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-yellow-100 dark:bg-yellow-950 rounded-lg flex-shrink-0">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-yellow-600 truncate">{instructorLate}</p>
                      <p className="text-xs text-muted-foreground truncate">Late</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Instructor Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {instructorPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={instructorPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {instructorPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                      No instructor attendance data
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Recent Records</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <div className="min-w-[400px] px-3 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>In</TableHead>
                            <TableHead>Out</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {instructorAttendance.slice(0, 10).map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-sm whitespace-nowrap">
                                {format(new Date(record.date), 'MMM d')}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    record.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' :
                                    record.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400'
                                  }
                                >
                                  {record.status || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{record.check_in_time?.slice(0, 5) || '-'}</TableCell>
                              <TableCell className="text-sm">{record.check_out_time?.slice(0, 5) || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default AttendanceReports;
