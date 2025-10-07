"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '@/src/lib/socket';

export interface MobileWebRTCAudioState {
  isEnabled: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  volume: number;
  audioLevel: number;
  remoteAudioEnabled: boolean;
  remoteVolume: number;
  isCaller: boolean;
  signalingState: string;
  connectionState: string;
  error: string | null;
  permissionState: 'unknown' | 'granted' | 'denied' | 'prompt';
}

export interface MobileWebRTCAudioCallbacks {
  onVoiceDataUpdate?: (data: { audioLevel: number; volume: number; isSpeaking: boolean }) => void;
  onRemoteVoiceData?: (data: { volume: number; isSpeaking: boolean }) => void;
  onRemoteAudioStream?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
}

export function useMobileWebRTCAudio(
  recipientId: string,
  currentUserId: string,
  callbacks?: MobileWebRTCAudioCallbacks
) {
  const [audioState, setAudioState] = useState<MobileWebRTCAudioState>({
    isEnabled: false,
    isMuted: false,
    isSpeaking: false,
    volume: 0,
    audioLevel: 0,
    remoteAudioEnabled: false,
    remoteVolume: 0,
    isCaller: false,
    signalingState: 'new',
    connectionState: 'new',
    error: null,
    permissionState: 'unknown'
  });

  const [remoteVoiceData, setRemoteVoiceData] = useState<{ [userId: string]: { volume: number; isSpeaking: boolean } }>({});

  // Refs for WebRTC audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const permissionCheckRef = useRef<number | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  // Debug logging
  const addLog = useCallback((message: string) => {
    console.log(`[MobileWebRTC] ${message}`);
  }, []);

  // Check permissions periodically
  const checkPermissions = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setAudioState(prev => ({ ...prev, permissionState: micPermission.state as any }));
        addLog(`Permission state: ${micPermission.state}`);
      }
    } catch (error) {
      addLog('Permission API not supported');
    }
  }, [addLog]);

  // Initialize audio context and microphone with mobile-specific handling
  const initializeAudio = useCallback(async () => {
    try {
      addLog('Starting mobile audio initialization...');
      
      // Step 1: Check HTTPS requirement for mobile
      const isSecureContext = window.isSecureContext || location.protocol === 'https:';
      if (isMobile && !isSecureContext) {
        throw new Error('HTTPS is required for microphone access on mobile devices');
      }
      addLog('✅ HTTPS check passed');

      // Step 2: Check getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      addLog('✅ getUserMedia support confirmed');

      // Step 3: Create audio context with mobile-optimized settings
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: isMobile ? 16000 : 44100,
        latencyHint: isMobile ? 'interactive' : 'balanced'
      });
      addLog('✅ Audio context created');

      // Step 4: Resume audio context if suspended (critical for mobile)
      if (audioContextRef.current.state === 'suspended') {
        addLog('⚠️ Audio context suspended - attempting to resume...');
        await audioContextRef.current.resume();
        addLog('✅ Audio context resumed');
      }

      // Step 5: Request microphone with mobile-optimized constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Enhanced audio processing for smoother, lighter tone
          sampleRate: isMobile ? 16000 : 44100,
          channelCount: 1,
          // Additional audio processing options
          latency: 0.01, // Low latency for real-time communication
          volume: 1.0,   // Increased volume for better voice clarity
          // Platform-specific constraints
          ...(isIOS && {
            sampleSize: 16,
            sampleRate: 16000
          }),
          ...(isAndroid && {
            sampleRate: 16000,
            channelCount: 1
          }),
          ...(isSafari && {
            sampleRate: 16000,
            channelCount: 1
          })
        } 
      };
      
      addLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      microphoneRef.current = stream;
      localStreamRef.current = stream;
      addLog('✅ Microphone access granted');

      // Step 6: Setup audio analysis
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create audio processing chain for smoother, lighter tone
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1.2; // Increased gain for better voice volume while keeping tone soft
      
      const filterNode = audioContextRef.current.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 8000; // Cut off high frequencies for softer tone
      filterNode.Q.value = 0.5; // Gentle rolloff
      
      // Connect audio processing chain
      source.connect(filterNode);
      filterNode.connect(gainNode);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = isMobile ? 128 : 256;
      analyserRef.current.smoothingTimeConstant = 0.9; // Increased smoothing for softer effect
      analyserRef.current.minDecibels = -90; // Lower threshold for softer detection
      analyserRef.current.maxDecibels = -10; // Reduced max for lighter tone
      
      gainNode.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      addLog('✅ Audio analysis setup complete');

      // Step 7: Create audio element for remote audio with mobile-friendly settings
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = false; // Disable autoplay for mobile
        remoteAudioRef.current.volume = 0.8;
        remoteAudioRef.current.preload = 'auto';
        
        // Add mobile-specific attributes
        if (isMobile) {
          remoteAudioRef.current.setAttribute('playsinline', 'true');
          remoteAudioRef.current.setAttribute('webkit-playsinline', 'true');
        }
      }

      setAudioState(prev => ({ ...prev, error: null }));
      addLog('🎤 Mobile audio initialized successfully');
      return true;
    } catch (error: any) {
      addLog(`❌ Mobile audio initialization failed: ${error.message}`);
      
      let errorMessage = 'Unknown error';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied by user';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found on device';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'WebRTC not supported on this device';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - HTTPS required for microphone access';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Audio initialization was aborted';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use by another application';
      } else {
        errorMessage = error.message || error.toString();
      }
      
      setAudioState(prev => ({ ...prev, error: errorMessage }));
      callbacks?.onError?.(errorMessage);
      return false;
    }
  }, [isMobile, isIOS, isAndroid, isSafari, addLog, callbacks]);

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Handle incoming remote audio stream
    peerConnection.ontrack = (event) => {
      addLog('📞 Remote audio track received');
      const [remoteStream] = event.streams;
      
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(error => {
          addLog(`❌ Failed to play remote audio: ${error}`);
        });
        
        setAudioState(prev => ({ 
          ...prev, 
          remoteAudioEnabled: true 
        }));
        
        callbacks?.onRemoteAudioStream?.(remoteStream);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        addLog('🧊 Sending ICE candidate');
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          recipientId: recipientId,
          userId: currentUserId
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      addLog(`🔗 WebRTC connection state: ${peerConnection.connectionState}`);
      setAudioState(prev => ({ 
        ...prev, 
        connectionState: peerConnection.connectionState,
        remoteAudioEnabled: peerConnection.connectionState === 'connected'
      }));
    };

    peerConnection.oniceconnectionstatechange = () => {
      addLog(`🧊 ICE connection state: ${peerConnection.iceConnectionState}`);
    };

    peerConnection.onsignalingstatechange = () => {
      addLog(`📡 Signaling state: ${peerConnection.signalingState}`);
      setAudioState(prev => ({ 
        ...prev, 
        signalingState: peerConnection.signalingState
      }));
    };

    return peerConnection;
  }, [recipientId, currentUserId, addLog, callbacks]);

  // Setup socket listeners for WebRTC signaling
  const setupSocketListeners = useCallback((socket: any, peerConnection: RTCPeerConnection) => {
    // Handle incoming offer
    socket.on('offer', async (data: any) => {
      addLog(`📞 Received offer from: ${data.userId}`);
      if (data.userId !== currentUserId && peerConnectionRef.current) {
        try {
          addLog('📞 Setting remote description (offer)...');
          await peerConnectionRef.current.setRemoteDescription(data.offer);
          addLog('✅ Offer set successfully');
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          addLog('📤 Sending answer');
          socket.emit('answer', {
            answer: answer,
            recipientId: data.userId,
            userId: currentUserId
          });
        } catch (error) {
          addLog(`❌ Error handling offer: ${error}`);
        }
      }
    });

    // Handle incoming answer
    socket.on('answer', async (data: any) => {
      addLog(`📞 Received answer from: ${data.userId}`);
      if (data.userId !== currentUserId && peerConnectionRef.current) {
        try {
          addLog('📞 Setting remote description (answer)...');
          await peerConnectionRef.current.setRemoteDescription(data.answer);
          addLog('✅ Answer set successfully');
          
          // Clear the connection timeout since we got an answer
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
        } catch (error) {
          addLog(`❌ Error handling answer: ${error}`);
        }
      }
    });

    // Handle incoming ICE candidates
    socket.on('ice-candidate', async (data: any) => {
      addLog(`🧊 Received ICE candidate from: ${data.userId}`);
      if (data.userId !== currentUserId && peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
          addLog('✅ ICE candidate added successfully');
        } catch (error) {
          addLog(`❌ Error adding ICE candidate: ${error}`);
        }
      }
    });
  }, [currentUserId, addLog]);

  // Start voice monitoring
  const startVoiceMonitoring = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const monitorVoice = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      
      // Enhanced audio processing for smoother, lighter tone with better volume
      const smoothedAverage = average * 0.85; // Slightly increased intensity for better volume
      const audioLevel = Math.min(smoothedAverage / 128, 1);
      const isSpeaking = smoothedAverage > 8; // Lower threshold for more sensitive detection
      
      setAudioState(prev => ({
        ...prev,
        volume: Math.round(smoothedAverage),
        audioLevel: audioLevel,
        isSpeaking: isSpeaking
      }));

      // Only send voice data if WebRTC audio is properly connected
      if (socketRef.current && currentUserId && audioState.remoteAudioEnabled && audioState.connectionState === 'connected') {
        const voiceData = {
          userId: currentUserId,
          recipientId: recipientId,
          volume: Math.round(smoothedAverage),
          isSpeaking: isSpeaking,
          timestamp: Date.now(),
          webrtcConnected: true,
          connectionState: audioState.connectionState
        };
        
        addLog(`📤 Sending voice data (WebRTC connected): ${voiceData.volume}`);
        socketRef.current.emit('voiceData', voiceData);
      } else {
        // Don't send voice data if WebRTC is not connected
        if (audioState.connectionState !== 'connected') {
          addLog(`🔇 Not sending voice data - WebRTC not connected: ${audioState.connectionState}`);
        }
      }

      // Call callback for voice data updates
      callbacks?.onVoiceDataUpdate?.({
        audioLevel: audioLevel,
        volume: Math.round(smoothedAverage),
        isSpeaking: isSpeaking
      });

      animationFrameRef.current = requestAnimationFrame(monitorVoice);
    };

    monitorVoice();
  }, [callbacks]);

  // Stop voice monitoring
  const stopVoiceMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Enable WebRTC audio with mobile-specific handling
  const enableWebRTCAudio = useCallback(async () => {
    if (audioState.isEnabled) return;

    addLog('Enabling WebRTC audio...');
    
    // Mobile-specific user interaction handling
    if (isMobile) {
      addLog('📱 Mobile device - ensuring user interaction...');
      
      // Create a temporary audio context to trigger user interaction
      try {
        const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (tempAudioContext.state === 'suspended') {
          addLog('⚠️ Temporary audio context suspended - resuming...');
          await tempAudioContext.resume();
          addLog('✅ Temporary audio context resumed');
        }
        
        tempAudioContext.close();
        addLog('✅ User interaction confirmed');
      } catch (error) {
        addLog(`⚠️ User interaction handling failed: ${error}`);
      }
    }

    const audioInitialized = await initializeAudio();
    if (!audioInitialized) {
      addLog('❌ Failed to enable WebRTC audio: audio initialization failed');
      return false;
    }

    // Initialize peer connection
    const peerConnection = initializePeerConnection();
    if (!peerConnection) {
      addLog('❌ Failed to enable WebRTC audio: peer connection initialization failed');
      return false;
    }

    peerConnectionRef.current = peerConnection;

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Get socket connection
    const socket = await getSocket();
    socketRef.current = socket;

    // Determine caller/callee based on user ID comparison
    const isCaller = currentUserId > recipientId;
    addLog(`🎯 User ${currentUserId} is ${isCaller ? 'caller' : 'callee'}`);

    setAudioState(prev => ({ 
      ...prev, 
      isEnabled: true, 
      isCaller: isCaller,
      signalingState: 'new',
      connectionState: 'new'
    }));

    // Setup socket listeners for WebRTC signaling
    setupSocketListeners(socket, peerConnection);

    // Start voice monitoring
    startVoiceMonitoring();

    if (isCaller) {
      try {
        addLog('📞 Caller: Creating and sending offer');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        if (socketRef.current) {
          addLog('📤 Sending WebRTC offer');
          socketRef.current.emit('offer', {
            offer: offer,
            recipientId: recipientId,
            userId: currentUserId
          });
          
          // Set a timeout to retry if no answer is received
          connectionTimeoutRef.current = setTimeout(() => {
            if (peerConnection.signalingState !== 'stable') {
              addLog('⏰ Connection timeout - retrying offer');
              peerConnection.createOffer().then(newOffer => {
                peerConnection.setLocalDescription(newOffer);
                socketRef.current?.emit('offer', {
                  offer: newOffer,
                  recipientId: recipientId,
                  userId: currentUserId
                });
              }).catch(console.error);
            }
          }, 10000); // 10 second timeout
        }
      } catch (error) {
        addLog(`❌ Failed to create offer: ${error}`);
      }
    } else {
      addLog('📞 Callee: Waiting for offer');
    }

    addLog('✅ WebRTC audio enabled');
    return true;
  }, [audioState.isEnabled, initializeAudio, initializePeerConnection, setupSocketListeners, startVoiceMonitoring, currentUserId, recipientId, isMobile, addLog]);

  // Disable WebRTC audio
  const disableWebRTCAudio = useCallback(() => {
    addLog('Disabling WebRTC audio...');
    
    stopVoiceMonitoring();
    
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop());
      microphoneRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    localStreamRef.current = null;

    setAudioState(prev => ({ 
      ...prev, 
      isEnabled: false, 
      isMuted: false, 
      isSpeaking: false, 
      volume: 0, 
      audioLevel: 0,
      remoteAudioEnabled: false,
      remoteVolume: 0,
      signalingState: 'new',
      connectionState: 'new',
      error: null
    }));
    
    addLog('✅ WebRTC audio disabled');
  }, [stopVoiceMonitoring, addLog]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setAudioState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    addLog(`Audio ${audioState.isMuted ? 'unmuted' : 'muted'}`);
  }, [audioState.isMuted, addLog]);

  // Setup permission checking
  useEffect(() => {
    checkPermissions();
    permissionCheckRef.current = window.setInterval(checkPermissions, 2000);

    return () => {
      if (permissionCheckRef.current) {
        clearInterval(permissionCheckRef.current);
      }
    };
  }, [checkPermissions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableWebRTCAudio();
    };
  }, [disableWebRTCAudio]);

  return {
    audioState,
    remoteVoiceData,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute,
    peerConnection: peerConnectionRef.current,
    isMobile,
    isIOS,
    isAndroid,
    isSafari
  };
}
