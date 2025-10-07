"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Music, Zap } from 'lucide-react';
import { useWebRTCAudio } from '@/src/hooks/use-webrtc-audio';
import { useMobileWebRTCAudio } from '@/src/hooks/use-mobile-webrtc-audio';

export default function AudioQualityTest() {
  const [isMobile, setIsMobile] = useState(false);
  const [audioQuality, setAudioQuality] = useState({
    smoothing: 0.9,
    intensity: 0.85,
    threshold: 8,
    gain: 1.2,
    filterFreq: 8000
  });
  
  // Generate test user IDs
  const currentUserId = 'audio-test-user-1';
  const recipientId = 'audio-test-user-2';

  // Detect mobile device
  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  // Use appropriate WebRTC hook
  const webRTCAudio = isMobile ? useMobileWebRTCAudio(currentUserId, recipientId, {
    onVoiceDataUpdate: (data) => {
      // Voice data processing callback
    }
  }) : useWebRTCAudio(currentUserId, recipientId, {
    onVoiceDataUpdate: (data) => {
      // Voice data processing callback
    }
  });

  const {
    audioState,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute
  } = webRTCAudio;

  const getQualityIcon = () => {
    if (audioState.volume < 20) return <VolumeX className="w-5 h-5 text-red-400" />;
    if (audioState.volume < 50) return <Volume2 className="w-5 h-5 text-yellow-400" />;
    return <Music className="w-5 h-5 text-green-400" />;
  };

  const getQualityColor = () => {
    if (audioState.volume < 20) return 'text-red-400';
    if (audioState.volume < 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl flex items-center justify-center gap-2">
              <Music className="w-6 h-6" />
              Enhanced Audio Quality Test
            </CardTitle>
            <p className="text-gray-400 text-center text-sm">
              Test the improved voice processing with softer noise cancellation and smoothing effects
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Audio Quality Status */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  {getQualityIcon()}
                  Audio Quality Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Volume Level:</span>
                      <span className={`font-semibold ${getQualityColor()}`}>
                        {audioState.volume}/128
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Audio Level:</span>
                      <span className="text-white font-semibold">
                        {(audioState.audioLevel * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Speaking:</span>
                      <span className={`font-semibold ${audioState.isSpeaking ? 'text-green-400' : 'text-gray-400'}`}>
                        {audioState.isSpeaking ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
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
                    <div className="flex justify-between">
                      <span className="text-gray-300">Muted:</span>
                      <span className={`font-semibold ${audioState.isMuted ? 'text-red-400' : 'text-green-400'}`}>
                        {audioState.isMuted ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Audio Processing Info */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Enhanced Audio Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-300">Smoothing:</span>
                      <span className="text-blue-100 font-semibold">
                        {audioQuality.smoothing} (90%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-300">Intensity:</span>
                      <span className="text-blue-100 font-semibold">
                        {audioQuality.intensity} (85%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-300">Threshold:</span>
                      <span className="text-blue-100 font-semibold">
                        {audioQuality.threshold} (Lower)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-300">Gain:</span>
                      <span className="text-blue-100 font-semibold">
                        {audioQuality.gain} (120%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-300">Filter:</span>
                      <span className="text-blue-100 font-semibold">
                        {audioQuality.filterFreq}Hz (Low-pass)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-300">Processing:</span>
                      <span className="text-blue-100 font-semibold">
                        Enhanced
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
                      Enable Enhanced Audio
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

                {/* Real-time Audio Visualization */}
                {audioState.isEnabled && (
                  <div className="space-y-4">
                    <div className="text-center text-sm text-gray-300">
                      Real-time Audio Level Visualization
                    </div>
                    
                    {/* Volume Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Volume Level:</span>
                        <span className="text-white font-semibold">{audioState.volume}/128</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full transition-all duration-150 ease-out"
                          style={{ width: `${audioState.audioLevel * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Speaking Indicator */}
                    <div className="flex items-center justify-center space-x-4">
                      <div className={`flex items-center space-x-2 ${
                        audioState.isSpeaking ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        <div className={`w-4 h-4 rounded-full ${
                          audioState.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm font-semibold">
                          {audioState.isSpeaking ? 'Speaking Detected' : 'Silent'}
                        </span>
                      </div>
                    </div>

                    {/* Audio Quality Indicator */}
                    <div className="flex items-center justify-center space-x-4">
                      <div className={`flex items-center space-x-2 ${getQualityColor()}`}>
                        {getQualityIcon()}
                        <span className="text-sm font-semibold">
                          {audioState.volume < 20 ? 'Low Quality' : 
                           audioState.volume < 50 ? 'Medium Quality' : 'High Quality'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Features */}
            <Card className="bg-green-900/30 border-green-700">
              <CardHeader>
                <CardTitle className="text-green-200 text-lg">Enhanced Audio Features</CardTitle>
              </CardHeader>
              <CardContent className="text-green-100 space-y-2 text-sm">
                <p>🎵 <strong>Softer Noise Cancellation:</strong></p>
                <p>• Increased intensity (85%) for better voice volume</p>
                <p>• Lower speaking threshold (8) for more sensitive detection</p>
                <p>• Enhanced smoothing (90%) for smoother audio transitions</p>
                <p></p>
                <p>🎧 <strong>Lighter Tone Processing:</strong></p>
                <p>• Increased gain (120%) for better voice clarity</p>
                <p>• Low-pass filter at 8kHz to cut harsh high frequencies</p>
                <p>• Gentle rolloff (Q=0.5) for natural sound</p>
                <p></p>
                <p>📱 <strong>Mobile Optimized:</strong></p>
                <p>• Platform-specific audio constraints</p>
                <p>• Enhanced mobile browser compatibility</p>
                <p>• Optimized sample rates for mobile devices</p>
              </CardContent>
            </Card>

            {/* Test Instructions */}
            <Card className="bg-purple-900/30 border-purple-700">
              <CardHeader>
                <CardTitle className="text-purple-200 text-lg">Test Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-purple-100 space-y-2 text-sm">
                <p>🧪 <strong>How to Test Enhanced Audio:</strong></p>
                <p>1. <strong>Enable Audio:</strong> Click "Enable Enhanced Audio" button</p>
                <p>2. <strong>Speak Normally:</strong> Talk at your normal volume</p>
                <p>3. <strong>Observe Smoothing:</strong> Notice the smoother audio level transitions</p>
                <p>4. <strong>Check Sensitivity:</strong> Notice more sensitive speaking detection</p>
                <p>5. <strong>Compare Quality:</strong> Listen for softer, lighter tone</p>
                <p></p>
                <p>🔍 <strong>What to Notice:</strong></p>
                <p>• Smoother audio level bars with less jitter</p>
                <p>• More sensitive speaking detection</p>
                <p>• Softer overall audio tone</p>
                <p>• Reduced harsh frequencies</p>
                <p>• Better mobile audio quality</p>
              </CardContent>
            </Card>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
