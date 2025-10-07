"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/hooks/use-toast';
import { getSocket } from '@/src/lib/socket';

export interface IncomingCall {
  callerId: string;
  callerName: string;
  callId: string;
  timestamp: Date;
}

export interface VideoCallState {
  incomingCall: IncomingCall | null;
  isCallActive: boolean;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'rejected' | 'failed';
}

export function useVideoCallNotifications() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<VideoCallState>({
    incomingCall: null,
    isCallActive: false,
    callStatus: 'idle'
  });
  
  const socketRef = useRef<Socket | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection using existing socket
  useEffect(() => {
    console.log('🔌 useVideoCallNotifications useEffect triggered');
    console.log('🔌 currentUser:', currentUser);
    console.log('🔌 currentUser?.id:', currentUser?.id);
    
    if (!currentUser?.id) {
      console.log('❌ No currentUser.id, skipping video call notifications initialization');
      return;
    }

    console.log('🔌 Initializing video call notifications for user:', currentUser.id);
    
    // Use the existing socket connection from lib/socket.ts
    const initializeSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        console.log('✅ Using existing socket connection for video calls:', socket.id);
        
        // Setup all socket event handlers
        setupSocketEvents(socket);
        
        // Register user for video calls if not already registered
        socket.emit('registerForVideoCallNotifications', {
          userId: currentUser.id,
          userName: currentUser.name || 'Unknown'
        });
        
      } catch (error) {
        console.error('❌ Failed to get existing socket:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to video call service",
          variant: "destructive",
        });
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up video call notifications');
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      // Don't disconnect the socket as it's shared with other components
    };
  }, [currentUser?.id, currentUser?.name, toast]);

  // Setup socket event handlers
  const setupSocketEvents = (socket: Socket) => {
    // Registration confirmation
    socket.on('registrationConfirmed', (data) => {
      console.log('✅ Video call registration confirmed:', data);
    });

    // Incoming call
    socket.on('incomingVideoCall', (callData: any) => {
      console.log('📞 Incoming video call:', callData);
      console.log('📞 Current state before update:', state);
      
      const newIncomingCall = {
        callerId: callData.callerId,
        callerName: callData.callerName,
        callId: callData.callId,
        timestamp: new Date(callData.timestamp || Date.now())
      };
      
      console.log('📞 New incoming call object:', newIncomingCall);
      
      setState(prev => {
        const newState = {
          ...prev,
          incomingCall: newIncomingCall
        };
        console.log('📞 State after update:', newState);
        return newState;
      });

      // Play notification sound
      try {
        const audio = new Audio('/sounds/incoming-call.mp3');
        audio.volume = 0.7;
        audio.play().catch(() => {
          console.log('Could not play notification sound');
        });
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }

      // Show toast notification
      toast({
        title: "📞 Incoming Video Call",
        description: `${callData.callerName} wants to start a video call`,
        duration: 15000,
      });
    });

    // Call accepted
    socket.on('callAccepted', (data: any) => {
      console.log('✅ Call accepted:', data);
      setState(prev => ({
        ...prev,
        isCallActive: true,
        callStatus: 'connecting'
      }));
      
      // Clear timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      
      toast({
        title: "🎉 Call Accepted!",
        description: `${data.recipientName} accepted your video call`,
        duration: 3000,
      });
    });

    // Call rejected
    socket.on('callRejected', (data: any) => {
      console.log('❌ Call rejected:', data);
      setState(prev => ({
        ...prev,
        isCallActive: false,
        callStatus: 'rejected'
      }));
      
      // Clear timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      
      toast({
        title: "😔 Call Declined",
        description: `${data.recipientName} declined your video call`,
        duration: 5000,
        variant: "destructive",
      });
    });

    // Call invitation failed
    socket.on('callInvitationFailed', (data: any) => {
      console.log('❌ Call invitation failed:', data);
      setState(prev => ({
        ...prev,
        isCallActive: false,
        callStatus: 'failed'
      }));
      
      // Clear timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      
      toast({
        title: "❌ Call Failed",
        description: data.reason || "Could not reach the user",
        duration: 5000,
        variant: "destructive",
      });
    });
  };

  // Initiate a video call
  const initiateCall = useCallback((recipientId: string, recipientName: string) => {
    if (!socketRef.current || !currentUser) {
      console.log('❌ Cannot initiate call: socket or user not available');
      return null;
    }

    const callId = `${currentUser.id}-${recipientId}-${Date.now()}`;
    
    console.log('🚀 Initiating video call:', {
      callerId: currentUser.id,
      callerName: currentUser.name,
      recipientId: recipientId,
      callId
    });
    
    socketRef.current.emit('initiateVideoCall', {
      callerId: currentUser.id,
      callerName: currentUser.name || 'Unknown',
      recipientId: recipientId,
      callId
    });

    setState(prev => ({
      ...prev,
      isCallActive: true,
      callStatus: 'calling'
    }));

    // Set timeout for unanswered calls (30 seconds)
    callTimeoutRef.current = setTimeout(() => {
      if (state.callStatus === 'calling' || state.callStatus === 'ringing') {
        console.log('⏰ Call timeout - no answer after 30 seconds');
        setState(prev => ({
          ...prev,
          isCallActive: false,
          callStatus: 'failed'
        }));
        
        toast({
          title: "⏰ No Answer",
          description: `${recipientName} didn't answer the call`,
          duration: 5000,
          variant: "destructive",
        });
      }
    }, 30000);

    return callId;
  }, [currentUser, state.callStatus, toast]);

  // Accept a video call
  const acceptCall = useCallback((callId: string, callerId: string, callerName: string) => {
    if (!socketRef.current) return;

    console.log('✅ Accepting video call:', { callId, callerId, callerName });
    
    socketRef.current.emit('acceptVideoCall', {
      callId,
      callerId,
      recipientName: currentUser?.name || 'Unknown'
    });

    setState(prev => ({
      ...prev,
      isCallActive: true,
      callStatus: 'connecting',
      incomingCall: null
    }));
  }, [currentUser?.name]);

  // Reject a video call
  const rejectCall = useCallback((callId: string, callerId: string, reason: string) => {
    if (!socketRef.current) return;

    console.log('❌ Rejecting video call:', { callId, callerId, reason });
    
    socketRef.current.emit('rejectVideoCall', {
      callId,
      callerId,
      recipientName: currentUser?.name || 'Unknown',
      reason
    });

    setState(prev => ({
      ...prev,
      isCallActive: false,
      callStatus: 'rejected',
      incomingCall: null
    }));
  }, [currentUser?.name]);

  // Clear incoming call
  const clearIncomingCall = useCallback(() => {
    setState(prev => ({
      ...prev,
      incomingCall: null
    }));
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isCallActive: false,
      callStatus: 'idle',
      incomingCall: null
    }));
  }, []);

  return {
    ...state,
    initiateCall,
    acceptCall,
    rejectCall,
    clearIncomingCall,
    endCall
  };
}
