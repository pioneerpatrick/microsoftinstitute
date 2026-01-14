import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Video, Play, ExternalLink } from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  status: string;
  courses: {
    title: string;
  };
}

const LiveSessions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('live_sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        meeting_url,
        recording_url,
        status,
        courses (
          title
        )
      `)
      .order('scheduled_at', { ascending: true });

    if (!error && data) {
      setSessions(data as LiveSession[]);
    }
    setIsLoading(false);
  };

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const liveSessions = sessions.filter(s => s.status === 'live');
  const pastSessions = sessions.filter(s => s.status === 'completed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500 animate-pulse">Live Now</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const SessionCard = ({ session }: { session: LiveSession }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(session.status)}
              <span className="text-sm text-muted-foreground">
                {session.courses?.title}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{session.title}</h3>
            {session.description && (
              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                {session.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(session.scheduled_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {new Date(session.scheduled_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                <span>{session.duration_minutes} min</span>
              </div>
            </div>
            {session.profiles?.full_name && (
              <p className="text-sm text-muted-foreground mt-2">
                Instructor: {session.profiles.full_name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {session.status === 'live' && session.meeting_url && (
              <Button asChild>
                <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2" />
                  Join Now
                </a>
              </Button>
            )}
            {session.status === 'scheduled' && session.meeting_url && (
              <Button variant="outline" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Waiting
              </Button>
            )}
            {session.status === 'completed' && session.recording_url && (
              <Button variant="outline" asChild>
                <a href={session.recording_url} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Recording
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
        <div>
          <h1 className="text-2xl font-bold">Live Sessions</h1>
          <p className="text-muted-foreground">Join live classes and watch recordings</p>
        </div>

        {/* Live Now Section */}
        {liveSessions.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                Live Now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Sessions ({pastSessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {upcomingSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Upcoming Sessions</h3>
                  <p className="text-muted-foreground">
                    There are no scheduled live sessions at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6 space-y-4">
            {pastSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Past Sessions</h3>
                  <p className="text-muted-foreground">
                    Past session recordings will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pastSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default LiveSessions;
