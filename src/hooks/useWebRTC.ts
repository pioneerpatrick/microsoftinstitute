import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

interface UseWebRTCOptions {
  sessionId: string;
  userId: string;
  localStream: MediaStream | null;
}

export function useWebRTC({ sessionId, userId, localStream }: UseWebRTCOptions) {
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([]);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOffer = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    pendingCandidates.current.delete(peerId);
    makingOffer.current.delete(peerId);
    setPeerStreams(prev => prev.filter(p => p.peerId !== peerId));
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    if (peerConnections.current.has(peerId)) {
      return peerConnections.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(peerId, pc);

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setPeerStreams(prev => {
          const existing = prev.find(p => p.peerId === peerId);
          if (existing) {
            return prev.map(p => p.peerId === peerId ? { ...p, stream: remoteStream } : p);
          }
          return [...prev, { peerId, stream: remoteStream }];
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from('webrtc_signals').insert({
          session_id: sessionId,
          sender_id: userId,
          receiver_id: peerId,
          signal_type: 'ice-candidate',
          signal_data: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        cleanupPeer(peerId);
      }
    };

    return pc;
  }, [localStream, sessionId, userId, cleanupPeer]);

  const handleOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(peerId);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Apply pending ICE candidates
      const pending = pendingCandidates.current.get(peerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current.delete(peerId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from('webrtc_signals').insert({
        session_id: sessionId,
        sender_id: userId,
        receiver_id: peerId,
        signal_type: 'answer',
        signal_data: answer,
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [createPeerConnection, sessionId, userId]);

  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(peerId);
    if (!pc) return;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Apply pending ICE candidates
      const pending = pendingCandidates.current.get(peerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current.delete(peerId);
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(peerId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    } else {
      // Queue candidate
      const pending = pendingCandidates.current.get(peerId) || [];
      pending.push(candidate);
      pendingCandidates.current.set(peerId, pending);
    }
  }, []);

  // Initiate connection with a peer
  const connectToPeer = useCallback(async (peerId: string) => {
    if (peerId === userId || makingOffer.current.has(peerId)) return;
    
    makingOffer.current.add(peerId);
    const pc = createPeerConnection(peerId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('webrtc_signals').insert({
        session_id: sessionId,
        sender_id: userId,
        receiver_id: peerId,
        signal_type: 'offer',
        signal_data: offer,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
      makingOffer.current.delete(peerId);
    }
  }, [createPeerConnection, sessionId, userId]);

  // Listen for signals via realtime
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase
      .channel(`webrtc-signals-${sessionId}-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `receiver_id=eq.${userId}`
      }, (payload: any) => {
        const { sender_id, signal_type, signal_data } = payload.new;
        if (signal_data.session_id && signal_data.session_id !== sessionId) return;
        
        switch (signal_type) {
          case 'offer':
            handleOffer(sender_id, signal_data as RTCSessionDescriptionInit);
            break;
          case 'answer':
            handleAnswer(sender_id, signal_data as RTCSessionDescriptionInit);
            break;
          case 'ice-candidate':
            handleIceCandidate(sender_id, signal_data as RTCIceCandidateInit);
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId, handleOffer, handleAnswer, handleIceCandidate]);

  // Update tracks on all peers when local stream changes
  useEffect(() => {
    if (!localStream) return;

    peerConnections.current.forEach((pc) => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      peerConnections.current.forEach((pc, peerId) => {
        pc.close();
      });
      peerConnections.current.clear();
      pendingCandidates.current.clear();

      // Clean up signals from DB
      supabase.from('webrtc_signals')
        .delete()
        .eq('session_id', sessionId)
        .eq('sender_id', userId)
        .then(() => {});
    };
  }, [sessionId, userId]);

  return {
    peerStreams,
    connectToPeer,
    cleanupPeer,
  };
}
