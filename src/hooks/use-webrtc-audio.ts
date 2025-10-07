"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '@/src/lib/socket';

export interface WebRTCAudioState {
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
}

export interface WebRTCAudioCallbacks {
  onVoiceDataUpdate: (data: { volume: number; isSpeaking: boolean; audioLevel: number }) => void;
  onRemoteVoiceData: (data: { userId: string; volume: number; isSpeaking: boolean }) => void;
  onRemoteAudioStream: (stream: MediaStream) => void;
}

export function useWebRTCAudio(
  recipientId: string,
  currentUserId: string,
  callbacks?: WebRTCAudioCallbacks
) {
  const [audioState, setAudioState] = useState<WebRTCAudioState>({
    isEnabled: false,
    isMuted: false,
    isSpeaking: false,
    volume: 0,
    audioLevel: 0,
    remoteAudioEnabled: false,
    remoteVolume: 0,
    isCaller: false,
    signalingState: 'new',
    connectionState: 'new'
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

  // Initialize audio context and microphone
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Starting WebRTC audio initialization...');
      
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('📱 Mobile device detected:', isMobile);
      
      // Check if HTTPS is required (mobile browsers require HTTPS for getUserMedia)
      const isSecureContext = window.isSecureContext || location.protocol === 'https:';
      console.log('🔒 Secure context:', isSecureContext);
      
      if (!isSecureContext && isMobile) {
        throw new Error('HTTPS is required for microphone access on mobile devices');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Request microphone access with enhanced audio processing
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
          // Browser-specific enhancements
          ...(isMobile && {
            sampleSize: 16,
            sampleRate: 16000
          })
        } 
      };
      
      console.log('🎤 Requesting microphone access with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      microphoneRef.current = stream;
      localStreamRef.current = stream;
      console.log('✅ Microphone access granted');

      // Create audio context with mobile-friendly settings
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: isMobile ? 16000 : 44100,
        latencyHint: isMobile ? 'interactive' : 'balanced'
      });
      
      // Resume audio context if suspended (required on mobile)
      if (audioContextRef.current.state === 'suspended') {
        console.log('🎤 Resuming suspended audio context...');
        await audioContextRef.current.resume();
      }
      
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
      
      // Create analyser for volume detection with enhanced smoothing
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = isMobile ? 128 : 256; // Smaller FFT for mobile
      analyserRef.current.smoothingTimeConstant = 0.9; // Increased smoothing for softer effect
      analyserRef.current.minDecibels = -90; // Lower threshold for softer detection
      analyserRef.current.maxDecibels = -10; // Reduced max for lighter tone
      
      gainNode.connect(analyserRef.current);
      
      // Create data array for analysis
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Create audio element for remote audio with mobile-friendly settings
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

      console.log('🎤 WebRTC Audio initialized successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize WebRTC audio:', error);
      
      // Provide specific error messages for common mobile issues
      if (error.name === 'NotAllowedError') {
        console.error('❌ Microphone permission denied by user');
      } else if (error.name === 'NotFoundError') {
        console.error('❌ No microphone found on device');
      } else if (error.name === 'NotSupportedError') {
        console.error('❌ WebRTC not supported on this device');
      } else if (error.name === 'SecurityError') {
        console.error('❌ Security error - HTTPS required for microphone access');
      }
      
      return false;
    }
  }, []);

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    // Handle incoming audio stream
    peerConnection.ontrack = (event) => {
      console.log('🎧 Received remote audio stream');
      const remoteStream = event.streams[0];
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => {
          console.log('Audio autoplay prevented:', e);
          // Try to play after user interaction
          document.addEventListener('click', () => {
            remoteAudioRef.current?.play().catch(console.log);
          }, { once: true });
        });
      }

      // Call callback if provided
      if (callbacks?.onRemoteAudioStream) {
        callbacks.onRemoteAudioStream(remoteStream);
      }

      setAudioState(prev => ({ ...prev, remoteAudioEnabled: true }));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('📤 Sending ICE candidate');
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          recipientId: recipientId,
          userId: currentUserId
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 WebRTC connection state:', peerConnection.connectionState);
      setAudioState(prev => ({ 
        ...prev, 
        connectionState: peerConnection.connectionState,
        remoteAudioEnabled: peerConnection.connectionState === 'connected'
      }));
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
    };

    // Handle signaling state changes
    peerConnection.onsignalingstatechange = () => {
      console.log('📡 Signaling state:', peerConnection.signalingState);
      setAudioState(prev => ({ 
        ...prev, 
        signalingState: peerConnection.signalingState
      }));
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [recipientId, currentUserId, callbacks]);

  // Start voice monitoring
  const startVoiceMonitoring = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const monitorVoice = () => {
      if (!analyserRef.current || !dataArrayRef.current || audioState.isMuted) {
        animationFrameRef.current = requestAnimationFrame(monitorVoice);
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      
      // Enhanced audio processing for smoother, lighter tone with better volume
      const smoothedAverage = average * 0.85; // Slightly increased intensity for better volume
      const volume = Math.round(smoothedAverage);
      const audioLevel = Math.min(volume / 128, 1); // Normalize to 0-1
      
      // Lower threshold for speaking detection with smoothing
      const isSpeaking = volume > 8; // Reduced threshold for more sensitive detection

      // Update audio state
      setAudioState(prev => ({
        ...prev,
        volume,
        audioLevel,
        isSpeaking
      }));

      // Only send voice data if WebRTC audio is properly connected
      if (socketRef.current && currentUserId && audioState.remoteAudioEnabled && audioState.connectionState === 'connected') {
        const voiceData = {
          userId: currentUserId,
          recipientId: recipientId,
          volume: volume,
          isSpeaking: isSpeaking,
          timestamp: Date.now(),
          webrtcConnected: true,
          connectionState: audioState.connectionState
        };
        
        console.log('📤 Sending voice data (WebRTC connected):', voiceData);
        socketRef.current.emit('voiceData', voiceData);
      } else {
        // Don't send voice data if WebRTC is not connected
        if (audioState.connectionState !== 'connected') {
          console.log('🔇 Not sending voice data - WebRTC not connected:', {
            connectionState: audioState.connectionState,
            remoteAudioEnabled: audioState.remoteAudioEnabled
          });
        }
      }

      // Call callback if provided
      if (callbacks?.onVoiceDataUpdate) {
        callbacks.onVoiceDataUpdate({ volume, isSpeaking, audioLevel });
      }

      animationFrameRef.current = requestAnimationFrame(monitorVoice);
    };

    monitorVoice();
  }, [audioState.isMuted, recipientId, currentUserId, callbacks]);

  // Stop voice monitoring
  const stopVoiceMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Enable WebRTC audio
  const enableWebRTCAudio = useCallback(async () => {
    if (audioState.isEnabled) return;

    console.log('🎤 Enabling WebRTC audio...');
    
    // Check if we're on mobile and require user interaction
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('📱 Mobile device detected - ensuring user interaction...');
      
      // On mobile, we need to ensure the audio context is resumed after user interaction
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('🎤 Audio context suspended - will resume after user interaction');
      }
    }

    const audioInitialized = await initializeAudio();
    if (!audioInitialized) {
      console.error('❌ Failed to enable WebRTC audio: audio initialization failed');
      
      // Provide helpful error message for mobile users
      if (isMobile) {
        console.error('📱 Mobile users: Make sure to allow microphone permissions and use HTTPS');
      }
      
      return false;
    }

    // Initialize peer connection
    const peerConnection = initializePeerConnection();
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Determine caller/callee based on user ID comparison
    // This ensures only one participant creates the offer
    const isCaller = currentUserId > recipientId;
    console.log(`🎯 User ${currentUserId} is ${isCaller ? 'caller' : 'callee'}`);

    setAudioState(prev => ({ 
      ...prev, 
      isEnabled: true, 
      isCaller: isCaller,
      signalingState: 'new',
      connectionState: 'new'
    }));

    // Wait a bit for the peer connection to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Only the caller creates and sends the offer
    if (isCaller) {
      try {
        console.log('📞 Caller: Creating and sending offer');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        if (socketRef.current) {
          console.log('📤 Sending WebRTC offer');
          socketRef.current.emit('offer', {
            offer: offer,
            recipientId: recipientId,
            userId: currentUserId
          });
          
          // Set a timeout to retry if no answer is received
          connectionTimeoutRef.current = setTimeout(() => {
            if (peerConnection.signalingState !== 'stable') {
              console.log('⏰ Connection timeout - retrying offer');
              // Retry the offer
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
        console.error('❌ Failed to create offer:', error);
      }
    } else {
      console.log('📞 Callee: Waiting for offer');
    }

    startVoiceMonitoring();
    
    console.log('🎤 WebRTC Audio enabled');
    return true;
  }, [audioState.isEnabled, initializeAudio, initializePeerConnection, startVoiceMonitoring, recipientId, currentUserId]);

  // Disable WebRTC audio
  const disableWebRTCAudio = useCallback(() => {
    stopVoiceMonitoring();
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop());
      microphoneRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
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
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;

    setAudioState(prev => ({ 
      ...prev, 
      isEnabled: false, 
      isMuted: false, 
      isSpeaking: false, 
      volume: 0, 
      audioLevel: 0,
      remoteAudioEnabled: false,
      remoteVolume: 0,
      isCaller: false,
      signalingState: 'new',
      connectionState: 'new'
    }));
    
    console.log('🎤 WebRTC Audio disabled');
  }, [stopVoiceMonitoring]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setAudioState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    
    // Mute/unmute local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = audioState.isMuted;
      });
    }
  }, [audioState.isMuted]);

  // Setup socket listeners
  useEffect(() => {
    const setupSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;

        // Listen for remote voice data
        socket.on('voiceData', (data: any) => {
          console.log('🎤 Received voice data:', data, 'Current user:', currentUserId, 'Recipient:', recipientId);
          
          // Accept voice data from any user except self
          if (data.userId !== currentUserId) {
            console.log('✅ Processing remote voice data from:', data.userId);
            
            setRemoteVoiceData(prev => ({
              ...prev,
              [data.userId]: {
                volume: data.volume,
                isSpeaking: data.isSpeaking
              }
            }));

            // Update remote volume
            setAudioState(prev => ({ ...prev, remoteVolume: data.volume }));

            // Call callback if provided
            if (callbacks?.onRemoteVoiceData) {
              callbacks.onRemoteVoiceData({
                userId: data.userId,
                volume: data.volume,
                isSpeaking: data.isSpeaking
              });
            }
          } else {
            console.log('❌ Ignoring own voice data');
          }
        });

        // Listen for WebRTC signaling
        socket.on('offer', async (data: any) => {
          console.log('📞 Received offer from:', data.userId);
          console.log('📞 Offer data:', data);
          if (data.userId !== currentUserId && peerConnectionRef.current) {
            try {
              console.log('📞 Setting remote description...');
              await peerConnectionRef.current.setRemoteDescription(data.offer);
              console.log('📞 Creating answer...');
              const answer = await peerConnectionRef.current.createAnswer();
              console.log('📞 Setting local description...');
              await peerConnectionRef.current.setLocalDescription(answer);
              
              console.log('📤 Sending answer to:', data.userId);
              socket.emit('answer', {
                answer: answer,
                recipientId: data.userId,
                userId: currentUserId
              });
              console.log('✅ Answer sent successfully');
            } catch (error) {
              console.error('❌ Error handling offer:', error);
            }
          } else {
            console.log('❌ Ignoring offer - same user or no peer connection');
          }
        });

        socket.on('answer', async (data: any) => {
          console.log('📞 Received answer from:', data.userId);
          console.log('📞 Answer data:', data);
          if (data.userId !== currentUserId && peerConnectionRef.current) {
            try {
              console.log('📞 Setting remote description (answer)...');
              await peerConnectionRef.current.setRemoteDescription(data.answer);
              console.log('✅ Answer set successfully');
              
              // Clear the connection timeout since we got an answer
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
              }
            } catch (error) {
              console.error('❌ Error handling answer:', error);
            }
          } else {
            console.log('❌ Ignoring answer - same user or no peer connection');
          }
        });

        socket.on('ice-candidate', async (data: any) => {
          console.log('🧊 Received ICE candidate from:', data.userId);
          if (data.userId !== currentUserId && peerConnectionRef.current && data.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(data.candidate);
              console.log('✅ ICE candidate added successfully');
            } catch (error) {
              console.error('❌ Error adding ICE candidate:', error);
            }
          }
        });

        return () => {
          socket.off('voiceData');
          socket.off('offer');
          socket.off('answer');
          socket.off('ice-candidate');
        };
      } catch (error) {
        console.error('❌ Failed to setup socket for WebRTC audio:', error);
      }
    };

    setupSocket();
  }, [currentUserId, recipientId, callbacks]);

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
    peerConnection: peerConnectionRef.current
  };
}
