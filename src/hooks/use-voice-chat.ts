"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '@/src/lib/socket';

export interface VoiceChatState {
  isEnabled: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  volume: number;
  audioLevel: number;
}

export interface VoiceChatCallbacks {
  onVoiceDataUpdate: (data: { volume: number; isSpeaking: boolean; audioLevel: number }) => void;
  onRemoteVoiceData: (data: { userId: string; volume: number; isSpeaking: boolean }) => void;
}

export function useVoiceChat(
  recipientId: string,
  currentUserId: string,
  callbacks?: VoiceChatCallbacks
) {
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isEnabled: false,
    isMuted: false,
    isSpeaking: false,
    volume: 0,
    audioLevel: 0
  });

  const [remoteVoiceData, setRemoteVoiceData] = useState<{ [userId: string]: { volume: number; isSpeaking: boolean } }>({});

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  // Initialize audio context and microphone
  const initializeAudio = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      microphoneRef.current = stream;

      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create analyser for volume detection
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      source.connect(analyserRef.current);
      
      // Create data array for analysis
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      console.log('🎤 Audio initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      return false;
    }
  }, []);

  // Start voice monitoring
  const startVoiceMonitoring = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const monitorVoice = () => {
      if (!analyserRef.current || !dataArrayRef.current || voiceState.isMuted) {
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
      const volume = Math.round(average);
      const audioLevel = Math.min(volume / 128, 1); // Normalize to 0-1
      
      const isSpeaking = volume > 10; // Threshold for speaking detection

      // Update voice state
      setVoiceState(prev => ({
        ...prev,
        volume,
        audioLevel,
        isSpeaking
      }));

      // Send voice data to server
      if (socketRef.current && currentUserId) {
        const voiceData = {
          userId: currentUserId,
          recipientId: recipientId, // Keep for compatibility but server will broadcast to all
          volume: volume,
          isSpeaking: isSpeaking,
          timestamp: Date.now()
        };
        
        console.log('📤 Sending voice data:', voiceData);
        socketRef.current.emit('voiceData', voiceData);
      } else {
        console.log('❌ Cannot send voice data:', {
          hasSocket: !!socketRef.current,
          hasUserId: !!currentUserId,
          socketConnected: socketRef.current?.connected
        });
      }

      // Call callback if provided
      if (callbacks?.onVoiceDataUpdate) {
        callbacks.onVoiceDataUpdate({ volume, isSpeaking, audioLevel });
      }

      animationFrameRef.current = requestAnimationFrame(monitorVoice);
    };

    monitorVoice();
  }, [voiceState.isMuted, recipientId, currentUserId, callbacks]);

  // Stop voice monitoring
  const stopVoiceMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Enable voice chat
  const enableVoiceChat = useCallback(async () => {
    if (voiceState.isEnabled) return;

    const audioInitialized = await initializeAudio();
    if (!audioInitialized) {
      console.error('❌ Failed to enable voice chat: audio initialization failed');
      return false;
    }

    setVoiceState(prev => ({ ...prev, isEnabled: true }));
    startVoiceMonitoring();
    
    console.log('🎤 Voice chat enabled');
    return true;
  }, [voiceState.isEnabled, initializeAudio, startVoiceMonitoring]);

  // Disable voice chat
  const disableVoiceChat = useCallback(() => {
    stopVoiceMonitoring();
    
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop());
      microphoneRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;

    setVoiceState(prev => ({ 
      ...prev, 
      isEnabled: false, 
      isMuted: false, 
      isSpeaking: false, 
      volume: 0, 
      audioLevel: 0 
    }));
    
    console.log('🎤 Voice chat disabled');
  }, [stopVoiceMonitoring]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

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
          // In video calls, we want to receive voice data from all participants
          if (data.userId !== currentUserId) {
            console.log('✅ Processing remote voice data from:', data.userId);
            
            setRemoteVoiceData(prev => ({
              ...prev,
              [data.userId]: {
                volume: data.volume,
                isSpeaking: data.isSpeaking
              }
            }));

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

        return () => {
          socket.off('voiceData');
        };
      } catch (error) {
        console.error('❌ Failed to setup socket for voice chat:', error);
      }
    };

    setupSocket();
  }, [currentUserId, recipientId, callbacks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableVoiceChat();
    };
  }, [disableVoiceChat]);

  return {
    voiceState,
    remoteVoiceData,
    enableVoiceChat,
    disableVoiceChat,
    toggleMute
  };
}
