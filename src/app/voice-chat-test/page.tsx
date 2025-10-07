"use client";

import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoiceChat } from '@/src/hooks/use-voice-chat';

export default function VoiceChatTest() {
  const [testUserId] = useState(() => 'test-user-' + Date.now());
  const [testRecipientId] = useState(() => 'test-recipient-' + Date.now());

  const {
    voiceState,
    remoteVoiceData,
    enableVoiceChat,
    disableVoiceChat,
    toggleMute
  } = useVoiceChat(testRecipientId, testUserId, {
    onVoiceDataUpdate: (data) => {
      console.log('Voice data update:', data);
    },
    onRemoteVoiceData: (data) => {
      console.log('Remote voice data:', data);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              Voice Chat Integration Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Controls */}
            <div className="flex justify-center space-x-4">
              {!voiceState.isEnabled ? (
                <Button
                  onClick={enableVoiceChat}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Enable Voice Chat
                </Button>
              ) : (
                <div className="flex space-x-4">
                  <Button
                    onClick={toggleMute}
                    className={`${
                      voiceState.isMuted 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                    size="lg"
                  >
                    {voiceState.isMuted ? (
                      <MicOff className="w-5 h-5 mr-2" />
                    ) : (
                      <Mic className="w-5 h-5 mr-2" />
                    )}
                    {voiceState.isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button
                    onClick={disableVoiceChat}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    <VolumeX className="w-5 h-5 mr-2" />
                    Disable Voice Chat
                  </Button>
                </div>
              )}
            </div>

            {/* Voice Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Local Voice Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Status:</span>
                      <span className={voiceState.isEnabled ? 'text-green-400' : 'text-red-400'}>
                        {voiceState.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Muted:</span>
                      <span className={voiceState.isMuted ? 'text-red-400' : 'text-green-400'}>
                        {voiceState.isMuted ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Speaking:</span>
                      <span className={voiceState.isSpeaking ? 'text-green-400' : 'text-gray-400'}>
                        {voiceState.isSpeaking ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Volume:</span>
                      <span className="text-white">{voiceState.volume}/128</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Audio Level:</span>
                      <span className="text-white">{(voiceState.audioLevel * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  {/* Volume Bar */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">Volume Level:</div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-100 ${
                          voiceState.isSpeaking ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                        style={{ width: `${Math.min(voiceState.audioLevel * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Remote Voice Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Connected Users:</span>
                      <span className="text-white">{Object.keys(remoteVoiceData).length}</span>
                    </div>
                    {Object.entries(remoteVoiceData).map(([userId, data]) => (
                      <div key={userId} className="space-y-1 p-2 bg-gray-800/50 rounded">
                        <div className="text-xs text-gray-400">User: {userId.substring(0, 8)}...</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Speaking:</span>
                          <span className={data.isSpeaking ? 'text-blue-400' : 'text-gray-400'}>
                            {data.isSpeaking ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Volume:</span>
                          <span className="text-white">{data.volume}/128</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-100 ${
                              data.isSpeaking ? 'bg-blue-400' : 'bg-gray-500'
                            }`}
                            style={{ width: `${Math.min(data.volume / 128 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {Object.keys(remoteVoiceData).length === 0 && (
                      <div className="text-gray-400 text-sm text-center py-4">
                        No remote voice data received yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Instructions */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg">Test Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2">
                <p>1. Click "Enable Voice Chat" to start microphone access</p>
                <p>2. Grant microphone permissions when prompted</p>
                <p>3. Speak into your microphone to see volume levels</p>
                <p>4. Test mute/unmute functionality</p>
                <p>5. Open this page in another browser tab/window to test remote voice data</p>
                <p>6. Check the browser console for detailed voice data logs</p>
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
                  <div><span className="text-gray-400">Voice State:</span> <span className="text-white">{JSON.stringify(voiceState, null, 2)}</span></div>
                  <div><span className="text-gray-400">Remote Voice Data:</span> <span className="text-white">{JSON.stringify(remoteVoiceData, null, 2)}</span></div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}








