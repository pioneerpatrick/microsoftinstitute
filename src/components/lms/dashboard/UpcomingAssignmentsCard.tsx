import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, isPast, isToday } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  due_date: string | null;
  course_title: string;
  submitted: boolean;
}

interface UpcomingAssignmentsCardProps {
  userId: string;
}

const UpcomingAssignmentsCard = ({ userId }: UpcomingAssignmentsCardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    fetchAssignments();
  }, [userId]);

  const fetchAssignments = async () => {
    try {
      // Get user's enrolled courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!enrollments?.length) {
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map(e => e.course_id);

      // Get assignments for enrolled courses
      const { data: assignmentData, error } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          due_date,
          courses (
            title
          )
        `)
        .in('course_id', courseIds)
        .eq('is_published', true)
        .gte('due_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Include last 7 days
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      // Check which assignments have been submitted
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id')
        .eq('user_id', userId);

      const submittedIds = new Set(submissions?.map(s => s.assignment_id) || []);

      const formattedAssignments: Assignment[] = (assignmentData || []).map(a => ({
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        course_title: a.courses?.title || 'Unknown Course',
        submitted: submittedIds.has(a.id),
      }));

      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDueBadge = (dueDate: string | null, submitted: boolean) => {
    if (submitted) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Submitted
        </Badge>
      );
    }

    if (!dueDate) return null;

    const date = new Date(dueDate);
    if (isPast(date)) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    if (isToday(date)) {
      return (
        <Badge variant="default" className="bg-yellow-500 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Due Today
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        {formatDistanceToNow(date, { addSuffix: true })}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const pendingCount = assignments.filter(a => !a.submitted && a.due_date && !isPast(new Date(a.due_date))).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Upcoming Assignments
          </span>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No upcoming assignments
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map(assignment => (
              <div 
                key={assignment.id} 
                className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{assignment.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {assignment.course_title}
                  </p>
                </div>
                {getDueBadge(assignment.due_date, assignment.submitted)}
              </div>
            ))}
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-3"
          onClick={() => navigate('/lms/assignments')}
        >
          View All Assignments
        </Button>
      </CardContent>
    </Card>
  );
};

export default UpcomingAssignmentsCard;
