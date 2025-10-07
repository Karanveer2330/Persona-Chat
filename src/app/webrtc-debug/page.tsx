"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useWebRTCAudio } from '@/src/hooks/use-webrtc-audio';

export default function WebRTCDebug() {
  const [testUserId] = useState(() => 'debug-user-' + Date.now());
  const [testRecipientId] = useState(() => 'debug-recipient-' + Date.now());
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLogs(prev => [...prev.slice(-19), `${timestamp}: ${message}`]);
  };

  const {
    audioState,
    remoteVoiceData,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute,
    peerConnection
  } = useWebRTCAudio(testRecipientId, testUserId, {
    onVoiceDataUpdate: (data) => {
      addLog(`Voice data update: volume=${data.volume}, speaking=${data.isSpeaking}`);
    },
    onRemoteVoiceData: (data) => {
      addLog(`Remote voice data: user=${data.userId}, volume=${data.volume}, speaking=${data.isSpeaking}`);
    },
    onRemoteAudioStream: (stream) => {
      addLog(`🎧 Remote audio stream received!`);
    }
  });

  // Monitor peer connection state
  useEffect(() => {
    if (peerConnection) {
      const logConnectionState = () => {
        addLog(`WebRTC connection state: ${peerConnection.connectionState}`);
      };
      
      const logIceState = () => {
        addLog(`ICE connection state: ${peerConnection.iceConnectionState}`);
      };

      peerConnection.addEventListener('connectionstatechange', logConnectionState);
      peerConnection.addEventListener('iceconnectionstatechange', logIceState);

      return () => {
        peerConnection.removeEventListener('connectionstatechange', logConnectionState);
        peerConnection.removeEventListener('iceconnectionstatechange', logIceState);
      };
    }
  }, [peerConnection]);

  const clearLogs = () => {
    setConnectionLogs([]);
  };

  const retryConnection = async () => {
    addLog('🔄 Retrying WebRTC connection...');
    disableWebRTCAudio();
    await new Promise(resolve => setTimeout(resolve, 1000));
    enableWebRTCAudio();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              WebRTC Connection Debug Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Controls */}
            <div className="flex justify-center space-x-4">
              {!audioState.isEnabled ? (
                <Button
                  onClick={enableWebRTCAudio}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Enable WebRTC Audio
                </Button>
              ) : (
                <div className="flex space-x-4">
                  <Button
                    onClick={toggleMute}
                    className={`${
                      audioState.isMuted 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                    size="lg"
                  >
                    {audioState.isMuted ? (
                      <MicOff className="w-5 h-5 mr-2" />
                    ) : (
                      <Mic className="w-5 h-5 mr-2" />
                    )}
                    {audioState.isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button
                    onClick={retryConnection}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    size="lg"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Retry Connection
                  </Button>
                  <Button
                    onClick={disableWebRTCAudio}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    <VolumeX className="w-5 h-5 mr-2" />
                    Disable Audio
                  </Button>
                </div>
              )}
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Local Audio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Enabled:</span>
                    <span className={audioState.isEnabled ? 'text-green-400' : 'text-red-400'}>
                      {audioState.isEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Muted:</span>
                    <span className={audioState.isMuted ? 'text-red-400' : 'text-green-400'}>
                      {audioState.isMuted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Speaking:</span>
                    <span className={audioState.isSpeaking ? 'text-green-400' : 'text-gray-400'}>
                      {audioState.isSpeaking ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Volume:</span>
                    <span className="text-white">{audioState.volume}/128</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Remote Audio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Connected:</span>
                    <span className={audioState.remoteAudioEnabled ? 'text-green-400' : 'text-red-400'}>
                      {audioState.remoteAudioEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Remote Volume:</span>
                    <span className="text-white">{audioState.remoteVolume}/128</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Users:</span>
                    <span className="text-white">{Object.keys(remoteVoiceData).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Speaking:</span>
                    <span className={Object.values(remoteVoiceData).some(data => data.isSpeaking) ? 'text-blue-400' : 'text-gray-400'}>
                      {Object.values(remoteVoiceData).some(data => data.isSpeaking) ? 'Yes' : 'No'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">WebRTC Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Connection:</span>
                    <span className={peerConnection?.connectionState === 'connected' ? 'text-green-400' : 'text-red-400'}>
                      {peerConnection?.connectionState || 'Not initialized'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">ICE State:</span>
                    <span className={peerConnection?.iceConnectionState === 'connected' ? 'text-green-400' : 'text-yellow-400'}>
                      {peerConnection?.iceConnectionState || 'Not initialized'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Signaling:</span>
                    <span className={peerConnection?.signalingState === 'stable' ? 'text-green-400' : 'text-yellow-400'}>
                      {peerConnection?.signalingState || 'Not initialized'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">User ID:</span>
                    <span className="text-white font-mono text-xs">{testUserId.substring(0, 12)}...</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connection Logs */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg">Connection Logs</CardTitle>
                  <Button
                    onClick={clearLogs}
                    variant="outline"
                    size="sm"
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    Clear Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-black/50 rounded-lg p-4 h-60 overflow-y-auto">
                  {connectionLogs.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      No connection logs yet. Enable WebRTC audio to start logging.
                    </div>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {connectionLogs.map((log, index) => (
                        <div key={index} className="text-gray-300">
                          {log}
                        </div>
                      ))}
                    </div>
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
                <p>2. Enable WebRTC Audio in both tabs</p>
                <p>3. Watch the connection logs for WebRTC signaling</p>
                <p>4. Check the WebRTC Status panel for connection states</p>
                <p>5. If connection fails, try the "Retry Connection" button</p>
                <p>6. Look for these states in order:</p>
                <ul className="ml-4 space-y-1">
                  <li>• Signaling: "stable"</li>
                  <li>• ICE State: "connected"</li>
                  <li>• Connection: "connected"</li>
                  <li>• Remote Audio: "Yes"</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}








