"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff } from 'lucide-react';
import { getSocket } from '@/src/lib/socket';

export default function VoiceChatDebug() {
  const [socket, setSocket] = useState<any>(null);
  const [voiceData, setVoiceData] = useState<any[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphone, setMicrophone] = useState<MediaStream | null>(null);
  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userId] = useState(() => 'debug-user-' + Date.now());

  useEffect(() => {
    const initSocket = async () => {
      try {
        const socketInstance = await getSocket();
        setSocket(socketInstance);

        // Listen for voice data
        socketInstance.on('voiceData', (data: any) => {
          console.log('🔍 DEBUG: Received voice data:', data);
          setVoiceData(prev => [...prev.slice(-9), { ...data, receivedAt: Date.now() }]);
        });

        // Listen for connection events
        socketInstance.on('connect', () => {
          console.log('🔍 DEBUG: Socket connected:', socketInstance.id);
        });

        socketInstance.on('disconnect', () => {
          console.log('🔍 DEBUG: Socket disconnected');
        });

      } catch (error) {
        console.error('🔍 DEBUG: Socket initialization failed:', error);
      }
    };

    initSocket();
  }, []);

  const enableVoiceChat = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setMicrophone(stream);

      // Create audio context
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      
      const source = ctx.createMediaStreamSource(stream);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      setIsEnabled(true);
      startVoiceMonitoring();
      
      console.log('🔍 DEBUG: Voice chat enabled');
    } catch (error) {
      console.error('🔍 DEBUG: Failed to enable voice chat:', error);
    }
  };

  const disableVoiceChat = () => {
    if (microphone) {
      microphone.getTracks().forEach(track => track.stop());
      setMicrophone(null);
    }
    
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    
    setAnalyser(null);
    setIsEnabled(false);
    setVolume(0);
    setIsSpeaking(false);
    
    console.log('🔍 DEBUG: Voice chat disabled');
  };

  const startVoiceMonitoring = () => {
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const monitor = () => {
      if (!analyser || !isEnabled) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const currentVolume = Math.round(average);
      const currentIsSpeaking = currentVolume > 10;

      setVolume(currentVolume);
      setIsSpeaking(currentIsSpeaking);

      // Send voice data
      if (socket && socket.connected) {
        const voiceData = {
          userId: userId,
          recipientId: 'debug-recipient',
          volume: currentVolume,
          isSpeaking: currentIsSpeaking,
          timestamp: Date.now()
        };
        
        console.log('🔍 DEBUG: Sending voice data:', voiceData);
        socket.emit('voiceData', voiceData);
      }

      requestAnimationFrame(monitor);
    };

    monitor();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              Voice Chat Debug Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Controls */}
            <div className="flex justify-center space-x-4">
              {!isEnabled ? (
                <Button
                  onClick={enableVoiceChat}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Enable Voice Chat
                </Button>
              ) : (
                <Button
                  onClick={disableVoiceChat}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  <MicOff className="w-5 h-5 mr-2" />
                  Disable Voice Chat
                </Button>
              )}
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Socket Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Connected:</span>
                      <span className={socket?.connected ? 'text-green-400' : 'text-red-400'}>
                        {socket?.connected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Socket ID:</span>
                      <span className="text-white font-mono text-xs">
                        {socket?.id || 'Not connected'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">User ID:</span>
                      <span className="text-white font-mono text-xs">{userId}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Voice Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Enabled:</span>
                      <span className={isEnabled ? 'text-green-400' : 'text-red-400'}>
                        {isEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Speaking:</span>
                      <span className={isSpeaking ? 'text-green-400' : 'text-gray-400'}>
                        {isSpeaking ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Volume:</span>
                      <span className="text-white">{volume}/128</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-100 ${
                          isSpeaking ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                        style={{ width: `${Math.min(volume / 128 * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Audio Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Context:</span>
                      <span className={audioContext ? 'text-green-400' : 'text-red-400'}>
                        {audioContext ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Analyser:</span>
                      <span className={analyser ? 'text-green-400' : 'text-red-400'}>
                        {analyser ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Microphone:</span>
                      <span className={microphone ? 'text-green-400' : 'text-red-400'}>
                        {microphone ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Voice Data Log */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Voice Data Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {voiceData.length === 0 ? (
                    <div className="text-gray-400 text-center py-4">
                      No voice data received yet
                    </div>
                  ) : (
                    voiceData.map((data, index) => (
                      <div key={index} className="bg-gray-800/50 rounded p-2 text-xs font-mono">
                        <div className="text-blue-400">
                          Received at: {new Date(data.receivedAt).toLocaleTimeString()}
                        </div>
                        <div className="text-white">
                          User: {data.userId} | Volume: {data.volume} | Speaking: {data.isSpeaking ? 'Yes' : 'No'}
                        </div>
                        <div className="text-gray-400">
                          Recipient: {data.recipientId} | Timestamp: {data.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg">Debug Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2">
                <p>1. Open this page in two different browser tabs/windows</p>
                <p>2. Enable voice chat in both tabs</p>
                <p>3. Speak into your microphone in one tab</p>
                <p>4. Check if voice data appears in the "Voice Data Log" of the other tab</p>
                <p>5. Check browser console for detailed logs</p>
                <p>6. Check server console for voice data transmission logs</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}








