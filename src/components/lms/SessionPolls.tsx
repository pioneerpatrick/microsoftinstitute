import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BarChart3,
  Plus,
  X,
  Check,
  Send,
  Vote,
  HelpCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Poll {
  id: string;
  session_id: string;
  question: string;
  poll_type: 'poll' | 'quiz';
  options: string[];
  correct_answer: number | null;
  is_active: boolean;
  created_at: string;
}

interface PollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  answer: number;
  is_correct: boolean | null;
}

interface SessionPollsProps {
  sessionId: string;
  userId: string;
  isInstructor: boolean;
}

const SessionPolls = ({ sessionId, userId, isInstructor }: SessionPollsProps) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [responses, setResponses] = useState<Record<string, PollResponse[]>>({});
  const [userResponses, setUserResponses] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    type: 'poll' as 'poll' | 'quiz',
    options: ['', ''],
    correctAnswer: 0,
  });
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchPolls();

    const pollChannel = supabase
      .channel(`session-polls-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_polls',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchPolls())
      .subscribe();

    const responseChannel = supabase
      .channel(`poll-responses-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_poll_responses',
      }, (payload: any) => {
        setResponses(prev => ({
          ...prev,
          [payload.new.poll_id]: [...(prev[payload.new.poll_id] || []), payload.new],
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pollChannel);
      supabase.removeChannel(responseChannel);
    };
  }, [sessionId]);

  const fetchPolls = async () => {
    const { data } = await supabase
      .from('session_polls')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (data) {
      const parsedPolls = data.map(p => ({
        ...p,
        options: Array.isArray(p.options) ? p.options : JSON.parse(p.options as string),
      })) as Poll[];
      setPolls(parsedPolls);

      // Fetch responses for all polls
      const pollIds = parsedPolls.map(p => p.id);
      if (pollIds.length > 0) {
        const { data: respData } = await supabase
          .from('session_poll_responses')
          .select('*')
          .in('poll_id', pollIds);

        if (respData) {
          const grouped = respData.reduce((acc, r) => {
            if (!acc[r.poll_id]) acc[r.poll_id] = [];
            acc[r.poll_id].push(r);
            return acc;
          }, {} as Record<string, PollResponse[]>);
          setResponses(grouped);

          // Track user's own responses
          const userResps = respData
            .filter(r => r.user_id === userId)
            .reduce((acc, r) => ({ ...acc, [r.poll_id]: r.answer }), {});
          setUserResponses(userResps);
        }
      }
    }
  };

  const createPoll = async () => {
    if (!newPoll.question.trim() || newPoll.options.some(o => !o.trim())) {
      toast.error('Please fill in question and all options');
      return;
    }

    const { error } = await supabase.from('session_polls').insert({
      session_id: sessionId,
      question: newPoll.question,
      poll_type: newPoll.type,
      options: newPoll.options,
      correct_answer: newPoll.type === 'quiz' ? newPoll.correctAnswer : null,
      created_by: userId,
    });

    if (error) {
      toast.error('Failed to create poll');
    } else {
      toast.success(`${newPoll.type === 'quiz' ? 'Quiz' : 'Poll'} launched!`);
      setNewPoll({ question: '', type: 'poll', options: ['', ''], correctAnswer: 0 });
      setIsCreating(false);
    }
  };

  const submitResponse = async (pollId: string, answer: number) => {
    if (userResponses[pollId] !== undefined) return;
    setSubmitting(pollId);

    const poll = polls.find(p => p.id === pollId);
    const isCorrect = poll?.poll_type === 'quiz' ? answer === poll.correct_answer : null;

    const { error } = await supabase.from('session_poll_responses').insert({
      poll_id: pollId,
      user_id: userId,
      answer,
      is_correct: isCorrect,
    });

    if (error) {
      toast.error('Failed to submit response');
    } else {
      setUserResponses(prev => ({ ...prev, [pollId]: answer }));
      if (poll?.poll_type === 'quiz') {
        toast(isCorrect ? '✅ Correct!' : '❌ Incorrect', {
          description: isCorrect ? 'Great job!' : `The correct answer was: ${poll.options[poll.correct_answer!]}`,
        });
      }
    }
    setSubmitting(null);
  };

  const closePoll = async (pollId: string) => {
    await supabase.from('session_polls').update({ is_active: false }).eq('id', pollId);
    toast.success('Poll closed');
  };

  const getResults = (pollId: string) => {
    const poll = polls.find(p => p.id === pollId);
    const pollResponses = responses[pollId] || [];
    const total = pollResponses.length;

    return (poll?.options || []).map((opt, idx) => {
      const count = pollResponses.filter(r => r.answer === idx).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return { option: opt, count, percent, isCorrect: poll?.correct_answer === idx };
    });
  };

  const activePoll = polls.find(p => p.is_active);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Polls & Quizzes
        </h3>
        {isInstructor && (
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Launch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Poll / Quiz</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={newPoll.type === 'poll' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPoll(p => ({ ...p, type: 'poll' }))}
                    className="flex-1"
                  >
                    <Vote className="h-4 w-4 mr-1" />
                    Poll
                  </Button>
                  <Button
                    variant={newPoll.type === 'quiz' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPoll(p => ({ ...p, type: 'quiz' }))}
                    className="flex-1"
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Quiz
                  </Button>
                </div>

                <Input
                  placeholder="Enter your question..."
                  value={newPoll.question}
                  onChange={e => setNewPoll(p => ({ ...p, question: e.target.value }))}
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Options</Label>
                  {newPoll.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {newPoll.type === 'quiz' && (
                        <Button
                          type="button"
                          variant={newPoll.correctAnswer === idx ? 'default' : 'ghost'}
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setNewPoll(p => ({ ...p, correctAnswer: idx }))}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Input
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const newOpts = [...newPoll.options];
                          newOpts[idx] = e.target.value;
                          setNewPoll(p => ({ ...p, options: newOpts }));
                        }}
                      />
                      {newPoll.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const newOpts = newPoll.options.filter((_, i) => i !== idx);
                            setNewPoll(p => ({
                              ...p,
                              options: newOpts,
                              correctAnswer: p.correctAnswer >= newOpts.length ? 0 : p.correctAnswer,
                            }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {newPoll.options.length < 6 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>

                {newPoll.type === 'quiz' && (
                  <p className="text-xs text-muted-foreground">
                    Click ✓ to mark the correct answer
                  </p>
                )}

                <Button onClick={createPoll} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Launch {newPoll.type === 'quiz' ? 'Quiz' : 'Poll'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {polls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No polls yet
              {isInstructor && <p className="mt-1">Click "Launch" to start</p>}
            </div>
          ) : (
            polls.map(poll => {
              const hasResponded = userResponses[poll.id] !== undefined;
              const results = getResults(poll.id);
              const totalResponses = (responses[poll.id] || []).length;
              const showResults = isInstructor || hasResponded || !poll.is_active;

              return (
                <Card key={poll.id} className={`${poll.is_active ? 'border-primary' : 'opacity-75'}`}>
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={poll.poll_type === 'quiz' ? 'default' : 'secondary'} className="text-[10px]">
                          {poll.poll_type === 'quiz' ? 'Quiz' : 'Poll'}
                        </Badge>
                        {poll.is_active && (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-600">
                            Live
                          </Badge>
                        )}
                      </div>
                      {isInstructor && poll.is_active && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => closePoll(poll.id)}>
                          Close
                        </Button>
                      )}
                    </div>
                    <CardTitle className="text-sm font-medium mt-1">{poll.question}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">{totalResponses} response{totalResponses !== 1 && 's'}</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {showResults ? (
                      <div className="space-y-2">
                        {results.map((r, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                {poll.poll_type === 'quiz' && r.isCorrect && (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                )}
                                {poll.poll_type === 'quiz' && !r.isCorrect && hasResponded && userResponses[poll.id] === idx && (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                {r.option}
                              </span>
                              <span className="text-muted-foreground">{r.percent}% ({r.count})</span>
                            </div>
                            <Progress
                              value={r.percent}
                              className={`h-2 ${poll.poll_type === 'quiz' && r.isCorrect ? '[&>div]:bg-green-500' : ''}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RadioGroup
                        onValueChange={(v) => submitResponse(poll.id, parseInt(v))}
                        disabled={submitting === poll.id}
                      >
                        {poll.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center space-x-2 py-1">
                            <RadioGroupItem value={idx.toString()} id={`${poll.id}-${idx}`} />
                            <Label htmlFor={`${poll.id}-${idx}`} className="text-sm cursor-pointer">{opt}</Label>
                          </div>
                        ))}
                        {submitting === poll.id && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Submitting...
                          </div>
                        )}
                      </RadioGroup>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SessionPolls;
