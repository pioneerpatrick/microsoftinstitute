import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Settings,
  RefreshCw,
  MonitorUp,
  MonitorOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VideoPanelProps {
  userId: string;
  userName: string;
  isInstructor: boolean;
  isSelf: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const VideoPanel = ({
  userId,
  userName,
  isInstructor,
  isSelf,
  isExpanded = false,
  onToggleExpand,
}: VideoPanelProps) => {
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Get available devices
  useEffect(() => {
    if (!isSelf) return;
    
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);
        
        const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
        const audioDevices = deviceList.filter(d => d.kind === 'audioinput');
        
        if (videoDevices.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoDevices[0].deviceId);
        }
        if (audioDevices.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };
    
    getDevices();
  }, [isSelf]);

  // Start/stop video stream
  const toggleVideo = async () => {
    if (!isSelf) return;
    
    if (isVideoOn && stream) {
      // Stop video
      stream.getVideoTracks().forEach(track => track.stop());
      setIsVideoOn(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } else {
      // Start video
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedVideoDevice 
            ? { deviceId: { exact: selectedVideoDevice } }
            : true,
          audio: isAudioOn ? (selectedAudioDevice 
            ? { deviceId: { exact: selectedAudioDevice } }
            : true) : false
        };
        
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        setIsVideoOn(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast.error('Could not access camera. Please check permissions.');
      }
    }
  };

  // Start/stop audio
  const toggleAudio = async () => {
    if (!isSelf) return;
    
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = !isAudioOn;
        });
        setIsAudioOn(!isAudioOn);
      } else if (!isAudioOn) {
        // Add audio track
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: selectedAudioDevice 
              ? { deviceId: { exact: selectedAudioDevice } }
              : true
          });
          audioStream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
          setIsAudioOn(true);
        } catch (error) {
          toast.error('Could not access microphone.');
        }
      }
    } else if (!isAudioOn) {
      // Start audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioDevice 
            ? { deviceId: { exact: selectedAudioDevice } }
            : true
        });
        setStream(audioStream);
        setIsAudioOn(true);
      } catch (error) {
        toast.error('Could not access microphone.');
      }
    }
  };

  // Screen sharing (instructor only)
  const toggleScreenShare = async () => {
    if (!isInstructor || !isSelf) return;
    
    if (isScreenSharing && screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenStream(screen);
        setIsScreenSharing(true);
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screen;
        }
        
        // Handle when user stops sharing via browser UI
        screen.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
        
        toast.success('Screen sharing started');
      } catch (error) {
        console.error('Error sharing screen:', error);
        toast.error('Could not start screen sharing');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const videoDevices = devices.filter(d => d.kind === 'videoinput');
  const audioDevices = devices.filter(d => d.kind === 'audioinput');

  return (
    <div 
      className={`relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center ${
        isExpanded ? 'w-full h-full' : 'aspect-video'
      }`}
    >
      {/* Screen Share Display */}
      {isScreenSharing && screenStream && (
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* Video Display */}
      {isVideoOn && stream && !isScreenSharing ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="w-full h-full object-cover"
          style={{ transform: isSelf ? 'scaleX(-1)' : 'none' }}
        />
      ) : !isScreenSharing ? (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <Avatar className="h-16 w-16 bg-primary/20">
            <AvatarFallback className="text-xl bg-primary/20 text-primary">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-sm font-medium truncate max-w-full">
            {userName}
          </span>
        </div>
      ) : null}

      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-medium truncate">
              {userName} {isSelf && '(You)'}
            </span>
            {isInstructor && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                Instructor
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {!isAudioOn && (
              <div className="h-5 w-5 rounded-full bg-red-500/80 flex items-center justify-center">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
            {isScreenSharing && (
              <div className="h-5 w-5 rounded-full bg-green-500/80 flex items-center justify-center">
                <MonitorUp className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls (only for self) */}
      {isSelf && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full ${isVideoOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-500'}`}
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-4 w-4 text-white" /> : <VideoOff className="h-4 w-4 text-white" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full ${isAudioOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-500'}`}
            onClick={toggleAudio}
          >
            {isAudioOn ? <Mic className="h-4 w-4 text-white" /> : <MicOff className="h-4 w-4 text-white" />}
          </Button>

          {isInstructor && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full ${isScreenSharing ? 'bg-green-500/80 hover:bg-green-500' : 'bg-white/20 hover:bg-white/30'}`}
              onClick={toggleScreenShare}
            >
              {isScreenSharing ? <MonitorOff className="h-4 w-4 text-white" /> : <MonitorUp className="h-4 w-4 text-white" />}
            </Button>
          )}

          {/* Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30"
              >
                <Settings className="h-4 w-4 text-white" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" side="bottom" align="end">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Camera</label>
                  <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                          {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Microphone</label>
                  <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                          {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30"
              onClick={onToggleExpand}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4 text-white" /> : <Maximize2 className="h-4 w-4 text-white" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPanel;
