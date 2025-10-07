"use client";

import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useWebRTCAudio } from '@/src/hooks/use-webrtc-audio';

export default function CallerCalleeTest() {
  const [testUserId] = useState(() => 'test-user-' + Date.now());
  const [testRecipientId] = useState(() => 'test-recipient-' + Date.now());

  const {
    audioState,
    remoteVoiceData,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute
  } = useWebRTCAudio(testRecipientId, testUserId, {
    onVoiceDataUpdate: (data) => {
      console.log('Voice data update:', data);
    },
    onRemoteVoiceData: (data) => {
      console.log('Remote voice data:', data);
    },
    onRemoteAudioStream: (stream) => {
      console.log('🎧 Remote audio stream received:', stream);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              Caller/Callee WebRTC Test
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Local Audio Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">WebRTC Enabled:</span>
                      <span className={audioState.isEnabled ? 'text-green-400' : 'text-red-400'}>
                        {audioState.isEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Role:</span>
                      <span className={audioState.isCaller ? 'text-blue-400' : 'text-purple-400'}>
                        {audioState.isCaller ? '📞 Caller' : '📱 Callee'}
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
                  </div>
                  
                  {/* Volume Bar */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">Volume Level:</div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-100 ${
                          audioState.isSpeaking ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                        style={{ width: `${Math.min(audioState.audioLevel * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">WebRTC Connection Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Remote Audio:</span>
                      <span className={audioState.remoteAudioEnabled ? 'text-green-400' : 'text-red-400'}>
                        {audioState.remoteAudioEnabled ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Signaling State:</span>
                      <span className={
                        audioState.signalingState === 'stable' ? 'text-green-400' :
                        audioState.signalingState === 'have-local-offer' ? 'text-blue-400' :
                        audioState.signalingState === 'have-remote-offer' ? 'text-purple-400' :
                        'text-yellow-400'
                      }>
                        {audioState.signalingState}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Connection State:</span>
                      <span className={
                        audioState.connectionState === 'connected' ? 'text-green-400' :
                        audioState.connectionState === 'connecting' ? 'text-yellow-400' :
                        'text-red-400'
                      }>
                        {audioState.connectionState}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Remote Volume:</span>
                      <span className="text-white">{audioState.remoteVolume}/128</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Connected Users:</span>
                      <span className="text-white">{Object.keys(remoteVoiceData).length}</span>
                    </div>
                  </div>
                  
                  {/* Remote Volume Bar */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">Remote Volume:</div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-100 ${
                          Object.values(remoteVoiceData).some(data => data.isSpeaking) ? 'bg-blue-400' : 'bg-gray-500'
                        }`}
                        style={{ 
                          width: `${Math.min(
                            Math.max(...Object.values(remoteVoiceData).map(data => data.volume)) / 128 * 100, 
                            100
                          )}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg">Caller/Callee Test Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2">
                <p>1. Open this page in two different browser tabs/windows</p>
                <p>2. Enable WebRTC Audio in both tabs</p>
                <p>3. Check the "Role" field - one should be "📞 Caller" and the other "📱 Callee"</p>
                <p>4. The Caller should create the offer and send it to the Callee</p>
                <p>5. Watch the Signaling State progress: new → have-local-offer → stable</p>
                <p>6. Watch the Connection State progress: new → connecting → connected</p>
                <p>7. When both show "connected", you should hear each other</p>
                <p><strong>Key:</strong> Only the Caller creates the offer, preventing signaling conflicts!</p>
              </CardContent>
            </Card>

            {/* Debug Info */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm font-mono">
                  <div><span className="text-gray-400">Test User ID:</span> <span className="text-white">{testUserId}</span></div>
                  <div><span className="text-gray-400">Test Recipient ID:</span> <span className="text-white">{testRecipientId}</span></div>
                  <div><span className="text-gray-400">Is Caller:</span> <span className="text-white">{audioState.isCaller ? 'Yes' : 'No'}</span></div>
                  <div><span className="text-gray-400">Audio State:</span> <span className="text-white">{JSON.stringify(audioState, null, 2)}</span></div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}








