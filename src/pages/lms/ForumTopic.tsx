import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Pin, Lock, Clock, User, MessageSquare, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';

interface Topic {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  user_id: string;
  courses: {
    title: string;
  };
}

interface Reply {
  id: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  user_id: string;
}

const ForumTopic = () => {
  const { topicId } = useParams();
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && topicId) {
      fetchTopic();
      fetchReplies();
    }
  }, [user, topicId]);

  const fetchTopic = async () => {
    const { data, error } = await supabase
      .from('forum_topics')
      .select(`
        id,
        title,
        content,
        is_pinned,
        is_locked,
        created_at,
        user_id,
        courses (
          title
        )
      `)
      .eq('id', topicId)
      .single();

    if (!error && data) {
      setTopic(data as Topic);
    }
    setIsLoading(false);
  };

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('forum_replies')
      .select(`
        id,
        content,
        is_solution,
        created_at,
        user_id
      `)
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setReplies(data as Reply[]);
    }
  };

  const handleSubmitReply = async () => {
    if (!user || !newReply.trim() || !topicId) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('forum_replies')
      .insert({
        topic_id: topicId,
        user_id: user.id,
        content: newReply.trim(),
      });

    if (error) {
      toast.error('Failed to post reply');
    } else {
      toast.success('Reply posted');
      setNewReply('');
      fetchReplies();
    }

    setIsSubmitting(false);
  };

  const markAsSolution = async (replyId: string) => {
    const { error } = await supabase
      .from('forum_replies')
      .update({ is_solution: true })
      .eq('id', replyId);

    if (!error) {
      toast.success('Marked as solution');
      fetchReplies();
    }
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

  if (!topic) {
    return (
      <LMSLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Topic not found</h2>
          <Button onClick={() => navigate('/lms/forums')} className="mt-4">
            Back to Forums
          </Button>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/lms/forums')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <Badge variant="secondary">{topic.courses?.title}</Badge>
          </div>
        </div>

        {/* Topic */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={topic.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {topic.profiles?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {topic.is_pinned && (
                    <Pin className="h-4 w-4 text-primary" />
                  )}
                  {topic.is_locked && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h1 className="text-xl font-bold">{topic.title}</h1>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{topic.profiles?.full_name || 'Anonymous'}</span>
                  <span>•</span>
                  <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{topic.content}</p>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h2>

          {replies.map((reply) => (
            <Card key={reply.id} className={reply.is_solution ? 'border-green-300 bg-green-50/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={reply.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {reply.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {reply.profiles?.full_name || 'Anonymous'}
                        </span>
                        {reply.is_solution && (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Solution
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                      {(isStaff || topic.user_id === user?.id) && !reply.is_solution && !topic.is_locked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsSolution(reply.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark as Solution
                        </Button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply Form */}
        {!topic.is_locked && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Write your reply..."
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitReply} 
                    disabled={isSubmitting || !newReply.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {topic.is_locked && (
          <Card className="bg-muted">
            <CardContent className="p-4 text-center">
              <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">This topic is locked. No new replies can be added.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </LMSLayout>
  );
};

export default ForumTopic;
