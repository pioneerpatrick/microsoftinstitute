import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useWebRTC, PeerStream } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Send,
  Users,
  MessageSquare,
  FileText,
  Shield,
  Check,
  X,
  Clock,
  Radio,
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  Settings,
  MoreVertical,
  Loader2,
  Smile,
  Pin,
  Trash2,
  Upload,
  Download,
  File,
  Image,
  FileSpreadsheet,
  Paperclip,
  BarChart3,
  Video,
  VideoOff,
  Presentation,
  PenTool,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  LogOut,
  Type,
  Eraser,
  ListVideo,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SessionPolls from '@/components/lms/SessionPolls';
import VideoPanel from '@/components/lms/VideoPanel';
import PresentationMode from '@/components/lms/PresentationMode';
import PDFPresenter from '@/components/lms/PDFPresenter';
import SlideAnnotationCanvas from '@/components/lms/SlideAnnotationCanvas';

interface Session {
  id: string;
  title: string;
  description: string | null;
  meeting_url: string | null;
  moderation_enabled: boolean;
  status: string;
  instructor_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  courses: { title: string };
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null };
}

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null };
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  profiles: { full_name: string | null; email: string | null };
}

interface SessionFile {
  id: string;
  session_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  profiles?: { full_name: string | null };
}

interface OtherLiveSession {
  id: string;
  title: string;
  status: string;
  courses: { title: string };
}

const LiveSessionRoom = () => {
  const { sessionId } = useParams();
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [accessStatus, setAccessStatus] = useState<'checking' | 'approved' | 'pending' | 'denied' | 'open'>('checking');
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [rightPanel, setRightPanel] = useState<'chat' | 'participants' | 'files' | 'polls' | 'video' | 'sessions'>('chat');
  const [handRaised, setHandRaised] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const presentInputRef = useRef<HTMLInputElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  // Whiteboard mode: instructor can type manually without uploading PDF
  const [boardMode, setBoardMode] = useState<'whiteboard' | 'presentation'>('whiteboard');
  // Other live sessions
  const [otherSessions, setOtherSessions] = useState<OtherLiveSession[]>([]);
  // Muted students tracking (local instructor state)
  const [mutedStudents, setMutedStudents] = useState<Set<string>>(new Set());

  const isInstructor = session?.instructor_id === user?.id || isStaff;

  // Keyboard arrow navigation for presentation slides
  useEffect(() => {
    if (boardMode !== 'presentation' || totalSlides === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentSlideIndex(i => Math.min(totalSlides - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentSlideIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'Escape') {
        setBoardMode('whiteboard');
        setActivePdfUrl(null);
        setActiveImageUrl(null);
        setCurrentSlideIndex(0);
        setTotalSlides(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardMode, totalSlides]);

  // WebRTC for peer-to-peer video
  const { peerStreams, connectToPeer } = useWebRTC({
    sessionId: sessionId || '',
    userId: user?.id || '',
    localStream,
  });

  // Enumerate media devices
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };
    enumerateDevices();
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate('/lms/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (sessionId && user) fetchSession();
  }, [sessionId, user]);

  // Fetch other live sessions
  useEffect(() => {
    if (!user) return;
    const fetchOtherSessions = async () => {
      const { data } = await supabase
        .from('live_sessions')
        .select('id, title, status, courses(title)')
        .eq('status', 'live')
        .neq('id', sessionId || '')
        .order('scheduled_at', { ascending: false })
        .limit(20);
      if (data) setOtherSessions(data as any);
    };
    fetchOtherSessions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOtherSessions, 30000);
    return () => clearInterval(interval);
  }, [user, sessionId]);

  // Timer
  useEffect(() => {
    if (!session || session.status !== 'live') return;
    const start = new Date(session.scheduled_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Access control & realtime subscriptions
  useEffect(() => {
    if (!session || !user) return;

    if (isInstructor) {
      setAccessStatus('approved');
      recordAttendance();
      fetchMessages();
      fetchParticipants();
      fetchSharedNotes();
      fetchSessionFiles();
      if (session.moderation_enabled) fetchJoinRequests();
    } else if (!session.moderation_enabled) {
      setAccessStatus('open');
      recordAttendance();
      fetchMessages();
      fetchParticipants();
      fetchSharedNotes();
      fetchSessionFiles();
    } else {
      checkAccess();
    }

    const channels: any[] = [];

    const chatChannel = supabase
      .channel(`session-chat-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${session.id}`
      }, async (payload: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', payload.new.user_id)
          .single();
        setMessages(prev => [...prev, { ...payload.new, profiles: profile }]);
      })
      .subscribe();
    channels.push(chatChannel);

    const attendanceChannel = supabase
      .channel(`session-attendance-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_session_attendance',
        filter: `session_id=eq.${session.id}`
      }, () => fetchParticipants())
      .subscribe();
    channels.push(attendanceChannel);

    const notesChannel = supabase
      .channel(`session-notes-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_notes',
        filter: `session_id=eq.${session.id}`
      }, (payload: any) => {
        if (payload.new && payload.new.updated_by !== user.id) {
          setSharedNotes(payload.new.content);
        }
      })
      .subscribe();
    channels.push(notesChannel);

    const filesChannel = supabase
      .channel(`session-files-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_files',
        filter: `session_id=eq.${session.id}`
      }, () => fetchSessionFiles())
      .subscribe();
    channels.push(filesChannel);

    if (session.moderation_enabled) {
      const requestsChannel = supabase
        .channel(`session-requests-rt-${session.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'live_session_requests',
          filter: `session_id=eq.${session.id}`
        }, (payload: any) => {
          if (isInstructor) {
            fetchJoinRequests();
          } else if (payload.new?.user_id === user.id) {
            if (payload.new.status === 'approved') {
              setAccessStatus('approved');
              toast.success('You have been approved!');
              recordAttendance();
              fetchMessages();
              fetchParticipants();
              fetchSharedNotes();
              fetchSessionFiles();
            } else if (payload.new.status === 'rejected') {
              setAccessStatus('denied');
              toast.error('Your request was denied');
            }
          }
        })
        .subscribe();
      channels.push(requestsChannel);
    }

    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [session, user, isInstructor]);

  // Connect to new participants
  useEffect(() => {
    if (!localStream || !user) return;
    participants.forEach(p => {
      if (p.user_id !== user.id) {
        connectToPeer(p.user_id);
      }
    });
  }, [participants, localStream, user, connectToPeer]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSession = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('live_sessions')
      .select('*, courses(title)')
      .eq('id', sessionId)
      .single();
    if (data) setSession(data);
    setIsLoading(false);
  };

  const checkAccess = async () => {
    if (!session || !user) return;
    const { data } = await supabase
      .from('live_session_requests')
      .select('status')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.status === 'approved') {
      setAccessStatus('approved');
      recordAttendance();
      fetchMessages();
      fetchParticipants();
      fetchSharedNotes();
      fetchSessionFiles();
    } else if (data?.status === 'pending') {
      setAccessStatus('pending');
    } else if (data?.status === 'rejected') {
      setAccessStatus('denied');
    } else {
      await requestAccess();
    }
  };

  const requestAccess = async () => {
    if (!session || !user) return;
    const { error } = await supabase
      .from('live_session_requests')
      .insert({ session_id: session.id, user_id: user.id, status: 'pending' });
    if (!error) {
      setAccessStatus('pending');
      toast.info('Waiting for instructor approval...');
    } else if (error.code === '23505') {
      setAccessStatus('pending');
    }
  };

  const recordAttendance = async () => {
    if (!sessionId || !user) return;
    await supabase.from('live_session_attendance').insert({
      session_id: sessionId,
      user_id: user.id,
      joined_at: new Date().toISOString()
    });
  };

  const fetchMessages = async () => {
    if (!sessionId) return;
    const { data: msgs } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (!msgs) return;
    const userIds = [...new Set(msgs.map(m => m.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setMessages(msgs.map(m => ({ ...m, profiles: profileMap.get(m.user_id) || { full_name: 'Unknown', email: '' } })));
  };

  const fetchParticipants = async () => {
    if (!sessionId) return;
    const { data: attendance } = await supabase
      .from('live_session_attendance')
      .select('id, user_id, joined_at')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });
    if (!attendance) return;
    const userIds = [...new Set(attendance.map(a => a.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const seen = new Set<string>();
    const unique = attendance.filter(a => { if (seen.has(a.user_id)) return false; seen.add(a.user_id); return true; });
    setParticipants(unique.map(a => ({ ...a, profiles: profileMap.get(a.user_id) })) as Participant[]);
  };

  const fetchSharedNotes = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('session_notes')
      .select('content')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (data) setSharedNotes(data.content);
  };

  const fetchJoinRequests = async () => {
    if (!sessionId) return;
    const { data: reqs } = await supabase
      .from('live_session_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('requested_at', { ascending: true });
    if (!reqs || reqs.length === 0) { setJoinRequests([]); return; }
    const userIds = reqs.map(r => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setJoinRequests(reqs.map(r => ({ ...r, profiles: profileMap.get(r.user_id) || { full_name: 'Unknown', email: '' } })) as JoinRequest[]);
  };

  const fetchSessionFiles = async () => {
    if (!sessionId) return;
    const { data: files } = await supabase
      .from('session_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (!files) return;
    const userIds = [...new Set(files.map(f => f.uploaded_by))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setSessionFiles(files.map(f => ({ ...f, profiles: profileMap.get(f.uploaded_by) })) as SessionFile[]);
  };

  const uploadFile = async (file: globalThis.File) => {
    if (!sessionId || !user) return;
    setIsUploading(true);
    try {
      const filePath = `${sessionId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('session-files')
        .upload(filePath, file);
      if (uploadError) { toast.error('Failed to upload file'); return; }
      const { data: urlData } = supabase.storage.from('session-files').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('session_files').insert({
        session_id: sessionId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type || null,
      });
      if (dbError) { toast.error('Failed to save file record'); return; }
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        content: `📎 shared a file: ${file.name}`,
        message_type: 'system'
      });
      toast.success('File shared successfully!');
      setRightPanel('files');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    const { error } = await supabase.from('session_files').delete().eq('id', fileId);
    if (error) toast.error('Failed to delete file');
    else toast.success('File removed');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="h-5 w-5" />;
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-green-600" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="h-5 w-5 text-green-700" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId || !user) return;
    const { error } = await supabase.from('session_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      content: newMessage.trim(),
      message_type: 'chat'
    });
    if (!error) setNewMessage('');
  };

  const saveNotes = useCallback(async (content: string) => {
    if (!sessionId || !user) return;
    await supabase.from('session_notes').upsert({
      session_id: sessionId,
      content,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'session_id' });
  }, [sessionId, user]);

  const handleJoinRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('live_session_requests')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq('id', requestId);
    if (error) toast.error(`Failed to ${status} request`);
    else toast.success(`Student ${status}`);
  };

  const approveAllPending = async () => {
    const pending = joinRequests.filter(r => r.status === 'pending');
    for (const r of pending) await handleJoinRequest(r.id, 'approved');
  };

  const endSession = async () => {
    if (!sessionId) return;
    await supabase.from('live_sessions').update({ status: 'completed' }).eq('id', sessionId);
    toast.success('Session ended');
    navigate('/lms/instructor/live-sessions');
  };

  // Mute a student (sends system message)
  const muteStudent = async (studentId: string, studentName: string) => {
    setMutedStudents(prev => new Set(prev).add(studentId));
    await supabase.from('session_messages').insert({
      session_id: sessionId,
      user_id: user!.id,
      content: `🔇 muted ${studentName}`,
      message_type: 'system'
    });
    toast.success(`${studentName} has been muted`);
  };

  // Unmute a student
  const unmuteStudent = async (studentId: string, studentName: string) => {
    setMutedStudents(prev => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
    toast.success(`${studentName} has been unmuted`);
  };

  // Kick a student from session
  const kickStudent = async (studentId: string, studentName: string) => {
    // Remove their attendance record
    await supabase
      .from('live_session_attendance')
      .delete()
      .eq('session_id', sessionId!)
      .eq('user_id', studentId);

    // If moderation is enabled, reject their request so they can't rejoin
    if (session?.moderation_enabled) {
      await supabase
        .from('live_session_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('session_id', sessionId!)
        .eq('user_id', studentId);
    }

    await supabase.from('session_messages').insert({
      session_id: sessionId,
      user_id: user!.id,
      content: `🚫 removed ${studentName} from the session`,
      message_type: 'system'
    });
    toast.success(`${studentName} has been removed from the session`);
  };

  // Start PDF presentation
  const startPDFPresentation = (pdfUrl: string) => {
    setActivePdfUrl(pdfUrl);
    setActiveImageUrl(null);
    setCurrentSlideIndex(1);
    setTotalSlides(0);
    setBoardMode('presentation');
  };

  // Quick upload and present file
  const handleQuickPresent = async (file: globalThis.File) => {
    if (!sessionId || !user) return;
    setIsUploading(true);
    try {
      const filePath = `${sessionId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('session-files').upload(filePath, file);
      if (uploadError) { toast.error('Failed to upload file'); return; }
      const { data: urlData } = supabase.storage.from('session-files').getPublicUrl(filePath);
      await supabase.from('session_files').insert({
        session_id: sessionId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type || null,
      });
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        content: `📊 started presenting: ${file.name}`,
        message_type: 'system'
      });
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setLoadingPDF(urlData.publicUrl);
      } else if (file.type.startsWith('image/')) {
        setPresentationSlides([urlData.publicUrl]);
        setCurrentSlideIndex(0);
        setBoardMode('presentation');
      }
    } catch (err) {
      toast.error('Failed to start presentation');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getColorFromName = (name: string | null) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500'
    ];
    const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Waiting Room
  if (accessStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Waiting Room</h2>
            <p className="text-muted-foreground mb-2">{session?.title}</p>
            <p className="text-sm text-muted-foreground mb-8">
              Please wait for the instructor to approve your request.
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Waiting for approval...</span>
            </div>
            <Button variant="ghost" className="mt-6" onClick={() => navigate('/lms/live-sessions')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Denied
  if (accessStatus === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              Your request to join this session was not approved.
            </p>
            <Button onClick={() => navigate('/lms/live-sessions')}>Back to Sessions</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessStatus === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = joinRequests.filter(r => r.status === 'pending');

  // Main Session Room
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(isInstructor ? '/lms/instructor/live-sessions' : '/lms/live-sessions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-sm truncate max-w-[200px]">{session?.title}</span>
          </div>
          <Badge variant="secondary" className="text-xs">{session?.courses?.title}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <Clock className="h-3 w-3" />
            {formatTime(elapsed)}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Users className="h-3 w-3" />
            {participants.length}
          </Badge>
          {isInstructor && pendingRequests.length > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs animate-pulse">
              <Shield className="h-3 w-3" />
              {pendingRequests.length} waiting
            </Badge>
          )}
          {isInstructor && (
            <Button size="sm" variant="destructive" onClick={endSession} className="text-xs h-8">
              End Session
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main Content Area - Presentation Board */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Instructor Moderation Banner */}
          {isInstructor && session?.moderation_enabled && pendingRequests.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {pendingRequests.length} student{pendingRequests.length !== 1 ? 's' : ''} waiting to join
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={approveAllPending}>
                  <Check className="h-3 w-3 mr-1" /> Approve All
                </Button>
              </div>
            </div>
          )}

          {/* Content Area - Presentation Board */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {/* Board mode tabs for instructor */}
            {isInstructor && (
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {boardMode === 'presentation' ? (
                    <>
                      <Presentation className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Presentation
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {currentSlideIndex + 1} / {presentationSlides.length}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Whiteboard
                      </h3>
                      <Badge variant="secondary" className="text-xs">Instructor can draw & type</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {boardMode === 'presentation' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setBoardMode('whiteboard');
                        setPresentationSlides([]);
                        setCurrentSlideIndex(0);
                      }}
                    >
                      <Type className="h-3 w-3" /> Whiteboard
                    </Button>
                  )}
                  {boardMode === 'whiteboard' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => presentInputRef.current?.click()}
                    >
                      <Presentation className="h-3 w-3" /> Load PDF
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Student view label */}
            {!isInstructor && (
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                {boardMode === 'presentation' ? (
                  <>
                    <Presentation className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Presentation
                    </h3>
                    {presentationSlides.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentSlideIndex + 1} / {presentationSlides.length}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Board
                    </h3>
                  </>
                )}
              </div>
            )}

            {/* PDF Loading State */}
            {loadingPDF && (
              <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl border">
                <PDFPresenter
                  pdfUrl={loadingPDF}
                  onPagesExtracted={handlePDFPagesExtracted}
                  onError={() => {
                    setLoadingPDF(null);
                    toast.error('Failed to load PDF for presentation');
                  }}
                />
              </div>
            )}

            {/* Presentation Mode - PDF slides */}
            {!loadingPDF && boardMode === 'presentation' && presentationSlides.length > 0 && (
              <>
                <div ref={slideContainerRef} className="flex-1 bg-black rounded-xl overflow-hidden relative flex items-center justify-center">
                  <img
                    src={presentationSlides[currentSlideIndex]}
                    alt={`Slide ${currentSlideIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                  <SlideAnnotationCanvas
                    slideIndex={currentSlideIndex}
                    isInstructor={isInstructor}
                    containerRef={slideContainerRef}
                  />
                  {currentSlideIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10 z-20"
                      onClick={() => setCurrentSlideIndex(i => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  {currentSlideIndex < presentationSlides.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10 z-20"
                      onClick={() => setCurrentSlideIndex(i => Math.min(presentationSlides.length - 1, i + 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                {/* Slide thumbnails strip */}
                {isInstructor && presentationSlides.length > 1 && (
                  <div className="mt-2 flex-shrink-0">
                    <ScrollArea className="w-full">
                      <div className="flex gap-1.5 pb-1">
                        {presentationSlides.map((slide, i) => (
                          <div
                            key={i}
                            className={`flex-shrink-0 w-16 h-12 rounded border overflow-hidden cursor-pointer transition-all ${
                              i === currentSlideIndex ? 'ring-2 ring-primary border-primary' : 'opacity-60 hover:opacity-100'
                            }`}
                            onClick={() => setCurrentSlideIndex(i)}
                          >
                            <img src={slide} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </>
            )}

            {/* Whiteboard Mode - typing + annotation canvas */}
            {!loadingPDF && boardMode === 'whiteboard' && (
              <div ref={slideContainerRef} className="flex-1 bg-white dark:bg-slate-900 rounded-xl border overflow-hidden relative">
                {isInstructor ? (
                  <Textarea
                    value={sharedNotes}
                    onChange={(e) => {
                      setSharedNotes(e.target.value);
                      saveNotes(e.target.value);
                    }}
                    placeholder="Start typing on the board... Students can see this in real-time. Use the annotation tools below to draw."
                    className="h-full w-full resize-none border-0 bg-transparent p-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0 relative z-0"
                  />
                ) : (
                  <div className="h-full w-full p-4 overflow-y-auto">
                    {sharedNotes ? (
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground text-base">
                        {sharedNotes}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        <p>The instructor hasn't written anything yet.</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Annotation canvas overlay on whiteboard */}
                <SlideAnnotationCanvas
                  slideIndex={0}
                  isInstructor={isInstructor}
                  containerRef={slideContainerRef}
                />
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="h-14 border-t bg-card flex items-center justify-center gap-2 px-4 flex-shrink-0">
            {/* Video Toggle */}
            <Button
              variant={isVideoOn ? 'default' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => {
                setIsVideoOn(!isVideoOn);
                setRightPanel('video');
              }}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            
            {/* Mic Toggle */}
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            {/* Raise Hand */}
            <Button
              variant={handRaised ? 'default' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => {
                setHandRaised(!handRaised);
                if (!handRaised) {
                  supabase.from('session_messages').insert({
                    session_id: sessionId,
                    user_id: user!.id,
                    content: '✋ raised their hand',
                    message_type: 'system'
                  });
                }
              }}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <Hand className="h-4 w-4" />
            </Button>
            
            {/* Settings */}
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full h-10 w-10" title="Audio & Video Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="top" align="center">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Audio & Video Settings</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Microphone</Label>
                    <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default microphone" /></SelectTrigger>
                      <SelectContent>
                        {audioDevices.map(device => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Camera</Label>
                    <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default camera" /></SelectTrigger>
                      <SelectContent>
                        {videoDevices.map(device => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Noise Suppression</Label>
                    <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Camera</Label>
                    <Switch checked={isVideoOn} onCheckedChange={(v) => { setIsVideoOn(v); if (v) setRightPanel('video'); }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Microphone</Label>
                    <Switch checked={!isMuted} onCheckedChange={(v) => setIsMuted(!v)} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Instructor-only controls */}
            {isInstructor && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 20 * 1024 * 1024) { toast.error('File size must be under 20MB'); return; }
                      uploadFile(file);
                    }
                    e.target.value = '';
                  }}
                />
                <input
                  ref={presentInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 20 * 1024 * 1024) { toast.error('File size must be under 20MB'); return; }
                      handleQuickPresent(file);
                    }
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Share file"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full h-10 px-4 gap-2"
                  onClick={() => presentInputRef.current?.click()}
                  disabled={isUploading}
                  title="Upload PDF or image and start presenting"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
                  <span className="hidden sm:inline">Present</span>
                </Button>
              </>
            )}
            
            {/* Mobile panel toggles */}
            <div className="flex lg:hidden gap-1 ml-2">
              <Button variant={rightPanel === 'video' ? 'default' : 'ghost'} size="icon" className="rounded-full h-9 w-9" onClick={() => setRightPanel('video')}>
                <Video className="h-4 w-4" />
              </Button>
              <Button variant={rightPanel === 'chat' ? 'default' : 'ghost'} size="icon" className="rounded-full h-9 w-9" onClick={() => setRightPanel('chat')}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant={rightPanel === 'polls' ? 'default' : 'ghost'} size="icon" className="rounded-full h-9 w-9" onClick={() => setRightPanel('polls')}>
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button variant={rightPanel === 'participants' ? 'default' : 'ghost'} size="icon" className="rounded-full h-9 w-9" onClick={() => setRightPanel('participants')}>
                <Users className="h-4 w-4" />
              </Button>
              <Button variant={rightPanel === 'files' ? 'default' : 'ghost'} size="icon" className="rounded-full h-9 w-9" onClick={() => setRightPanel('files')}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant={rightPanel === 'sessions' ? 'default' : 'ghost'} size="icon" className="rounded-full h-9 w-9" onClick={() => setRightPanel('sessions')}>
                <ListVideo className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l bg-card flex flex-col flex-shrink-0 hidden lg:flex">
          <Tabs value={rightPanel} onValueChange={(v) => setRightPanel(v as any)} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b bg-transparent h-12 p-0">
              <TabsTrigger value="video" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full gap-1">
                <Video className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full gap-1">
                <MessageSquare className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="polls" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full gap-1">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="participants" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full gap-1 relative">
                <Users className="h-4 w-4" />
                <span className="text-xs">{participants.length}</span>
                {pendingRequests.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full gap-1">
                <Paperclip className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full gap-1">
                <ListVideo className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            {/* Video Tab */}
            <TabsContent value="video" className="flex-1 m-0 overflow-hidden p-2">
              <div className="h-full flex flex-col gap-2">
                {user && (
                  <VideoPanel
                    userId={user.id}
                    userName={user.email?.split('@')[0] || 'You'}
                    isInstructor={isInstructor}
                    isSelf={true}
                    onStreamChange={(stream) => {
                      setLocalStream(stream);
                      setIsVideoOn(!!stream?.getVideoTracks().length);
                      if (stream) {
                        participants.forEach(p => {
                          if (p.user_id !== user.id) connectToPeer(p.user_id);
                        });
                      }
                    }}
                    onScreenShareChange={setScreenShareStream}
                  />
                )}
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {peerStreams.map(peer => {
                      const participant = participants.find(p => p.user_id === peer.peerId);
                      return (
                        <VideoPanel
                          key={peer.peerId}
                          userId={peer.peerId}
                          userName={participant?.profiles?.full_name || participant?.profiles?.email || 'Participant'}
                          isInstructor={peer.peerId === session?.instructor_id}
                          isSelf={false}
                          remoteStream={peer.stream}
                        />
                      );
                    })}
                    {participants
                      .filter(p => p.user_id !== user?.id && !peerStreams.find(ps => ps.peerId === p.user_id))
                      .map(p => (
                        <div key={p.id} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Avatar className={`h-10 w-10 mx-auto ${getColorFromName(p.profiles?.full_name || null)}`}>
                              <AvatarFallback className="text-sm text-white bg-transparent">
                                {getInitials(p.profiles?.full_name || null)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {p.profiles?.full_name || p.profiles?.email || 'Participant'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Camera off</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No messages yet. Start the conversation!
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwn = msg.user_id === user?.id;
                    const isSystem = msg.message_type === 'system';
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {msg.profiles?.full_name} {msg.content}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {!isOwn && (
                          <Avatar className={`h-7 w-7 flex-shrink-0 ${getColorFromName(msg.profiles?.full_name || null)}`}>
                            <AvatarFallback className="text-xs text-white bg-transparent">
                              {getInitials(msg.profiles?.full_name || null)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[85%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          {!isOwn && (
                            <p className="text-xs font-medium text-muted-foreground mb-0.5 px-1">
                              {msg.profiles?.full_name || 'Unknown'}
                            </p>
                          )}
                          <div className={`rounded-2xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                            {msg.content}
                          </div>
                          <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="p-3 border-t">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-9 rounded-full text-sm"
                  />
                  <Button type="submit" size="icon" className="rounded-full h-9 w-9" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* Polls Tab */}
            <TabsContent value="polls" className="flex-1 m-0 overflow-hidden">
              {session && user && (
                <SessionPolls sessionId={session.id} userId={user.id} isInstructor={isInstructor} />
              )}
            </TabsContent>

            {/* Participants Tab - with mute/kick controls */}
            <TabsContent value="participants" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full p-3">
                {/* Pending Requests */}
                {isInstructor && pendingRequests.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                        Waiting Room ({pendingRequests.length})
                      </p>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={approveAllPending}>
                        Approve All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {pendingRequests.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">{getInitials(r.profiles?.full_name || null)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{r.profiles?.full_name || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:bg-green-50" onClick={() => handleJoinRequest(r.id, 'approved')}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-50" onClick={() => handleJoinRequest(r.id, 'rejected')}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-3" />
                  </div>
                )}

                {/* Active Participants */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  In Session ({participants.length})
                </p>
                <div className="space-y-1">
                  {participants.map(p => {
                    const isThisInstructor = p.user_id === session?.instructor_id;
                    const isSelf = p.user_id === user?.id;
                    const studentName = p.profiles?.full_name || p.profiles?.email || 'Unknown';
                    const isMutedStudent = mutedStudents.has(p.user_id);

                    return (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                        <Avatar className={`h-8 w-8 ${getColorFromName(p.profiles?.full_name || null)}`}>
                          <AvatarFallback className="text-xs text-white bg-transparent">
                            {getInitials(p.profiles?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium truncate">{studentName}</p>
                            {isMutedStudent && <VolumeX className="h-3 w-3 text-destructive flex-shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Joined {format(new Date(p.joined_at), 'h:mm a')}
                          </p>
                        </div>
                        {isThisInstructor && (
                          <Badge variant="secondary" className="text-[10px] h-5">Instructor</Badge>
                        )}
                        {/* Instructor controls for non-instructor participants */}
                        {isInstructor && !isThisInstructor && !isSelf && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-6 w-6 ${isMutedStudent ? 'text-amber-600' : 'text-muted-foreground'}`}
                              onClick={() => isMutedStudent ? unmuteStudent(p.user_id, studentName) : muteStudent(p.user_id, studentName)}
                              title={isMutedStudent ? 'Unmute student' : 'Mute student'}
                            >
                              {isMutedStudent ? <Mic className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive"
                              onClick={() => kickStudent(p.user_id, studentName)}
                              title="Remove from session"
                            >
                              <LogOut className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 m-0 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-3">
                {isInstructor && (
                  <Button
                    variant="outline"
                    className="w-full mb-3 border-dashed gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Share a File</>
                    )}
                  </Button>
                )}
                {sessionFiles.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No files shared yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessionFiles.map(file => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background border flex items-center justify-center">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(file.file_size)} • {file.profiles?.full_name || 'Instructor'} • {format(new Date(file.created_at), 'h:mm a')}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {isInstructor && (file.file_type?.includes('pdf') || file.file_name.endsWith('.pdf')) && (
                            <Button 
                              size="icon" variant="ghost" className="h-7 w-7 text-primary hover:text-primary"
                              onClick={() => startPDFPresentation(file.file_url)}
                              title="Present PDF"
                            >
                              <Presentation className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isInstructor && (file.file_type?.startsWith('image/') || file.file_name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) && (
                            <Button 
                              size="icon" variant="ghost" className="h-7 w-7 text-primary hover:text-primary"
                              onClick={() => {
                                setPresentationSlides([file.file_url]);
                                setCurrentSlideIndex(0);
                                setBoardMode('presentation');
                              }}
                              title="Present Image"
                            >
                              <Presentation className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          {isInstructor && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteFile(file.id, file.file_url)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Live Sessions Tab - clickable list of other active sessions */}
            <TabsContent value="sessions" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Other Live Sessions
                </p>
                {otherSessions.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <ListVideo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No other live sessions right now.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {otherSessions.map(s => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/lms/meet/${s.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <p className="text-sm font-medium truncate">{s.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{(s.courses as any)?.title}</p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs w-full gap-1 opacity-80 group-hover:opacity-100">
                          <Video className="h-3 w-3" /> Join Session
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LiveSessionRoom;
