"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Settings, Mic, MicOff, Video, VideoOff, Maximize2, Home, Menu, Brain, BrainCircuit } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import ThreeCanvas to avoid SSR issues
const ThreeCanvas = dynamic(() => import('@/src/components/three-canvas'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-6"></div>
        <h3 className="text-2xl font-bold mb-2">Loading PersonaPlay3D</h3>
        <p className="text-purple-300">Initializing 3D avatar system...</p>
      </div>
    </div>
  )
});

export default function PersonaPlay3DPage() {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedVrmUrl, setSelectedVrmUrl] = useState<string | null>("/models/vrm/fem3.vrm");
  const [enableFaceTracking, setEnableFaceTracking] = useState(true);

  const startExperience = () => {
    setIsActive(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        {/* Landing Page Content - Mobile Responsive */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 md:px-6">
          {/* Logo/Title - Mobile Responsive */}
          <div className="mb-8 md:mb-12">
            <h1 className="text-4xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              PersonaPlay3D
            </h1>
            <p className="text-lg md:text-2xl text-gray-300 mb-6 md:mb-8">
              Interactive 3D Avatar Experience
            </p>
            <div className="w-24 md:w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
          </div>

          {/* Features Grid - Mobile Responsive */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mx-auto mb-3 md:mb-4 flex items-center justify-center">
                <Video className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Real-time Video</h3>
              <p className="text-sm md:text-base text-gray-400">Advanced camera tracking and facial recognition for seamless avatar control</p>
            </div>

            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mx-auto mb-3 md:mb-4 flex items-center justify-center">
                <Mic className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Voice Sync</h3>
              <p className="text-sm md:text-base text-gray-400">Crystal clear audio processing with lip-sync technology</p>
            </div>

            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4 md:p-6 border border-white/10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mx-auto mb-3 md:mb-4 flex items-center justify-center">
                <Settings className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Customizable</h3>
              <p className="text-sm md:text-base text-gray-400">Personalize your avatar with endless customization options</p>
            </div>
          </div>

          {/* Call to Action - Mobile Responsive */}
          <div className="space-y-4 md:space-y-6">
            <Button
              onClick={startExperience}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white px-8 md:px-12 py-3 md:py-4 text-lg md:text-xl font-semibold rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 w-full md:w-auto"
            >
              <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Start 3D Experience
            </Button>
            
            <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-400">
              <span>🎬 Motion Capture Ready</span>
              <span>🎨 HD Rendering</span>
              <span>🔊 Spatial Audio</span>
            </div>

            <Link href="/chat/global">
              <Button variant="ghost" className="text-white hover:bg-white/10 mt-4 md:mt-6 w-full md:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Back to Hub
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative">

      {/* Top Control Bar - Mobile Responsive */}
      <div className="flex items-center justify-between p-2 md:p-4 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs md:text-sm">3D</span>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white">PersonaPlay3D</h3>
              <div className="flex items-center space-x-1 md:space-x-2 text-green-400 text-xs md:text-sm">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Session</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10 p-1 md:p-2"
          >
            <Maximize2 className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          
          <Link href="/chat/global">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 p-1 md:p-2">
              <Home className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Area - Mobile Responsive */}
      <div className="flex-1 flex relative">
        {/* 3D Canvas Area */}
        <div className="w-full p-2 md:p-6">
          <div className="h-full bg-gradient-to-br from-slate-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 relative">
            {/* 3D Canvas */}
            <ThreeCanvas 
              key={selectedVrmUrl} // Force re-render only when model changes
              vrmUrl={selectedVrmUrl}
              isCameraEnabled={!isVideoOff}
              enableFaceTracking={enableFaceTracking}
              isDualAvatar={false} // Explicitly set to solo mode
              localAvatarName="You"
              remoteAvatarName=""
              callMode="shared-environment"
            />
            
            {/* Performance Info */}
          </div>
        </div>
      </div>

      {/* Bottom Controls - Mobile Responsive */}
      <div className="p-2 md:p-6 pt-0">
        <div className="bg-black/30 backdrop-blur-lg rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10">
          <div className="flex items-center justify-between">
            
            {/* Left - Info */}
            <div className="text-white hidden md:block">
              <div className="text-sm font-semibold">Interactive Mode</div>
              <div className="text-xs text-gray-300">Real-time 3D avatar control</div>
            </div>

            {/* Center - Controls */}
            <div className="flex items-center space-x-2 md:space-x-4 mx-auto md:mx-0">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className={`h-10 w-10 md:h-12 md:w-12 rounded-full ${
                  isMuted 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20"
                }`}
              >
                {isMuted ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
              </Button>

              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="sm"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`h-10 w-10 md:h-12 md:w-12 rounded-full ${
                  isVideoOff 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20"
                }`}
              >
                {isVideoOff ? <VideoOff className="h-4 w-4 md:h-5 md:w-5" /> : <Video className="h-4 w-4 md:h-5 md:w-5" />}
              </Button>

              <Button
                variant={enableFaceTracking ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setEnableFaceTracking(!enableFaceTracking)}
                className={`h-10 w-10 md:h-12 md:w-12 rounded-full ${
                  enableFaceTracking 
                    ? "bg-purple-500 hover:bg-purple-600 text-white" 
                    : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20"
                }`}
                title={enableFaceTracking ? "Disable Face Tracking" : "Enable Face Tracking"}
              >
                <Brain className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 md:h-12 md:px-6 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/20 rounded-full hidden md:flex"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                <span className="hidden md:inline">Settings</span>
              </Button>
            </div>

            {/* Right - Status */}
            <div className="flex items-center space-x-2 md:space-x-3 text-white/70 text-xs md:text-sm hidden md:flex">
              <div className="flex items-center space-x-1 md:space-x-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Neural Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
