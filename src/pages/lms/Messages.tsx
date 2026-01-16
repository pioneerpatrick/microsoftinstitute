import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Send, 
  Plus, 
  Inbox, 
  SendHorizontal,
  Clock,
  Check,
  Reply
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    full_name: string | null;
    email: string | null;
  };
  recipient?: {
    full_name: string | null;
    email: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const Messages = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: ''
  });
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchProfiles();
      subscribeToMessages();
    }
  }, [user]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email');
    
    if (data) {
      setProfiles(data.filter(p => p.id !== user?.id));
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch sender/recipient profiles
      const userIds = [...new Set(data.flatMap(m => [m.sender_id, m.recipient_id]))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const messagesWithProfiles = data.map(message => ({
        ...message,
        sender: profilesMap.get(message.sender_id),
        recipient: profilesMap.get(message.recipient_id)
      }));

      setMessages(messagesWithProfiles);
    }
    setIsLoading(false);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          fetchMessages();
          toast.info('New message received!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!user) return;
    if (!newMessage.recipient_id || !newMessage.content) {
      toast.error('Please select a recipient and write a message');
      return;
    }

    setIsSending(true);

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: newMessage.recipient_id,
        subject: newMessage.subject || null,
        content: newMessage.content
      });

    if (error) {
      toast.error('Failed to send message');
    } else {
      toast.success('Message sent!');
      setComposeOpen(false);
      setNewMessage({ recipient_id: '', subject: '', content: '' });
      fetchMessages();
    }

    setIsSending(false);
  };

  const sendReply = async () => {
    if (!user || !selectedMessage) return;
    if (!replyContent) {
      toast.error('Please write a reply');
      return;
    }

    setIsSending(true);

    const recipientId = selectedMessage.sender_id === user.id 
      ? selectedMessage.recipient_id 
      : selectedMessage.sender_id;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject: `Re: ${selectedMessage.subject || 'No Subject'}`,
        content: replyContent,
        parent_id: selectedMessage.id
      });

    if (error) {
      toast.error('Failed to send reply');
    } else {
      toast.success('Reply sent!');
      setReplyContent('');
      fetchMessages();
    }

    setIsSending(false);
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const inbox = messages.filter(m => m.recipient_id === user?.id);
  const sent = messages.filter(m => m.sender_id === user?.id);
  const unreadCount = inbox.filter(m => !m.is_read).length;

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
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Communicate with instructors and students</p>
          </div>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select
                    value={newMessage.recipient_id}
                    onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Message subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    placeholder="Write your message..."
                    rows={5}
                  />
                </div>
                <Button onClick={sendMessage} className="w-full" disabled={isSending}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <Tabs defaultValue="inbox">
                  <TabsList className="w-full">
                    <TabsTrigger value="inbox" className="flex-1">
                      <Inbox className="h-4 w-4 mr-2" />
                      Inbox {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex-1">
                      <SendHorizontal className="h-4 w-4 mr-2" />
                      Sent
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Tabs defaultValue="inbox">
                    <TabsContent value="inbox" className="m-0">
                      {inbox.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No messages yet
                        </div>
                      ) : (
                        inbox.map((message) => (
                          <button
                            key={message.id}
                            onClick={() => {
                              setSelectedMessage(message);
                              if (!message.is_read) {
                                markAsRead(message.id);
                              }
                            }}
                            className={`w-full text-left p-4 border-b hover:bg-muted transition-colors ${
                              !message.is_read ? 'bg-primary/5' : ''
                            } ${selectedMessage?.id === message.id ? 'bg-muted' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.sender?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium truncate ${!message.is_read ? 'font-semibold' : ''}`}>
                                    {message.sender?.full_name || 'Unknown'}
                                  </p>
                                  {!message.is_read && (
                                    <span className="w-2 h-2 bg-primary rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {message.subject || 'No Subject'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(message.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </TabsContent>
                    <TabsContent value="sent" className="m-0">
                      {sent.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No sent messages
                        </div>
                      ) : (
                        sent.map((message) => (
                          <button
                            key={message.id}
                            onClick={() => setSelectedMessage(message)}
                            className={`w-full text-left p-4 border-b hover:bg-muted transition-colors ${
                              selectedMessage?.id === message.id ? 'bg-muted' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.recipient?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  To: {message.recipient?.full_name || 'Unknown'}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {message.subject || 'No Subject'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(message.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedMessage.subject || 'No Subject'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedMessage.sender_id === user?.id ? 'To' : 'From'}:{' '}
                        {selectedMessage.sender_id === user?.id 
                          ? selectedMessage.recipient?.full_name 
                          : selectedMessage.sender?.full_name
                        }
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedMessage.created_at), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>
                  
                  {selectedMessage.sender_id !== user?.id && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Reply className="h-4 w-4" />
                        <Label>Reply</Label>
                      </div>
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        rows={4}
                      />
                      <Button onClick={sendReply} disabled={isSending}>
                        <Send className="h-4 w-4 mr-2" />
                        {isSending ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Select a Message</h3>
                  <p className="text-muted-foreground">
                    Choose a message from the list to view its contents
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </LMSLayout>
  );
};

export default Messages;
