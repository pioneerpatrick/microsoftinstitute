import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceCardProps {
  userId: string;
}

const AttendanceCard = ({ userId }: AttendanceCardProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    attended: 0,
    percentage: 0,
    trend: 'stable' as 'up' | 'down' | 'stable',
  });

  useEffect(() => {
    fetchAttendance();
  }, [userId]);

  const fetchAttendance = async () => {
    try {
      // Fetch attendance records for this student
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
          status,
          attendance_id,
          class_attendance (
            session_date
          )
        `)
        .eq('student_id', userId);

      if (error) throw error;

      const totalSessions = records?.length || 0;
      const attended = records?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
      const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

      // Calculate trend based on last 5 vs previous 5 sessions
      const sortedRecords = records?.sort((a, b) => 
        new Date(b.class_attendance?.session_date || 0).getTime() - 
        new Date(a.class_attendance?.session_date || 0).getTime()
      ) || [];

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (sortedRecords.length >= 10) {
        const recentAttendance = sortedRecords.slice(0, 5).filter(r => r.status === 'present' || r.status === 'late').length;
        const previousAttendance = sortedRecords.slice(5, 10).filter(r => r.status === 'present' || r.status === 'late').length;
        if (recentAttendance > previousAttendance) trend = 'up';
        else if (recentAttendance < previousAttendance) trend = 'down';
      }

      setStats({ totalSessions, attended, percentage, trend });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPercentageColor = () => {
    if (stats.percentage >= 80) return 'text-green-600';
    if (stats.percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-20 mb-2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Attendance Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-3xl font-bold ${getPercentageColor()}`}>
            {stats.percentage}%
          </span>
          {getTrendIcon()}
        </div>
        <Progress value={stats.percentage} className="h-2 mb-2" />
        <p className="text-xs text-muted-foreground">
          {stats.attended} of {stats.totalSessions} sessions attended
        </p>
      </CardContent>
    </Card>
  );
};

export default AttendanceCard;
