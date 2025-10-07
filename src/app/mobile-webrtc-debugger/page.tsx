"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Smartphone, Monitor, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MobileWebRTCState {
  isEnabled: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  volume: number;
  audioLevel: number;
  error: string | null;
  permissionState: 'unknown' | 'granted' | 'denied' | 'prompt';
}

export default function MobileWebRTCDebugger() {
  const [isMobile, setIsMobile] = useState(false);
  const [audioState, setAudioState] = useState<MobileWebRTCState>({
    isEnabled: false,
    isMuted: false,
    isSpeaking: false,
    volume: 0,
    audioLevel: 0,
    error: null,
    permissionState: 'unknown'
  });
  
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: '',
    isSecureContext: false,
    hasGetUserMedia: false,
    hasWebRTC: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false
  });

  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const permissionCheckRef = useRef<number | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
    console.log(logMessage);
  }, []);

  useEffect(() => {
    // Detect mobile device and browser
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    const safari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const chrome = /Chrome/.test(navigator.userAgent);
    const firefox = /Firefox/.test(navigator.userAgent);

    setIsMobile(mobile);

    setBrowserInfo({
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext || location.protocol === 'https:',
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasWebRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
      isIOS: ios,
      isAndroid: android,
      isSafari: safari,
      isChrome: chrome,
      isFirefox: firefox
    });

    addLog(`Device detected: ${mobile ? 'Mobile' : 'Desktop'}`);
    addLog(`Browser: ${safari ? 'Safari' : chrome ? 'Chrome' : firefox ? 'Firefox' : 'Other'}`);
    addLog(`Platform: ${ios ? 'iOS' : android ? 'Android' : 'Other'}`);

    // Check permissions periodically
    checkPermissions();
    permissionCheckRef.current = window.setInterval(checkPermissions, 2000);

    return () => {
      if (permissionCheckRef.current) {
        clearInterval(permissionCheckRef.current);
      }
    };
  }, [addLog]);

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setAudioState(prev => ({ ...prev, permissionState: micPermission.state as any }));
        addLog(`Microphone permission: ${micPermission.state}`);
      }
    } catch (error) {
      addLog('Permission API not supported');
    }
  };

  const initializeAudioMobile = async (): Promise<boolean> => {
    try {
      addLog('Starting mobile audio initialization...');
      
      // Step 1: Check HTTPS requirement
      if (isMobile && !browserInfo.isSecureContext) {
        throw new Error('HTTPS is required for microphone access on mobile devices');
      }
      addLog('✅ HTTPS check passed');

      // Step 2: Check getUserMedia support
      if (!browserInfo.hasGetUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      addLog('✅ getUserMedia support confirmed');

      // Step 3: Create audio context first (mobile requirement)
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
          sampleRate: isMobile ? 16000 : 44100,
          channelCount: 1,
          // Mobile-specific constraints
          ...(browserInfo.isIOS && {
            sampleSize: 16,
            sampleRate: 16000
          }),
          ...(browserInfo.isAndroid && {
            sampleRate: 16000,
            channelCount: 1
          })
        } 
      };
      
      addLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      microphoneRef.current = stream;
      addLog('✅ Microphone access granted');

      // Step 6: Setup audio analysis
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = isMobile ? 128 : 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      addLog('✅ Audio analysis setup complete');

      setAudioState(prev => ({ ...prev, isEnabled: true, error: null }));
      startVoiceMonitoring();
      
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
      return false;
    }
  };

  const startVoiceMonitoring = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const monitorVoice = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
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
    addLog('User clicked enable audio button');
    
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
    
    const success = await initializeAudioMobile();
    if (!success) {
      addLog('❌ Failed to enable audio');
    }
  };

  const disableAudio = () => {
    addLog('Disabling audio...');
    
    stopVoiceMonitoring();
    
    if (microphoneRef.current) {
      microphoneRef.current.getTracks().forEach(track => track.stop());
      microphoneRef.current = null;
      addLog('✅ Microphone tracks stopped');
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      addLog('✅ Audio context closed');
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;

    setAudioState({
      isEnabled: false,
      isMuted: false,
      isSpeaking: false,
      volume: 0,
      audioLevel: 0,
      error: null,
      permissionState: 'unknown'
    });
    
    addLog('✅ Audio disabled');
  };

  const toggleMute = () => {
    setAudioState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    addLog(`Audio ${audioState.isMuted ? 'unmuted' : 'muted'}`);
  };

  const getPermissionIcon = () => {
    switch (audioState.permissionState) {
      case 'granted': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'denied': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'prompt': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl flex items-center justify-center gap-2">
              {isMobile ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
              Mobile WebRTC Debugger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Device Detection */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Device & Browser Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Device:</span>
                      <span className={`font-semibold ${isMobile ? 'text-blue-400' : 'text-green-400'}`}>
                        {isMobile ? 'Mobile' : 'Desktop'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Platform:</span>
                      <span className="font-semibold text-white">
                        {browserInfo.isIOS ? 'iOS' : browserInfo.isAndroid ? 'Android' : 'Other'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Browser:</span>
                      <span className="font-semibold text-white">
                        {browserInfo.isSafari ? 'Safari' : 
                         browserInfo.isChrome ? 'Chrome' : 
                         browserInfo.isFirefox ? 'Firefox' : 'Other'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">HTTPS:</span>
                      <span className={`font-semibold ${browserInfo.isSecureContext ? 'text-green-400' : 'text-red-400'}`}>
                        {browserInfo.isSecureContext ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">getUserMedia:</span>
                      <span className={`font-semibold ${browserInfo.hasGetUserMedia ? 'text-green-400' : 'text-red-400'}`}>
                        {browserInfo.hasGetUserMedia ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">WebRTC:</span>
                      <span className={`font-semibold ${browserInfo.hasWebRTC ? 'text-green-400' : 'text-red-400'}`}>
                        {browserInfo.hasWebRTC ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permission Status */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  {getPermissionIcon()}
                  Permission Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Microphone:</span>
                  <span className={`font-semibold ${
                    audioState.permissionState === 'granted' ? 'text-green-400' :
                    audioState.permissionState === 'denied' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {audioState.permissionState === 'granted' ? 'Granted' :
                     audioState.permissionState === 'denied' ? 'Denied' : 'Unknown'}
                  </span>
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
                      disabled={!browserInfo.hasGetUserMedia || (isMobile && !browserInfo.isSecureContext)}
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

            {/* Debug Logs */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Debug Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {debugLogs.length === 0 ? (
                    <div className="text-gray-400 text-center">No logs yet...</div>
                  ) : (
                    <div className="space-y-1">
                      {debugLogs.map((log, index) => (
                        <div key={index} className="text-xs text-gray-300 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Instructions */}
            {isMobile && (
              <Card className="bg-blue-900/30 border-blue-700">
                <CardHeader>
                  <CardTitle className="text-blue-200 text-lg">Mobile Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-100 space-y-2 text-sm">
                  <p>📱 <strong>Common Mobile Issues:</strong></p>
                  <p>• <strong>HTTPS Required:</strong> Use https:// not http://</p>
                  <p>• <strong>User Interaction:</strong> Must tap button to enable audio</p>
                  <p>• <strong>Permission Denied:</strong> Check browser settings</p>
                  <p>• <strong>iOS Safari:</strong> May require iOS 11+ and Safari 11+</p>
                  <p>• <strong>Android Chrome:</strong> May require Chrome 53+</p>
                  <p>• <strong>Private Mode:</strong> Disable private/incognito browsing</p>
                  <p>• <strong>Multiple Tabs:</strong> Close other tabs using microphone</p>
                  <p>• <strong>Browser Update:</strong> Update to latest browser version</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







