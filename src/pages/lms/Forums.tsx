import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Pin, Lock, Clock, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';

interface ForumTopic {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  user_id: string;
  course_id: string;
  courses: {
    title: string;
  };
  reply_count?: number;
}

interface Course {
  id: string;
  title: string;
}

const Forums = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseFilter = searchParams.get('course');
  
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: '',
    content: '',
    course_id: courseFilter || '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTopics();
      fetchCourses();
    }
  }, [user, courseFilter]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true);
    
    if (data) {
      setCourses(data);
    }
  };

  const fetchTopics = async () => {
    let query = supabase
      .from('forum_topics')
      .select(`
        id,
        title,
        content,
        is_pinned,
        is_locked,
        created_at,
        user_id,
        course_id,
        courses (
          title
        )
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (courseFilter) {
      query = query.eq('course_id', courseFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Fetch reply counts
      const topicsWithCounts = await Promise.all(
        data.map(async (topic) => {
          const { count } = await supabase
            .from('forum_replies')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);
          
          return { ...topic, reply_count: count || 0 };
        })
      );
      setTopics(topicsWithCounts as ForumTopic[]);
    }
    setIsLoading(false);
  };

  const handleCreateTopic = async () => {
    if (!user || !newTopic.title || !newTopic.content || !newTopic.course_id) {
      toast.error('Please fill in all fields');
      return;
    }

    const { error } = await supabase
      .from('forum_topics')
      .insert({
        title: newTopic.title,
        content: newTopic.content,
        course_id: newTopic.course_id,
        user_id: user.id,
      });

    if (error) {
      toast.error('Failed to create topic');
      return;
    }

    toast.success('Topic created successfully');
    setDialogOpen(false);
    setNewTopic({ title: '', content: '', course_id: courseFilter || '' });
    fetchTopics();
  };

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
            <h1 className="text-2xl font-bold">Discussion Forums</h1>
            <p className="text-muted-foreground">Connect with fellow students and instructors</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Topic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={newTopic.course_id}
                    onValueChange={(value) => setNewTopic({ ...newTopic, course_id: value })}
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
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newTopic.title}
                    onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                    placeholder="Enter topic title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={newTopic.content}
                    onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                    placeholder="Write your discussion..."
                    rows={5}
                  />
                </div>
                <Button onClick={handleCreateTopic} className="w-full">
                  Create Topic
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Course Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!courseFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigate('/lms/forums')}
          >
            All Courses
          </Button>
          {courses.map((course) => (
            <Button
              key={course.id}
              variant={courseFilter === course.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate(`/lms/forums?course=${course.id}`)}
            >
              {course.title}
            </Button>
          ))}
        </div>

        {/* Topics List */}
        {topics.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Topics Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to start a discussion!
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Topic
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {topics.map((topic) => (
              <Card 
                key={topic.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/lms/forums/${topic.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {topic.is_pinned && (
                          <Pin className="h-4 w-4 text-primary" />
                        )}
                        {topic.is_locked && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <h3 className="font-semibold">{topic.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {topic.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Badge variant="secondary">{topic.courses?.title}</Badge>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{topic.profiles?.full_name || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{topic.reply_count} replies</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

export default Forums;
