"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useWebRTCAudio } from '@/src/hooks/use-webrtc-audio';
import { useMobileWebRTCAudio } from '@/src/hooks/use-mobile-webrtc-audio';

export default function VoiceDataConnectionTest() {
  const [isMobile, setIsMobile] = useState(false);
  const [voiceDataLogs, setVoiceDataLogs] = useState<string[]>([]);
  const [receivedVoiceData, setReceivedVoiceData] = useState<any[]>([]);
  
  // Generate test user IDs
  const currentUserId = 'test-user-1';
  const recipientId = 'test-user-2';

  // Detect mobile device
  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  // Use appropriate WebRTC hook
  const webRTCAudio = isMobile ? useMobileWebRTCAudio(currentUserId, recipientId, {
    onVoiceDataUpdate: (data) => {
      const log = `📤 Voice data sent: volume=${data.volume}, speaking=${data.isSpeaking}`;
      setVoiceDataLogs(prev => [...prev.slice(-9), log]);
    },
    onRemoteVoiceData: (data) => {
      const log = `📥 Voice data received: volume=${data.volume}, speaking=${data.isSpeaking}`;
      setVoiceDataLogs(prev => [...prev.slice(-9), log]);
      setReceivedVoiceData(prev => [...prev.slice(-4), { ...data, timestamp: Date.now() }]);
    },
    onError: (error) => {
      const log = `❌ Error: ${error}`;
      setVoiceDataLogs(prev => [...prev.slice(-9), log]);
    }
  }) : useWebRTCAudio(currentUserId, recipientId, {
    onVoiceDataUpdate: (data) => {
      const log = `📤 Voice data sent: volume=${data.volume}, speaking=${data.isSpeaking}`;
      setVoiceDataLogs(prev => [...prev.slice(-9), log]);
    },
    onRemoteVoiceData: (data) => {
      const log = `📥 Voice data received: volume=${data.volume}, speaking=${data.isSpeaking}`;
      setVoiceDataLogs(prev => [...prev.slice(-9), log]);
      setReceivedVoiceData(prev => [...prev.slice(-4), { ...data, timestamp: Date.now() }]);
    }
  });

  const {
    audioState,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute
  } = webRTCAudio;

  const getConnectionStatusIcon = () => {
    if (audioState.connectionState === 'connected') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (audioState.connectionState === 'connecting') {
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    if (audioState.connectionState === 'connected') {
      return 'text-green-400';
    } else if (audioState.connectionState === 'connecting') {
      return 'text-yellow-400';
    } else {
      return 'text-red-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              Voice Data Connection Test
            </CardTitle>
            <p className="text-gray-400 text-center text-sm">
              Test that voice data is only sent when WebRTC is properly connected
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* WebRTC Connection Status */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  {getConnectionStatusIcon()}
                  WebRTC Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Connection State:</span>
                      <span className={`font-semibold ${getConnectionStatusColor()}`}>
                        {audioState.connectionState}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Signaling State:</span>
                      <span className="text-white font-semibold">
                        {audioState.signalingState}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Remote Audio:</span>
                      <span className={`font-semibold ${audioState.remoteAudioEnabled ? 'text-green-400' : 'text-red-400'}`}>
                        {audioState.remoteAudioEnabled ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Role:</span>
                      <span className="text-white font-semibold">
                        {audioState.isCaller ? 'Caller' : 'Callee'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Device:</span>
                      <span className="text-white font-semibold">
                        {isMobile ? 'Mobile' : 'Desktop'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Audio Enabled:</span>
                      <span className={`font-semibold ${audioState.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                        {audioState.isEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>
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
                      onClick={enableWebRTCAudio}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Enable WebRTC Audio
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
                        onClick={disableWebRTCAudio}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <VolumeX className="w-4 h-4 mr-2" />
                        Disable
                      </Button>
                    </>
                  )}
                </div>

                {/* Audio Status */}
                {audioState.isEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Volume Level:</span>
                      <span className="text-white font-semibold">{audioState.volume}/128</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${audioState.audioLevel * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Speaking:</span>
                      <span className={`font-semibold ${audioState.isSpeaking ? 'text-green-400' : 'text-gray-400'}`}>
                        {audioState.isSpeaking ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice Data Logs */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Voice Data Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {voiceDataLogs.length === 0 ? (
                    <div className="text-gray-400 text-center">No voice data activity yet...</div>
                  ) : (
                    <div className="space-y-1">
                      {voiceDataLogs.map((log, index) => (
                        <div key={index} className="text-xs text-gray-300 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Received Voice Data */}
            {receivedVoiceData.length > 0 && (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Received Voice Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {receivedVoiceData.map((data, index) => (
                      <div key={index} className="bg-blue-900/30 border border-blue-700 rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-blue-200 font-semibold">Volume: {data.volume}</div>
                            <div className="text-blue-300">Speaking: {data.isSpeaking ? 'Yes' : 'No'}</div>
                          </div>
                          <div className="text-blue-400 text-xs">
                            {new Date(data.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Instructions */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg">Test Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2 text-sm">
                <p>🧪 <strong>How to Test:</strong></p>
                <p>1. <strong>Enable Audio:</strong> Click "Enable WebRTC Audio" button</p>
                <p>2. <strong>Check Connection:</strong> Wait for WebRTC connection to establish</p>
                <p>3. <strong>Speak:</strong> Talk into your microphone</p>
                <p>4. <strong>Observe Logs:</strong> Check if voice data is being sent</p>
                <p>5. <strong>Expected Behavior:</strong> Voice data should only be sent when connection state is "connected"</p>
                <p></p>
                <p>🔍 <strong>What to Look For:</strong></p>
                <p>• Voice data should NOT be sent when connection state is "new", "connecting", or "failed"</p>
                <p>• Voice data should ONLY be sent when connection state is "connected"</p>
                <p>• Server logs should show "WebRTC connected" when broadcasting voice data</p>
                <p>• Server logs should show "Not broadcasting voice data - WebRTC not connected" when not connected</p>
              </CardContent>
            </Card>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}







