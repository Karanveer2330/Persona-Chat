"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Smartphone, Monitor } from 'lucide-react';

export default function MobileWebRTCTest() {
  const [isMobile, setIsMobile] = useState(false);
  const [audioState, setAudioState] = useState({
    isEnabled: false,
    isMuted: false,
    isSpeaking: false,
    volume: 0,
    audioLevel: 0,
    error: null as string | null
  });
  
  const [permissions, setPermissions] = useState({
    microphone: 'unknown' as 'granted' | 'denied' | 'unknown',
    camera: 'unknown' as 'granted' | 'denied' | 'unknown'
  });
  
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: '',
    isSecureContext: false,
    hasGetUserMedia: false,
    hasWebRTC: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Detect mobile device
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Check browser capabilities
    setBrowserInfo({
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext || location.protocol === 'https:',
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasWebRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection)
    });

    // Check permissions
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissions(prev => ({ ...prev, microphone: micPermission.state as any }));
        
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissions(prev => ({ ...prev, camera: cameraPermission.state as any }));
      }
    } catch (error) {
      console.log('Permission API not supported');
    }
  };

  const initializeAudio = async () => {
    try {
      console.log('🎤 Starting mobile audio initialization...');
      
      // Check HTTPS requirement for mobile
      if (isMobile && !browserInfo.isSecureContext) {
        throw new Error('HTTPS is required for microphone access on mobile devices');
      }

      // Request microphone access with mobile-friendly constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: isMobile ? 16000 : 44100,
          channelCount: 1
        } 
      };
      
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      microphoneRef.current = stream;
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
      
      // Create analyser for volume detection
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = isMobile ? 128 : 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      source.connect(analyserRef.current);
      
      // Create data array for analysis
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      setAudioState(prev => ({ ...prev, isEnabled: true, error: null }));
      startVoiceMonitoring();
      
      console.log('🎤 Mobile audio initialized successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize mobile audio:', error);
      
      let errorMessage = 'Unknown error';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied by user';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found on device';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'WebRTC not supported on this device';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - HTTPS required for microphone access';
      } else {
        errorMessage = error.message || error.toString();
      }
      
      setAudioState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  };

  const startVoiceMonitoring = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const monitorVoice = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      
      // Calculate audio level (0-1)
      const audioLevel = Math.min(average / 128, 1);
      const isSpeaking = audioLevel > 0.1;
      
      setAudioState(prev => ({
        ...prev,
        volume: Math.round(average),
        audioLevel: audioLevel,
        isSpeaking: isSpeaking
      }));

      animationFrameRef.current = requestAnimationFrame(monitorVoice);
    };

    monitorVoice();
  };

  const stopVoiceMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const enableAudio = async () => {
    const success = await initializeAudio();
    if (!success) {
      console.error('Failed to enable audio');
    }
  };

  const disableAudio = () => {
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

    setAudioState({
      isEnabled: false,
      isMuted: false,
      isSpeaking: false,
      volume: 0,
      audioLevel: 0,
      error: null
    });
  };

  const toggleMute = () => {
    setAudioState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl flex items-center justify-center gap-2">
              {isMobile ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
              Mobile WebRTC Audio Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Device Detection */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Device Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Device Type:</span>
                    <span className={`font-semibold ${isMobile ? 'text-blue-400' : 'text-green-400'}`}>
                      {isMobile ? 'Mobile' : 'Desktop'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Secure Context:</span>
                    <span className={`font-semibold ${browserInfo.isSecureContext ? 'text-green-400' : 'text-red-400'}`}>
                      {browserInfo.isSecureContext ? 'Yes (HTTPS)' : 'No (HTTP)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">getUserMedia:</span>
                    <span className={`font-semibold ${browserInfo.hasGetUserMedia ? 'text-green-400' : 'text-red-400'}`}>
                      {browserInfo.hasGetUserMedia ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">WebRTC:</span>
                    <span className={`font-semibold ${browserInfo.hasWebRTC ? 'text-green-400' : 'text-red-400'}`}>
                      {browserInfo.hasWebRTC ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Microphone:</span>
                    <span className={`font-semibold ${
                      permissions.microphone === 'granted' ? 'text-green-400' :
                      permissions.microphone === 'denied' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {permissions.microphone === 'granted' ? 'Granted' :
                       permissions.microphone === 'denied' ? 'Denied' : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Camera:</span>
                    <span className={`font-semibold ${
                      permissions.camera === 'granted' ? 'text-green-400' :
                      permissions.camera === 'denied' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {permissions.camera === 'granted' ? 'Granted' :
                       permissions.camera === 'denied' ? 'Denied' : 'Unknown'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio Controls */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Audio Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center space-x-4">
                  {!audioState.isEnabled ? (
                    <Button
                      onClick={enableAudio}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!browserInfo.hasGetUserMedia || (!isMobile && !browserInfo.isSecureContext)}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Enable Audio
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={toggleMute}
                        className={`${
                          audioState.isMuted 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                      >
                        {audioState.isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {audioState.isMuted ? 'Unmute' : 'Mute'}
                      </Button>
                      <Button
                        onClick={disableAudio}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <VolumeX className="w-4 h-4 mr-2" />
                        Disable
                      </Button>
                    </>
                  )}
                </div>

                {audioState.error && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <h3 className="text-red-200 font-semibold mb-2">Error:</h3>
                    <p className="text-red-100 text-sm">{audioState.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audio Status */}
            {audioState.isEnabled && (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Audio Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Volume Level */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Volume Level:</span>
                        <span className="text-white font-semibold">{audioState.volume}/128</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${audioState.audioLevel * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Speaking Indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Speaking:</span>
                      <div className={`flex items-center space-x-2 ${
                        audioState.isSpeaking ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          audioState.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm font-semibold">
                          {audioState.isSpeaking ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    {/* Mute Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Muted:</span>
                      <div className={`flex items-center space-x-2 ${
                        audioState.isMuted ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {audioState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span className="text-sm font-semibold">
                          {audioState.isMuted ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile Instructions */}
            {isMobile && (
              <Card className="bg-blue-900/30 border-blue-700">
                <CardHeader>
                  <CardTitle className="text-blue-200 text-lg">Mobile Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-100 space-y-2 text-sm">
                  <p>📱 <strong>Mobile Requirements:</strong></p>
                  <p>• Use HTTPS (secure connection)</p>
                  <p>• Allow microphone permissions when prompted</p>
                  <p>• Tap "Enable Audio" to start microphone access</p>
                  <p>• Make sure you're not in a private/incognito mode</p>
                  <p>• Some browsers may require user interaction first</p>
                  <p>• Check browser settings if permissions are denied</p>
                </CardContent>
              </Card>
            )}

            {/* Browser Info */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Browser Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-400 font-mono break-all">
                  {browserInfo.userAgent}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







