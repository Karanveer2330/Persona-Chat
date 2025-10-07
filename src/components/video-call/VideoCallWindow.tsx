"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone, User, Settings, Maximize2, Menu, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import VideoCall3DAvatar from './VideoCall3DAvatar';
import CameraTroubleshootingGuide from './CameraTroubleshootingGuide';
import MobileFallback from './MobileFallback';
import { useAuth } from '../../contexts/AuthContext';
import { Socket } from 'socket.io-client';
import { createSocketConnection } from '../../lib/socket';

interface VideoCallWindowProps {
  recipientId: string;
  recipientName: string;
  isInitiator: boolean;
}

export default function VideoCallWindow({
  recipientId,
  recipientName,
  isInitiator
}: VideoCallWindowProps) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('Initializing...');
  const [callDuration, setCallDuration] = useState(0);
  const [selectedVrmUrl, setSelectedVrmUrl] = useState<string | null>("https://d1l5n2avb89axj.cloudfront.net/avatar-first.vrm");
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showTroubleshootingGuide, setShowTroubleshootingGuide] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showMobileFallback, setShowMobileFallback] = useState(false);
  const [localAvatarData, setLocalAvatarData] = useState<any>(null);
  const [remoteAvatarData, setRemoteAvatarData] = useState<any>(null);

  // Add global error handler for unhandled promises
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in video call:', event.reason);
      
      // Ignore ethereum-related errors as they're not related to video calls
      if (event.reason && (
        event.reason.toString().includes('ethereum') ||
        event.reason.toString().includes('selectedAddress') ||
        event.reason.toString().includes('MetaMask') ||
        event.reason.toString().includes('wallet')
      )) {
        console.log('Ignoring wallet-related error in video call context');
        event.preventDefault();
        return;
      }

      // Handle video call related errors
      if (event.reason && (
        event.reason.toString().includes('getUserMedia') ||
        event.reason.toString().includes('mediaDevices') ||
        event.reason.toString().includes('NotAllowedError') ||
        event.reason.toString().includes('NotFoundError')
      )) {
        setCallStatus('❌ Camera/microphone access failed. Please check permissions.');
        setShowMobileFallback(true);
        event.preventDefault();
        return;
      }
      
      setCallStatus('Connection error occurred. Please try again.');
      setIsConnecting(false);
      event.preventDefault(); // Prevent the error from appearing in console
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error in video call:', event.error);
      
      // Ignore ethereum-related errors
      if (event.error && event.error.toString().includes('ethereum')) {
        event.preventDefault();
        return;
      }
      
      setCallStatus('An error occurred. Please refresh and try again.');
      setIsConnecting(false);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Early mobile browser detection
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isOldMobile = /Opera Mini|BlackBerry|IEMobile/i.test(navigator.userAgent);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|WhatsApp|Twitter/i.test(navigator.userAgent);
    
    if (isOldMobile || isInAppBrowser) {
      console.log('Unsupported mobile browser detected, showing fallback immediately');
      setCallStatus('This browser does not support video calls');
      setShowMobileFallback(true);
    } else if (isMobile) {
      console.log('Mobile browser detected, will use mobile-optimized settings');
      setDebugInfo('Mobile browser detected - using optimized settings');
    }
  }, []);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a consistent callId that both participants will use
  const generateCallId = (userId1: string, userId2: string) => {
    // Sort the IDs to ensure both participants generate the same callId
    const sortedIds = [userId1, userId2].sort();
    return `call-${sortedIds[0]}-${sortedIds[1]}`;
  };
  
  // Get current user ID from auth context
  const currentUserId = user?.id || `temp-${Date.now()}`;
  const currentUserName = user?.name || 'Unknown User';
  const callId = generateCallId(currentUserId, recipientId);

  // Model selector handlers
  const handleModelSelect = useCallback((modelUrl: string) => {
    console.log("Model selected for video call:", modelUrl);
    setSelectedVrmUrl(modelUrl);
  }, []);


  // Avatar data update callback
  const onAvatarDataUpdate = useCallback((avatarData: any) => {
    console.log('📤 VideoCallWindow received avatar data:', avatarData);
    setLocalAvatarData(avatarData);
    
    // Send avatar data to remote user via socket
    if (socketRef.current && isConnected) {
      socketRef.current.emit('avatarData', {
        callId,
        senderId: socketRef.current.id,
        senderUserId: currentUserId,
        avatarData: avatarData
      });
    }
  }, [callId, currentUserId, isConnected]);

  // Retry call function
  const retryCall = useCallback(() => {
    if (retryCount < 3) {
      console.log(`Retrying call attempt ${retryCount + 1}/3`);
      setRetryCount(prev => prev + 1);
      setDebugInfo(`Retry attempt ${retryCount + 1}/3`);
      
      // Clean up existing connections
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Reset initialization state
      setIsInitialized(false);
      setIsConnecting(false);
      setIsConnected(false);
      
      // Re-initialize after a short delay
      setTimeout(() => {
        console.log('Reloading page for retry...');
        window.location.reload(); // Simple reload for now
      }, 1000);
    } else {
      setCallStatus('Maximum retry attempts reached. Please try again later.');
      setIsConnecting(false);
    }
  }, [retryCount, localStream]);

  // Permission request handler for mobile fallback
  const handleRequestPermissions = async () => {
    try {
      setCallStatus('📱 Requesting camera and microphone permission...');
      setShowMobileFallback(false);
      
      // Check if modern API is available
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setCallStatus('❌ This browser does not support camera access. Please use Chrome, Firefox, or Safari.');
        setShowMobileFallback(true);
        return;
      }

      // Check if we're on HTTP (which blocks camera access)
      const isHttp = window.location.protocol === 'http:';
      
      if (isHttp) {
        setCallStatus('❌ Camera access blocked: This site needs HTTPS for camera access. Click "Help" for solutions.');
        setShowMobileFallback(true);
        return;
      }

      // Show user a clear prompt about what will happen
      setCallStatus('📱 Your browser will ask for camera permission. Please tap "Allow"');
      
      // Wait a moment for user to read the message
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try multiple permission approaches
      let testStream: MediaStream | null = null;
      
      try {
        // First attempt: Simple video and audio with minimal constraints
        setCallStatus('🎥 Requesting camera access...');
        testStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      } catch (firstError: any) {
        console.log('Full access failed, trying video only:', firstError);
        
        try {
          // Second attempt: Video only with minimal constraints
          setCallStatus('📹 Trying video only...');
          testStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (videoError: any) {
          console.log('Video only failed, trying audio only:', videoError);
          
          try {
            // Third attempt: Audio only
            setCallStatus('🎤 Trying audio only...');
            testStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true
            });
          } catch (audioError: any) {
            throw audioError; // If all fail, throw the last error
          }
        }
      }
      
      // If we got any stream, permissions were granted
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
        setCallStatus('✅ Permissions granted! Camera access working.');
        
        // Don't reload, just continue
        setTimeout(() => {
          setCallStatus('🎥 Starting video call...');
          initializeCall();
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('Permission request failed:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        setCallStatus('❌ You denied camera access. Please enable it in browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        setCallStatus('❌ No camera or microphone found. Please connect a device and try again.');
      } else if (error.name === 'NotReadableError') {
        setCallStatus('❌ Camera is being used by another app. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        setCallStatus('❌ Camera settings not supported. Trying basic settings...');
        
        // Try again with minimal constraints
        setTimeout(() => {
          handleRequestPermissions();
        }, 2000);
        return;
      } else if (error.name === 'NotSupportedError' || error.name === 'TypeError') {
        setCallStatus('❌ This browser does not support video calls. Please use Chrome, Firefox, or Safari.');
      } else {
        setCallStatus('❌ Permission request failed. Please check your camera and try again.');
      }
      
      setShowMobileFallback(true);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WebRTC call function
  const initializeCall = async () => {
    console.log('Starting video call initialization...');
    console.log('Call details:', { 
      callId, 
      currentUserId, 
      currentUserName, 
      recipientId, 
      recipientName, 
      isInitiator 
    });
    setIsInitialized(true);
    
    // Set a timeout for the whole connection process
    let connectionTimeout: NodeJS.Timeout | null = null;
    
    try {
      setIsConnecting(true);
      
      // Step 1: Check permissions first
      setCallStatus('🔍 Checking device permissions...');
      const permissionsOk = await checkMediaPermissions();
      if (!permissionsOk && showMobileFallback) {
        setIsConnecting(false);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        return;
      }
      
      // Detect mobile browser first
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          console.log('Connection timeout reached');
          setCallStatus('Connection timeout. Please try again or check camera permissions.');
          setIsConnecting(false);
        }
      }, 30000); // 30 second timeout

      // Add media timeout to prevent indefinite loading - very aggressive for mobile
      const mediaTimeout = isMobile ? 5000 : 15000; // 5 seconds for mobile, 15 for desktop
      mediaTimeoutRef.current = setTimeout(() => {
        console.log('Media access timeout reached');
        setCallStatus('Media access timed out. Your device may not support video calls.');
        setIsConnecting(false);
        setShowMobileFallback(true);
      }, mediaTimeout);

      // Check permissions first
      const hasPermissions = await checkMediaPermissions();
      if (!hasPermissions) {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
        setIsConnecting(false);
        return;
      }

      setCallStatus('Connecting to signaling server...');
      
      // Connect to Socket.IO server with automatic HTTPS detection
      setDebugInfo(`Connecting with auto HTTPS detection...`);
      console.log('Connecting to server with automatic protocol detection');
      
      let socket: Socket;
      try {
        socket = await createSocketConnection();
        socketRef.current = socket;

        // Handle socket connection events
        socket.on('connect', () => {
          console.log('Video call socket connected');
          setCallStatus('Connected to server...');
        });

        socket.on('connect_error', (error) => {
          console.error('Video call socket connection error:', error);
          setCallStatus(`Connection failed: ${error.message || 'Unknown error'}`);
          setIsConnecting(false);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          return;
        });
      } catch (error) {
        console.error('Failed to create socket connection:', error);
        setCallStatus(`Socket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsConnecting(false);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        return;
      }

      setCallStatus('Requesting camera and microphone access...');
      console.log('Requesting media access...');
      
      // Check if media devices are available with better fallback support
      if (!navigator.mediaDevices) {
        // Fallback for older browsers
        const nav = navigator as any;
        if (nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia) {
          console.log('Using legacy getUserMedia API');
          setCallStatus('Using legacy camera API...');
        } else {
          throw new Error('Camera and microphone are not supported in this browser. Please use Chrome, Firefox, or Safari.');
        }
      } else if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not available. Please enable camera permissions in your browser settings.');
      }

      // Enhanced getUserMedia with better mobile support
      const getMediaStream = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
        // Modern API
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return await navigator.mediaDevices.getUserMedia(constraints);
        }
        
        // Legacy API fallback for older mobile browsers
        const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                  (navigator as any).webkitGetUserMedia || 
                                  (navigator as any).mozGetUserMedia;
                                  
        if (legacyGetUserMedia) {
          return new Promise((resolve, reject) => {
            legacyGetUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
        
        throw new Error('Camera API not supported');
      };

      // Timeout wrapper for getUserMedia
      const getUserMediaWithTimeout = (constraints: MediaStreamConstraints, timeout = 10000) => {
        return Promise.race([
          getMediaStream(constraints),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Media access request timed out')), timeout)
          )
        ]);
      };

      // Check for available devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        
        if (!hasCamera && !hasMicrophone) {
          throw new Error('No camera or microphone found');
        }
        if (!hasCamera) {
          console.warn('No camera found, proceeding with audio only');
        }
        if (!hasMicrophone) {
          console.warn('No microphone found, proceeding with video only');
        }
      } catch (error) {
        console.warn('Could not enumerate devices:', error);
        // Continue anyway, the getUserMedia call will fail if needed
      }

      // Request media stream with timeout
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      console.log('Requesting media stream with constraints:', constraints);
      const stream = await getUserMediaWithTimeout(constraints, 10000);
      
      console.log('Media stream obtained:', stream);
      setLocalStream(stream);
      setCallStatus('✅ Camera and microphone access granted!');

      // Create RTCPeerConnection with STUN servers
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream:', event.streams[0]);
        setRemoteStream(event.streams[0]);
        setIsConnecting(false);
        setCallStatus('Connected to 3D Avatar Chat');
        if (connectionTimeout) clearTimeout(connectionTimeout);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate);
          socket.emit('iceCandidate', {
            callId,
            candidate: event.candidate,
            targetSocketId: null // Will be set by server
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log('🔗 Connection state changed:', state);
        
        switch (state) {
          case 'connecting':
            setCallStatus('Connecting to 3D Avatar...');
            setIsConnecting(true);
            break;
          case 'connected':
            setCallStatus('Connected to 3D Avatar Chat');
            setIsConnecting(false);
            setIsConnected(true);
            if (connectionTimeout) clearTimeout(connectionTimeout);
            break;
          case 'disconnected':
            setCallStatus('Disconnected from 3D Avatar');
            setIsConnected(false);
            break;
          case 'failed':
            setCallStatus('Failed to connect to 3D Avatar');
            setIsConnected(false);
            break;
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log('🧊 ICE connection state changed:', iceState);
        
        switch (iceState) {
          case 'checking':
            setCallStatus('Checking network connection...');
            break;
          case 'connected':
            setCallStatus('Network connection established');
            break;
          case 'completed':
            setCallStatus('Connection completed successfully');
            break;
          case 'failed':
            setCallStatus('Network connection failed');
            setIsConnected(false);
            break;
          case 'disconnected':
            setCallStatus('Network connection lost');
            setIsConnected(false);
            break;
          case 'closed':
            setCallStatus('Connection closed');
            setIsConnected(false);
            break;
        }
      };

      // Handle ICE gathering state changes
      peerConnection.onicegatheringstatechange = () => {
        const gatheringState = peerConnection.iceGatheringState;
        console.log('🔍 ICE gathering state changed:', gatheringState);
      };

      // Also monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log('ICE connection state changed:', iceState);
        
        switch (iceState) {
          case 'checking':
            setCallStatus('Checking network connectivity...');
            break;
          case 'connected':
          case 'completed':
            setCallStatus('Network connection established');
            break;
          case 'failed':
            setCallStatus('Network connection failed - check firewall settings');
            setIsConnecting(false);
            break;
          case 'disconnected':
            setCallStatus('Network connection lost');
            break;
          case 'closed':
            setCallStatus('Call ended');
            setIsConnected(false);
            break;
        }
      };

      // Socket.IO event listeners
      socket.on('userJoinedCall', async ({ userId, userName, socketId }) => {
        console.log(`User ${userName} (${userId}) joined the call. I am initiator: ${isInitiator}, My userId: ${currentUserId}`);
        
        // Don't react to our own join event
        if (userId === currentUserId) {
          console.log('Ignoring own join event');
          return;
        }
        
        // Only the initiator should create and send an offer when someone joins
        // But wait a bit to ensure both users are ready
        if (isInitiator) {
          console.log('Creating offer as initiator...');
          setCallStatus('Sending call invitation...');
          setTimeout(async () => {
            try {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);
              
              console.log('Sending offer to:', socketId);
              socket.emit('offer', {
                callId,
                offer,
                targetSocketId: socketId
              });
              setCallStatus('Call invitation sent, waiting for response...');
            } catch (error) {
              console.error('Error creating offer:', error);
              setCallStatus('Failed to create call offer');
            }
          }, 1000); // Small delay to ensure both sides are ready
        } else {
          console.log('Waiting for offer as recipient...');
          setCallStatus('Waiting for call invitation from initiator...');
        }
      });

      socket.on('offer', async ({ offer, fromSocketId, fromUserName }) => {
        console.log(`Received offer from ${fromUserName} (${fromSocketId})`);
        
        try {
          setCallStatus('Processing call invitation...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          
          console.log('Creating answer...');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          console.log('Sending answer to:', fromSocketId);
          socket.emit('answer', {
            callId,
            answer,
            targetSocketId: fromSocketId
          });
          setCallStatus('Call invitation accepted, connecting...');
        } catch (error) {
          console.error('Error processing offer:', error);
          setCallStatus('Failed to process call invitation');
        }
      });

      socket.on('answer', async ({ answer, fromSocketId, fromUserName }) => {
        console.log(`Received answer from ${fromUserName} (${fromSocketId})`);
        
        try {
          setCallStatus('Finalizing connection...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus('Connection established!');
        } catch (error) {
          console.error('Error processing answer:', error);
          setCallStatus('Failed to establish connection');
        }
      });

      socket.on('iceCandidate', async ({ candidate, fromSocketId, fromUserName }) => {
        console.log(`Received ICE candidate from ${fromUserName} (${fromSocketId})`);
        
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      });

      // Join the call room
      console.log('Joining call room:', callId);
      socket.emit('joinCall', {
        callId,
        userId: currentUserId,
        userName: currentUserName
      });

      setCallStatus('Waiting for other participant...');

    } catch (error: any) {
      console.error('Video call initialization failed:', error);
      
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        setCallStatus('❌ Camera/microphone access denied. Please enable permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        setCallStatus('❌ No camera or microphone found. Please connect a device and try again.');
      } else if (error.name === 'NotReadableError') {
        setCallStatus('❌ Camera is being used by another app. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        setCallStatus('❌ Camera settings not supported. Trying basic settings...');
        
        // Try again with minimal constraints
        setTimeout(() => {
          initializeCall();
        }, 2000);
        return;
      } else if (error.name === 'NotSupportedError' || error.name === 'TypeError') {
        setCallStatus('❌ This browser does not support video calls. Please use Chrome, Firefox, or Safari.');
      } else {
        setCallStatus(`❌ Video call failed: ${error.message || 'Unknown error'}`);
      }
      
      setIsConnecting(false);
      setShowMobileFallback(true);
    }
  };

  // Enhanced mobile-friendly permission check
  const checkMediaPermissions = async (): Promise<boolean> => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // First check if navigator even exists (SSR safety)
      if (typeof navigator === 'undefined') {
        setCallStatus('❌ Browser environment not available');
        setShowMobileFallback(true);
        return false;
      }

      // Check if getUserMedia is supported at all
      const hasModernAPI = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
      const hasLegacyAPI = (navigator as any).getUserMedia || 
                          (navigator as any).webkitGetUserMedia || 
                          (navigator as any).mozGetUserMedia;

      if (!hasModernAPI && !hasLegacyAPI) {
        setCallStatus('❌ This browser does not support video calls. Please use Chrome, Firefox, or Safari.');
        setShowMobileFallback(true);
        return false;
      }

      // For mobile, show permission request dialog
      if (isMobile) {
        setCallStatus('📱 Tap "Allow" to grant camera and microphone access');
        
        // Additional mobile browser checks
        if (!hasModernAPI) {
          setCallStatus('❌ This mobile browser version does not support video calls. Please update your browser.');
          setShowMobileFallback(true);
          return false;
        }
      }

      // Check existing permissions if supported (only for modern browsers)
      if (hasModernAPI && navigator.permissions) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          console.log('Permission states:', {
            camera: cameraPermission.state,
            microphone: microphonePermission.state
          });
          
          if (cameraPermission.state === 'denied' || microphonePermission.state === 'denied') {
            setCallStatus('❌ Camera/microphone access denied. Please enable in browser settings.');
            setShowMobileFallback(true);
            return false;
          }
          
          if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
            setCallStatus('✅ Permissions already granted');
            return true;
          }
        } catch (permError) {
          console.warn('Permission API not fully supported:', permError);
        }
      }

      // For mobile devices, try a quick permission test (only if modern API available)
      if (isMobile && hasModernAPI) {
        try {
          setCallStatus('🔍 Testing device compatibility...');
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { max: 320 },
              height: { max: 240 },
              facingMode: 'user' 
            },
            audio: true
          });
          
          // Stop the test stream immediately
          testStream.getTracks().forEach(track => track.stop());
          setCallStatus('✅ Device compatible! Starting call...');
          return true;
          
        } catch (testError: any) {
          console.error('Mobile compatibility test failed:', testError);
          
          if (testError.name === 'NotAllowedError') {
            setCallStatus('❌ Please allow camera and microphone access when prompted');
          } else if (testError.name === 'NotFoundError') {
            setCallStatus('❌ No camera or microphone found on this device');
          } else if (testError.name === 'NotSupportedError' || testError.name === 'TypeError') {
            setCallStatus('❌ This browser does not support video calls');
          } else {
            setCallStatus('❌ Device not compatible with video calls');
          }
          
          setShowMobileFallback(true);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Permission check failed:', error);
      setCallStatus('⚠️ Unable to check permissions. Browser may not support video calls.');
      setShowMobileFallback(true);
      return false;
    }
  };

  // Test camera access function
  const testCameraAccess = useCallback(async () => {
    setCallStatus('🔍 Testing camera access...');
    console.log('Starting camera test...');
    
    try {
      // First try to get devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log('Video devices found:', videoDevices.length);
      console.log('Audio devices found:', audioDevices.length);
      
      if (videoDevices.length === 0 && audioDevices.length === 0) {
        setCallStatus('❌ No camera or microphone devices found. Please connect devices and try again.');
        return;
      }
      
      // Try to access camera with timeout
      const getUserMediaWithTimeout = (constraints: MediaStreamConstraints, timeout = 5000) => {
        return Promise.race([
          navigator.mediaDevices.getUserMedia(constraints),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout after 5 seconds')), timeout)
          )
        ]);
      };
      
      const testStream = await getUserMediaWithTimeout({
        video: videoDevices.length > 0,
        audio: audioDevices.length > 0
      });
      
      // If successful, show success message and stop the test stream
      testStream.getTracks().forEach(track => track.stop());
      setCallStatus('✅ Camera access test successful! You can now retry the call.');
      console.log('Camera test successful');
      
    } catch (error) {
      console.error('Camera test failed:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setCallStatus('❌ Permission denied. Please click "Allow" when browser asks for camera access.');
        } else if (error.name === 'NotFoundError') {
          setCallStatus('❌ No camera/microphone found. Please connect a device.');
        } else if (error.name === 'NotReadableError') {
          setCallStatus('❌ Camera is being used by another app. Please close other apps and try again.');
        } else if (error.message.includes('timeout')) {
          setCallStatus('❌ Camera test timed out. Please check your camera and try again.');
        } else {
          setCallStatus(`❌ Camera test failed: ${error.message}`);
        }
      } else {
        setCallStatus('❌ Camera test failed. Please check your device and try again.');
      }
    }
  }, []);

  // Initialize WebRTC with Socket.IO signaling
  useEffect(() => {
    // Browser environment safety checks
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.log('Not in browser environment, skipping video call initialization');
      return;
    }

    // Prevent multiple initializations
    if (isInitialized || isConnecting) {
      console.log('Initialization skipped - already initialized or connecting');
      return;
    }

    const initializeCall = async () => {
      console.log('Starting video call initialization...');
      console.log('Call details:', { 
        callId, 
        currentUserId, 
        currentUserName, 
        recipientId, 
        recipientName, 
        isInitiator 
      });
      setIsInitialized(true);
      
      // Set a timeout for the whole connection process
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      try {
        setIsConnecting(true);
        
        // Step 1: Check permissions first
        setCallStatus('🔍 Checking device permissions...');
        const permissionsOk = await checkMediaPermissions();
        if (!permissionsOk && showMobileFallback) {
          setIsConnecting(false);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          return;
        }
        
        // Detect mobile browser first
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        connectionTimeout = setTimeout(() => {
          if (!isConnected) {
            console.log('Connection timeout reached');
            setCallStatus('Connection timeout. Please try again or check camera permissions.');
            setIsConnecting(false);
          }
        }, 30000); // 30 second timeout

        // Add media timeout to prevent indefinite loading - very aggressive for mobile
        const mediaTimeout = isMobile ? 5000 : 15000; // 5 seconds for mobile, 15 for desktop
        mediaTimeoutRef.current = setTimeout(() => {
          console.log('Media access timeout reached');
          setCallStatus('Media access timed out. Your device may not support video calls.');
          setIsConnecting(false);
          setShowMobileFallback(true);
        }, mediaTimeout);

        // Check permissions first
        const hasPermissions = await checkMediaPermissions();
        if (!hasPermissions) {
          if (connectionTimeout) clearTimeout(connectionTimeout);
          if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
          setIsConnecting(false);
          return;
        }

        setCallStatus('Connecting to signaling server...');
        
        // Connect to Socket.IO server with automatic HTTPS detection
        setDebugInfo(`Connecting with auto HTTPS detection...`);
        console.log('Connecting to server with automatic protocol detection');
        
        let socket: Socket;
        try {
          socket = await createSocketConnection();
          socketRef.current = socket;

          // Handle socket connection events
          socket.on('connect', () => {
            console.log('Video call socket connected');
            setCallStatus('Connected to server...');
          });

          socket.on('connect_error', (error) => {
            console.error('Video call socket connection error:', error);
            setCallStatus(`Connection failed: ${error.message || 'Unknown error'}`);
            setIsConnecting(false);
            if (connectionTimeout) clearTimeout(connectionTimeout);
            return;
          });
        } catch (error) {
          console.error('Failed to create socket connection:', error);
          setCallStatus(`Socket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsConnecting(false);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          return;
        }

        setCallStatus('Requesting camera and microphone access...');
        console.log('Requesting media access...');
        
        // Check if media devices are available with better fallback support
        if (!navigator.mediaDevices) {
          // Fallback for older browsers
          const nav = navigator as any;
          if (nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia) {
            console.log('Using legacy getUserMedia API');
            setCallStatus('Using legacy camera API...');
          } else {
            throw new Error('Camera and microphone are not supported in this browser. Please use Chrome, Firefox, or Safari.');
          }
        } else if (!navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not available. Please enable camera permissions in your browser settings.');
        }

        // Enhanced getUserMedia with better mobile support
        const getMediaStream = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
          // Modern API
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            return await navigator.mediaDevices.getUserMedia(constraints);
          }
          
          // Legacy API fallback for older mobile browsers
          const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                    (navigator as any).webkitGetUserMedia || 
                                    (navigator as any).mozGetUserMedia;
                                    
          if (legacyGetUserMedia) {
            return new Promise((resolve, reject) => {
              legacyGetUserMedia.call(navigator, constraints, resolve, reject);
            });
          }
          
          throw new Error('Camera API not supported');
        };

        // Timeout wrapper for getUserMedia
        const getUserMediaWithTimeout = (constraints: MediaStreamConstraints, timeout = 10000) => {
          return Promise.race([
            getMediaStream(constraints),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Media access request timed out')), timeout)
            )
          ]);
        };

        // Check for available devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(device => device.kind === 'videoinput');
          const hasMicrophone = devices.some(device => device.kind === 'audioinput');
          
          if (!hasCamera && !hasMicrophone) {
            throw new Error('No camera or microphone found');
          }
          if (!hasCamera) {
            console.warn('No camera found, proceeding with audio only');
          }
          if (!hasMicrophone) {
            console.warn('No microphone found, proceeding with video only');
          }
        } catch (deviceError) {
          console.warn('Could not enumerate devices:', deviceError);
        }
        
        // Get user media with progressive fallback and timeout
        let stream: MediaStream;
        
        // Check if this is an unsupported mobile browser
        if (isMobile && !navigator.mediaDevices) {
          console.log('Mobile browser without mediaDevices support detected');
          setCallStatus('This mobile browser does not support video calls');
          setShowMobileFallback(true);
          setIsConnecting(false);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
          return;
        }
        
        // For iOS, check if it's in a secure context
        if (isIOS && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          console.log('iOS requires HTTPS for camera access');
          setCallStatus('iOS requires secure connection (HTTPS) for camera access');
          setShowMobileFallback(true);
          setIsConnecting(false);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
          return;
        }
        
        try {
          console.log('Attempting media access for mobile:', isMobile);
          setCallStatus('Requesting camera permission...');
          
          if (isMobile) {
            // Mobile-specific constraints - very basic for compatibility
            stream = await getUserMediaWithTimeout({
              video: {
                width: { max: 640, ideal: 320 },
                height: { max: 480, ideal: 240 },
                facingMode: 'user'
              },
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
              }
            }, 8000); // Shorter timeout for mobile
            console.log('Mobile media access successful');
          } else {
            // Desktop constraints - higher quality
            stream = await getUserMediaWithTimeout({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            });
            console.log('Desktop media access successful');
          }
        } catch (mediaError) {
          console.error('Initial media access error:', mediaError);
          setCallStatus('Trying with minimal settings...');
          
          try {
            console.log('Attempting minimal media access...');
            // Second attempt: Absolute minimal constraints
            stream = await getUserMediaWithTimeout({
              video: isMobile ? { facingMode: 'user' } : true,
              audio: true
            }, 5000); // Even shorter timeout for fallback
            console.log('Minimal media access successful');
          } catch (basicError) {
            console.error('Minimal media access failed:', basicError);
            
            // Third attempt: Audio only for mobile
            if (isMobile) {
              try {
                console.log('Attempting audio-only for mobile...');
                setCallStatus('Camera not available, trying audio only...');
                stream = await getUserMediaWithTimeout({
                  video: false,
                  audio: true
                }, 3000);
                console.log('Audio-only access successful');
              } catch (audioError) {
                console.error('Audio-only access failed:', audioError);
                // Show specific error for mobile browsers
                if (isMobile) {
                  throw new Error('Camera and microphone access failed on mobile. Please:\n1. Allow camera permissions when prompted\n2. Close other apps using the camera\n3. Try refreshing the page\n4. Check if your browser supports camera access');
                } else {
                  throw new Error('Media access completely failed. Please check browser permissions and try again.');
                }
              }
            } else {
              // Desktop fallback attempts
              setCallStatus('Trying video only...');
              
              try {
                console.log('Attempting video only access...');
                // Third attempt: Video only
                stream = await getUserMediaWithTimeout({
                  video: true,
                  audio: false
                });
                console.log('Video only access successful');
              } catch (videoOnlyError) {
                console.error('Video only failed:', videoOnlyError);
                throw new Error('Camera access completely failed. Please check browser permissions and try again.');
              }
            }
          }
        }
        
        setLocalStream(stream);
        console.log('Local stream obtained:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
        
        // Clear media timeout once stream is obtained
        if (mediaTimeoutRef.current) {
          clearTimeout(mediaTimeoutRef.current);
          mediaTimeoutRef.current = null;
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('Local video element updated');
        }

        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        peerConnectionRef.current = peerConnection;
        console.log('Peer connection created');

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          console.log(`Adding track to peer connection: ${track.kind} - ${track.label}`);
          peerConnection.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log('Received remote stream');
          const [remoteStream] = event.streams;
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
          setIsConnecting(false);
          setCallStatus('Connected to 3D Avatar Chat');
          if (connectionTimeout) clearTimeout(connectionTimeout);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            socket.emit('iceCandidate', {
              callId,
              candidate: event.candidate,
              targetSocketId: null // Will be set by server
            });
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          const state = peerConnection.connectionState;
          console.log('🔗 Connection state changed:', state);
          
          switch (state) {
            case 'connecting':
              setCallStatus('Connecting to 3D Avatar...');
              setIsConnecting(true);
              break;
            case 'connected':
              setCallStatus('Connected to 3D Avatar Chat');
              setIsConnecting(false);
              setIsConnected(true);
              if (connectionTimeout) clearTimeout(connectionTimeout);
              break;
            case 'disconnected':
              setCallStatus('Disconnected from 3D Avatar');
              setIsConnected(false);
              break;
            case 'failed':
              setCallStatus('Failed to connect to 3D Avatar');
              setIsConnected(false);
              break;
          }
        };

        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          const iceState = peerConnection.iceConnectionState;
          console.log('🧊 ICE connection state changed:', iceState);
          
          switch (iceState) {
            case 'checking':
              setCallStatus('Checking network connection...');
              break;
            case 'connected':
              setCallStatus('Network connection established');
              break;
            case 'completed':
              setCallStatus('Connection completed successfully');
              break;
            case 'failed':
              setCallStatus('Network connection failed');
              setIsConnected(false);
              break;
            case 'disconnected':
              setCallStatus('Network connection lost');
              setIsConnected(false);
              break;
            case 'closed':
              setCallStatus('Connection closed');
              setIsConnected(false);
              break;
          }
        };

        // Handle ICE gathering state changes
        peerConnection.onicegatheringstatechange = () => {
          const gatheringState = peerConnection.iceGatheringState;
          console.log('🔍 ICE gathering state changed:', gatheringState);
        };

        // Also monitor ICE connection state
        peerConnection.oniceconnectionstatechange = () => {
          const iceState = peerConnection.iceConnectionState;
          console.log('ICE connection state changed:', iceState);
          
          switch (iceState) {
            case 'checking':
              setCallStatus('Checking network connectivity...');
              break;
            case 'connected':
            case 'completed':
              setCallStatus('Network connection established');
              break;
            case 'failed':
              setCallStatus('Network connection failed - check firewall settings');
              setIsConnecting(false);
              break;
            case 'disconnected':
              setCallStatus('Network connection lost');
              break;
            case 'closed':
              setCallStatus('Call ended');
              setIsConnected(false);
              break;
          }
        };

        // Socket.IO event listeners
        socket.on('userJoinedCall', async ({ userId, userName, socketId }) => {
          console.log(`User ${userName} (${userId}) joined the call. I am initiator: ${isInitiator}, My userId: ${currentUserId}`);
          
          // Don't react to our own join event
          if (userId === currentUserId) {
            console.log('Ignoring own join event');
            return;
          }
          
          // Only the initiator should create and send an offer when someone joins
          // But wait a bit to ensure both users are ready
          if (isInitiator) {
            console.log('Creating offer as initiator...');
            setCallStatus('Sending call invitation...');
            setTimeout(async () => {
              try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                console.log('Sending offer to:', socketId);
                socket.emit('offer', {
                  callId,
                  offer,
                  targetSocketId: socketId
                });
                setCallStatus('Call invitation sent, waiting for response...');
              } catch (error) {
                console.error('Error creating offer:', error);
                setCallStatus('Failed to create call offer');
              }
            }, 1000); // Small delay to ensure both sides are ready
          } else {
            console.log('Waiting for offer as recipient...');
            setCallStatus('Waiting for call invitation from initiator...');
          }
        });

        socket.on('offer', async ({ offer, fromSocketId, fromUserName }) => {
          console.log(`Received offer from ${fromUserName} (${fromSocketId})`);
          
          try {
            setCallStatus('Processing call invitation...');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            console.log('Sending answer to:', fromSocketId);
            socket.emit('answer', {
              callId,
              answer,
              targetSocketId: fromSocketId
            });
            setCallStatus('Connecting to call...');
          } catch (error) {
            console.error('Error handling offer:', error);
            setCallStatus('Failed to respond to call offer');
          }
        });

        socket.on('answer', async ({ answer, fromUserName }) => {
          console.log(`Received answer from ${fromUserName}`);
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Answer processed successfully');
            setCallStatus('Establishing connection...');
          } catch (error) {
            console.error('Error handling answer:', error);
            setCallStatus('Failed to process call answer');
          }
        });

        socket.on('iceCandidate', async ({ candidate, fromUserName }) => {
          console.log(`Received ICE candidate from ${fromUserName}`);
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        });

      socket.on('userLeftCall', ({ userName }) => {
        console.log(`User ${userName} left the call`);
        setCallStatus('Call ended');
        setIsConnected(false);
      });

      // Avatar data synchronization
      socket.on('avatarData', ({ senderUserId, avatarData }) => {
        console.log('📥 VideoCallWindow received remote avatar data from:', senderUserId, avatarData);
        // Only process avatar data from the other participant, not ourselves
        if (senderUserId !== currentUserId) {
          setRemoteAvatarData(avatarData);
        }
      });

        // Emit join after everything is set up
        console.log('Joining video call room:', { 
          callId, 
          currentUserId, 
          currentUserName, 
          isInitiator,
          recipientId,
          recipientName
        });
        setCallStatus('Joining call room...');
        
        // Add a small delay to ensure socket is connected
        setTimeout(() => {
          if (socket.connected) {
            socket.emit('joinVideoCall', {
              callId,
              userId: currentUserId,
              userName: currentUserName
            });
            console.log('✅ Emitted joinVideoCall successfully');
            setCallStatus(isInitiator ? 'Waiting for participant to join...' : 'Joining call...');
          } else {
            console.error('❌ Socket not connected when trying to join video call');
            setCallStatus('Connection failed - socket not connected');
          }
        }, 500);

      } catch (error) {
        console.error('Error initializing call:', error);
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (mediaTimeoutRef.current) clearTimeout(mediaTimeoutRef.current);
        
        // Provide specific error messages based on error type
        if (error instanceof Error) {
          if (error.message.includes('camera') || error.message.includes('microphone')) {
            setCallStatus('Camera/microphone access required. Please allow permissions and try again.');
            setShowMobileFallback(true);
          } else if (error.name === 'NotReadableError') {
            setCallStatus('Camera is being used by another application. Please close other apps and try again.');
            setShowMobileFallback(true);
          } else if (error.name === 'NotAllowedError') {
            setCallStatus('Camera/microphone access denied. Please allow permissions in your browser settings.');
            setShowMobileFallback(true);
          } else if (error.name === 'NotFoundError') {
            setCallStatus('No camera/microphone found. Please connect a device and try again.');
            setShowMobileFallback(true);
          } else if (error.message.includes('timeout')) {
            setCallStatus('Media access timed out. Your device may not be supported.');
            setShowMobileFallback(true);
          } else {
            setCallStatus(`Failed to start call: ${error.message}`);
          }
        } else {
          setCallStatus('Failed to access camera/microphone. Please check your device and permissions.');
          setShowMobileFallback(true);
        }
        
        setIsConnecting(false);
      }
    };

    initializeCall();

    // Cleanup function
    return () => {
      console.log('Cleaning up video call...');
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.emit('leaveVideoCall');
        socketRef.current.disconnect();
      }
      // Clean up timeouts
      if (mediaTimeoutRef.current) {
        clearTimeout(mediaTimeoutRef.current);
        mediaTimeoutRef.current = null;
      }
      setIsInitialized(false);
    };
  }, []); // Remove dependencies to prevent re-initialization

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.emit('leaveVideoCall');
      socketRef.current.disconnect();
    }
    
    // Navigate back to chat
    window.location.href = '/chat/global';
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative">
      {/* Fixed Model Selector Button - Mobile Responsive */}
      <div className="fixed top-2 right-2 md:top-4 md:right-4 z-50">
      </div>

      {/* Header - Clean and minimal - Mobile Responsive */}
      <div className="flex items-center justify-between p-2 md:p-4 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white">{recipientName}</h3>
            <div className="flex items-center space-x-1 md:space-x-2 text-green-400 text-xs md:text-sm">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>{isConnected ? `${formatDuration(callDuration)}` : "Connecting..."}</span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={endCall} className="text-white hover:bg-red-500/20 p-1 md:p-2">
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>

      {/* Main Layout - Clean separation - Mobile Responsive */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Left: 3D Avatar - Main focus area */}
        <div className={`transition-all duration-300 ${showModelSelector ? 'md:mr-96' : 'flex-1'} p-2 md:p-6`}>
          <div className="h-full bg-gradient-to-br from-slate-900/50 to-purple-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border border-white/10 relative">
            {/* 3D Avatar Component */}
            <VideoCall3DAvatar 
              isConnected={isConnected}
              recipientName={recipientName}
              callStatus={callStatus}
              remoteStream={remoteStream}
              selectedVrmUrl={selectedVrmUrl}
              onAvatarDataUpdate={onAvatarDataUpdate}
              remoteAvatarData={remoteAvatarData}
            />
          </div>
        </div>

        {/* Right: Controls sidebar - Mobile Responsive */}
        <div className="w-full md:w-80 p-2 md:p-6 md:pl-0 flex flex-col space-y-2 md:space-y-4">
          
          {/* Your Video - Mobile Responsive */}
          <div className="relative bg-black/40 backdrop-blur-sm rounded-lg md:rounded-xl overflow-hidden border border-white/10 h-32 md:h-48">
            <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-blue-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md z-10">
              <span className="text-white text-xs font-medium">You</span>
            </div>
            
            {localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center space-y-2 md:space-y-3">
                  <div className="animate-spin rounded-full h-4 w-4 md:h-6 md:w-6 border-b-2 border-blue-400 mx-auto mb-1 md:mb-2"></div>
                  <p className="text-xs md:text-sm">Camera loading...</p>
                  
                  {/* Show retry button after 5 seconds */}
                  {!isConnected && (
                    <div className="space-y-1 md:space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 px-2 py-1"
                      >
                        Retry
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMobileFallback(true)}
                        className="text-xs bg-yellow-500/20 border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/30 px-2 py-1"
                      >
                        Help
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isVideoOff && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <VideoOff className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
            )}
          </div>

          {/* Remote Video (if available) - Mobile Responsive */}
          {remoteStream && (
            <div className="relative bg-black/40 backdrop-blur-sm rounded-lg md:rounded-xl overflow-hidden border border-white/10 h-32 md:h-48">
              <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-green-500 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md z-10">
                <span className="text-white text-xs font-medium">{recipientName}</span>
              </div>
              
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Call Info - Mobile Responsive */}
          <div className="bg-black/30 backdrop-blur-lg rounded-lg md:rounded-xl p-2 md:p-4 border border-white/10">
            <h4 className="text-white font-medium text-xs md:text-sm mb-2 md:mb-3">Call Status</h4>
            <div className="space-y-1 md:space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Duration:</span>
                <span className="text-cyan-400">{formatDuration(callDuration)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Status:</span>
                <span className={isConnected ? "text-green-400" : "text-yellow-400"}>
                  {isConnected ? "Connected" : "Connecting"}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Quality:</span>
                <span className="text-purple-400">HD</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Protocol:</span>
                <span className={window.location.protocol === 'https:' ? "text-green-400" : "text-red-400"}>
                  {window.location.protocol === 'https:' ? 'HTTPS ✅' : 'HTTP ❌'}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Camera Access:</span>
                <span className={window.location.protocol === 'https:' ? "text-green-400" : "text-red-400"}>
                  {window.location.protocol === 'https:' ? 'Available' : 'Blocked'}
                </span>
              </div>
                <div>Call ID: {callId.slice(-8)}</div>
                <div>Role: {isInitiator ? 'Initiator' : 'Recipient'}</div>
                <div>My ID: {currentUserId.slice(-8)}</div>
                <div>Partner: {recipientId.slice(-8)}</div>
              </div>
            </div>
            
              {/* Status message and retry button */}
            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/10">
              <p className="text-xs text-gray-300 mb-1 md:mb-2">{callStatus}</p>
              {(callStatus.includes('Failed') || callStatus.includes('denied') || callStatus.includes('Error')) && retryCount < 3 && (
                <Button
                  onClick={retryCall}
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs mb-1 md:mb-2 py-1"
                >
                  Retry ({3 - retryCount} attempts left)
                </Button>
              )}
              
              {/* Test camera button */}
              {(callStatus.includes('Failed') || callStatus.includes('denied') || callStatus.includes('access')) && (
                <div className="space-y-1 md:space-y-2">
                  <Button
                    onClick={testCameraAccess}
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 text-xs py-1"
                  >
                    Test Camera Access
                  </Button>
                  <Button
                    onClick={() => window.open('/enable-camera-access.html', '_blank')}
                    size="sm"
                    variant="outline"
                    className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs flex items-center gap-1 py-1"
                  >
                    <HelpCircle className="h-3 w-3" />
                    Camera Access Guide
                  </Button>
                </div>
              )}
              
              {/* Debug: Force connection attempt */}
              {(callStatus.includes('Waiting') || callStatus.includes('Connecting') || callStatus.includes('timeout')) && !isConnected && (
                <div className="space-y-1 md:space-y-2">
                  <Button
                    onClick={() => {
                      console.log('🔧 Force connection attempt');
                      if (socketRef.current && peerConnectionRef.current) {
                        setCallStatus('Force connecting...');
                        // Re-emit join
                        socketRef.current.emit('joinVideoCall', {
                          callId,
                          userId: currentUserId,
                          userName: currentUserName
                        });
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-xs py-1"
                  >
                    🔧 Force Reconnect
                  </Button>
                  <Button
                    onClick={retryCall}
                    size="sm"
                    variant="outline"
                    className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-xs py-1"
                  >
                    🔄 Retry Call ({retryCount}/3)
                  </Button>
                </div>
              )}
              
              {/* Troubleshooting tips - Hidden on mobile */}
              {(callStatus.includes('Failed') || callStatus.includes('denied') || callStatus.includes('access') || callStatus.includes('Error')) && (
                <details className="hidden md:block mt-2">
                  <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
                    Troubleshooting Tips
                  </summary>
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    <p><strong>Camera Access Issues:</strong></p>
                    <p>• Click the camera icon in address bar and allow permissions</p>
                    <p>• Close Zoom, Teams, Skype or other apps using camera</p>
                    <p>• Try refreshing the page (Ctrl+F5)</p>
                    <p>• Check if camera is properly connected</p>
                    <p>• Try using a different browser (Chrome/Edge recommended)</p>
                    <p>• Make sure you're on HTTPS (secure connection)</p>
                    <p><strong>If still not working:</strong></p>
                    <p>• Restart your browser completely</p>
                    <p>• Check Windows Privacy Settings → Camera</p>
                    <p>• Update your camera drivers</p>
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* Controls - Mobile Responsive */}
          <div className="bg-black/30 backdrop-blur-lg rounded-lg md:rounded-xl p-2 md:p-4 border border-white/10">
            <h4 className="text-white font-medium text-xs md:text-sm mb-2 md:mb-3">Controls</h4>
            <div className="flex justify-center space-x-2 md:space-x-3">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="sm"
                onClick={toggleMute}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${isMuted ? "" : "bg-white/10 text-white border-white/20"}`}
              >
                {isMuted ? <MicOff className="h-3 w-3 md:h-4 md:w-4" /> : <Mic className="h-3 w-3 md:h-4 md:w-4" />}
              </Button>

              <Button
                variant={isVideoOff ? "destructive" : "outline"}
                size="sm"
                onClick={toggleVideo}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${isVideoOff ? "" : "bg-white/10 text-white border-white/20"}`}
              >
                {isVideoOff ? <VideoOff className="h-3 w-3 md:h-4 md:w-4" /> : <Video className="h-3 w-3 md:h-4 md:w-4" />}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={endCall}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full"
              >
                <Phone className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* Troubleshooting Guide Modal */}
      {showTroubleshootingGuide && (
        <CameraTroubleshootingGuide 
          onClose={() => setShowTroubleshootingGuide(false)}
        />
      )}

      {/* Mobile Fallback */}
      {showMobileFallback && (
        <MobileFallback
          recipientName={recipientName}
          onGoBack={() => {
            setShowMobileFallback(false);
            window.close();
          }}
          onRetry={() => {
            setShowMobileFallback(false);
            setCallStatus('Retrying...');
            window.location.reload();
          }}
          onRequestPermissions={handleRequestPermissions}
        />
      )}
    </div>
  );
}
