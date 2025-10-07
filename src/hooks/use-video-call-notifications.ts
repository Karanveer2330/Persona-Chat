"use client";

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/src/contexts/AuthContext';
import { toast } from '@/src/hooks/use-toast';

export interface IncomingCall {
  callerId: string;
  callerName: string;
  callId: string;
  timestamp: Date;
}

export interface VideoCallNotificationState {
  incomingCall: IncomingCall | null;
  isCallActive: boolean;
  callStatus: string;
}

export function useVideoCallNotifications() {
  const { user: currentUser } = useAuth();
  const [state, setState] = useState<VideoCallNotificationState>({
    incomingCall: null,
    isCallActive: false,
    callStatus: 'idle'
  });
  
  const [notificationSocket, setNotificationSocket] = useState<Socket | null>(null);

  // Initialize notification socket
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('Initializing video call notifications for user:', currentUser.id);

    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return "http://localhost:3444";
        } else {
          return `http://${hostname}:3444`;
        }
      }
      return "http://localhost:3444";
    };

    const socket = io(getSocketUrl());
    setNotificationSocket(socket);

    // Set user ID for the socket (extend socket object)
    (socket as any).userId = currentUser.id;

    socket.on('connect', () => {
      console.log('Video call notification socket connected for user:', currentUser.id);
      
      // Register user with server for video call notifications
      socket.emit('registerForVideoCallNotifications', {
        userId: currentUser.id,
        userName: currentUser.name
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Video call notification socket connection error:', error);
    });

    socket.on('registrationConfirmed', (data: any) => {
      console.log('Video call registration confirmed:', data);
    });

    // Listen for incoming video calls
    socket.on('incomingVideoCall', (callData: any) => {
      console.log('📞 Incoming video call:', callData);
      
      setState(prev => ({
        ...prev,
        incomingCall: {
          callerId: callData.callerId,
          callerName: callData.callerName,
          callId: callData.callId,
          timestamp: new Date(callData.timestamp)
        }
      }));

      // Play notification sound
      try {
        // Try to play a sound file first
        const audio = new Audio('/sounds/incoming-call.mp3');
        audio.volume = 0.7;
        audio.play().catch(() => {
          // Fallback: use our custom notification sound generator
          import('@/src/lib/notificationSound').then(({ createNotificationSound }) => {
            createNotificationSound();
          }).catch(() => {
            console.log('Could not load notification sound generator');
          });
        });
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }

      // Show enhanced toast notification
      toast({
        title: "📞 Incoming Persona3D Call",
        description: `${callData.callerName} wants to start a 3D video call`,
        duration: 15000,
        className: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0",
      });
    });

    // Listen for call acceptance confirmation
    socket.on('callAccepted', (data: any) => {
      console.log('✅ Call accepted:', data);
      setState(prev => ({
        ...prev,
        isCallActive: true,
        callStatus: 'connecting'
      }));
      
      toast({
        title: "🎉 Call Accepted!",
        description: `${data.recipientName} accepted your Persona3D call`,
        duration: 3000,
        className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0",
      });
    });

    // Listen for call rejection
    socket.on('callRejected', (data: any) => {
      console.log('❌ Call rejected:', data);
      setState(prev => ({
        ...prev,
        isCallActive: false,
        callStatus: 'rejected'
      }));
      
      toast({
        title: "😔 Call Declined",
        description: `${data.recipientName} declined your Persona3D call`,
        duration: 5000,
        className: "bg-gradient-to-r from-red-600 to-pink-600 text-white border-0",
      });
    });

    // Listen for call invitation status
    socket.on('callInvitationSent', (data: any) => {
      console.log('📤 Call invitation sent:', data);
      setState(prev => ({
        ...prev,
        callStatus: 'ringing'
      }));
      
      toast({
        title: "📞 Calling...",
        description: `Connecting to ${data.recipientName}`,
        duration: 2000,
        className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0",
      });
    });

    socket.on('callInvitationFailed', (data: any) => {
      console.log('❌ Call invitation failed:', data);
      setState(prev => ({
        ...prev,
        callStatus: 'failed'
      }));
      
      toast({
        title: "❌ Call Failed",
        description: data.reason || "Could not reach the user",
        duration: 5000,
        className: "bg-gradient-to-r from-red-600 to-orange-600 text-white border-0",
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id]);

  // Initiate a video call
  const initiateCall = useCallback((recipientId: string, recipientName: string) => {
    if (!notificationSocket || !currentUser) return null;

    const callId = `${currentUser.id}-${recipientId}-${Date.now()}`;
    
    console.log('🚀 Initiating Persona3D video call:', {
      callerId: String(currentUser.id),
      callerName: currentUser.name,
      recipientId: String(recipientId),
      callId
    });
    
    notificationSocket.emit('initiateVideoCall', {
      callerId: String(currentUser.id),
      callerName: currentUser.name || 'Unknown',
      recipientId: String(recipientId),
      callId
    });

    setState(prev => ({
      ...prev,
      isCallActive: true,
      callStatus: 'calling'
    }));

    // Show immediate feedback
    toast({
      title: "🚀 Starting Call",
      description: `Initiating Persona3D call with ${recipientName}`,
      duration: 2000,
      className: "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0",
    });

    // Set timeout for unanswered calls (30 seconds)
    const timeoutId = setTimeout(() => {
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
          className: "bg-gradient-to-r from-orange-600 to-red-600 text-white border-0",
        });
      }
    }, 30000);

    // Store timeout ID for cleanup
    (notificationSocket as any).callTimeoutId = timeoutId;

    return callId;
  }, [notificationSocket, currentUser, state.callStatus]);

  // Accept incoming call
  const acceptCall = useCallback((callId: string, callerId: string, callerName: string) => {
    if (!notificationSocket || !currentUser) return;

    console.log('✅ Accepting Persona3D video call:', {
      callId,
      callerId: String(callerId),
      recipientId: String(currentUser.id),
      recipientName: currentUser.name
    });
    
    // Clear any existing timeout
    if ((notificationSocket as any).callTimeoutId) {
      clearTimeout((notificationSocket as any).callTimeoutId);
      (notificationSocket as any).callTimeoutId = null;
    }
    
    notificationSocket.emit('acceptVideoCall', {
      callId,
      callerId: String(callerId),
      recipientId: String(currentUser.id),
      recipientName: currentUser.name || 'Unknown'
    });

    setState(prev => ({
      ...prev,
      incomingCall: null,
      isCallActive: true,
      callStatus: 'connecting'
    }));

    // Show acceptance feedback
    toast({
      title: "✅ Call Accepted",
      description: `Connecting to ${callerName}'s Persona3D call`,
      duration: 2000,
      className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0",
    });
  }, [notificationSocket, currentUser]);

  // Reject incoming call
  const rejectCall = useCallback((callId: string, callerId: string, reason?: string) => {
    if (!notificationSocket || !currentUser) return;

    console.log('❌ Rejecting Persona3D video call:', {
      callId,
      callerId: String(callerId),
      recipientId: String(currentUser.id),
      reason: reason || 'Call declined'
    });
    
    // Clear any existing timeout
    if ((notificationSocket as any).callTimeoutId) {
      clearTimeout((notificationSocket as any).callTimeoutId);
      (notificationSocket as any).callTimeoutId = null;
    }
    
    notificationSocket.emit('rejectVideoCall', {
      callId,
      callerId: String(callerId),
      recipientId: String(currentUser.id),
      recipientName: currentUser.name || 'Unknown',
      reason: reason || 'Call declined'
    });

    setState(prev => ({
      ...prev,
      incomingCall: null
    }));

    // Show rejection feedback
    toast({
      title: "❌ Call Declined",
      description: reason || "Call declined",
      duration: 2000,
      className: "bg-gradient-to-r from-red-600 to-pink-600 text-white border-0",
    });
  }, [notificationSocket, currentUser]);

  // Clear incoming call notification
  const clearIncomingCall = useCallback(() => {
    setState(prev => ({
      ...prev,
      incomingCall: null
    }));
  }, []);

  // End call
  const endCall = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCallActive: false,
      callStatus: 'idle'
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
