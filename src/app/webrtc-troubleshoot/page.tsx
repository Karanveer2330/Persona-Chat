"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, AlertCircle } from 'lucide-react';
import { useWebRTCAudio } from '@/src/hooks/use-webrtc-audio';

export default function WebRTCTroubleshoot() {
  const [testUserId] = useState(() => 'troubleshoot-user-' + Date.now());
  const [testRecipientId] = useState(() => 'troubleshoot-recipient-' + Date.now());
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `${timestamp}: ${message}`]);
  };

  const {
    audioState,
    remoteVoiceData,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute
  } = useWebRTCAudio(testRecipientId, testUserId, {
    onVoiceDataUpdate: (data) => {
      addLog(`Voice data: volume=${data.volume}, speaking=${data.isSpeaking}`);
    },
    onRemoteVoiceData: (data) => {
      addLog(`Remote voice: user=${data.userId}, volume=${data.volume}, speaking=${data.isSpeaking}`);
    },
    onRemoteAudioStream: (stream) => {
      addLog(`🎧 REMOTE AUDIO STREAM RECEIVED!`);
    }
  });

  // Monitor state changes
  useEffect(() => {
    addLog(`State change: signaling=${audioState.signalingState}, connection=${audioState.connectionState}, remote=${audioState.remoteAudioEnabled}`);
  }, [audioState.signalingState, audioState.connectionState, audioState.remoteAudioEnabled]);

  const clearLogs = () => {
    setLogs([]);
  };

  const retryConnection = async () => {
    addLog('🔄 Retrying connection...');
    disableWebRTCAudio();
    await new Promise(resolve => setTimeout(resolve, 2000));
    enableWebRTCAudio();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'stable': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'have-local-offer': return 'text-blue-400';
      case 'have-remote-offer': return 'text-purple-400';
      case 'failed': return 'text-red-400';
      case 'disconnected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '✅';
      case 'stable': return '✅';
      case 'connecting': return '🔄';
      case 'have-local-offer': return '📤';
      case 'have-remote-offer': return '📥';
      case 'failed': return '❌';
      case 'disconnected': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              WebRTC Connection Troubleshooter
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

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Connection Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Role:</span>
                    <span className={audioState.isCaller ? 'text-blue-400' : 'text-purple-400'}>
                      {audioState.isCaller ? '📞 Caller' : '📱 Callee'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Signaling:</span>
                    <span className={getStatusColor(audioState.signalingState)}>
                      {getStatusIcon(audioState.signalingState)} {audioState.signalingState}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Connection:</span>
                    <span className={getStatusColor(audioState.connectionState)}>
                      {getStatusIcon(audioState.connectionState)} {audioState.connectionState}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Remote Audio:</span>
                    <span className={audioState.remoteAudioEnabled ? 'text-green-400' : 'text-red-400'}>
                      {audioState.remoteAudioEnabled ? '✅ Connected' : '❌ Not Connected'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Audio Status</CardTitle>
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
                  <CardTitle className="text-white text-lg">Remote Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Users:</span>
                    <span className="text-white">{Object.keys(remoteVoiceData).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Remote Volume:</span>
                    <span className="text-white">{audioState.remoteVolume}/128</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Remote Speaking:</span>
                    <span className={Object.values(remoteVoiceData).some(data => data.isSpeaking) ? 'text-blue-400' : 'text-gray-400'}>
                      {Object.values(remoteVoiceData).some(data => data.isSpeaking) ? 'Yes' : 'No'}
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
                  {logs.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      No connection logs yet. Enable WebRTC audio to start logging.
                    </div>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {logs.map((log, index) => (
                        <div key={index} className="text-gray-300">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting Guide */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg">Troubleshooting Guide</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2">
                <p><strong>Expected Flow:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>1. Both users enable WebRTC Audio</li>
                  <li>2. One becomes Caller, other becomes Callee</li>
                  <li>3. Caller: Signaling goes "new" → "have-local-offer"</li>
                  <li>4. Callee: Signaling goes "new" → "have-remote-offer" → "stable"</li>
                  <li>5. Connection goes "new" → "connecting" → "connected"</li>
                  <li>6. Remote Audio becomes "✅ Connected"</li>
                </ul>
                <p><strong>Common Issues:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Stuck at "have-local-offer": Callee not responding</li>
                  <li>• Stuck at "connecting": ICE candidates not exchanging</li>
                  <li>• "failed" state: Network or firewall issues</li>
                  <li>• No remote audio: Connection not established</li>
                </ul>
                <p><strong>Solutions:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Try "Retry Connection" button</li>
                  <li>• Check browser console for errors</li>
                  <li>• Ensure both users are on same network</li>
                  <li>• Check HTTPS requirement</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}








