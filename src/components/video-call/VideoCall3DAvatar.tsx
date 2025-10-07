"use client";

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ThreeCanvas to avoid SSR issues
const ThreeCanvas = dynamic(() => import('../three-canvas'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading 3D Avatar...</p>
        <p className="text-sm text-purple-300 mt-2">Preparing immersive chat experience</p>
      </div>
    </div>
  )
});

interface VideoCall3DAvatarProps {
  isConnected: boolean;
  recipientName: string;
  callStatus: string;
  remoteStream?: MediaStream | null;
  selectedVrmUrl?: string | null;
  onAvatarDataUpdate?: (avatarData: any) => void;
  remoteAvatarData?: any;
}

export default function VideoCall3DAvatar({ 
  isConnected, 
  recipientName, 
  callStatus, 
  remoteStream,
  selectedVrmUrl = "https://d1l5n2avb89axj.cloudfront.net/avatar-first.vrm",
  onAvatarDataUpdate,
  remoteAvatarData
}: VideoCall3DAvatarProps) {
  const [is3DLoaded, setIs3DLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIs3DLoaded(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* 3D Avatar Canvas */}
      <ThreeCanvas 
        vrmUrl={selectedVrmUrl}
        isCameraEnabled={true}
        enableFaceTracking={isConnected}
        onAvatarDataUpdate={onAvatarDataUpdate}
        remoteAvatarData={remoteAvatarData}
        isDualAvatar={true}
        callMode="shared-environment"
      />

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
          <span className="text-white font-medium">{isConnected ? '3D Avatar Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Call Info Overlay */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
        <div className="flex items-center space-x-2 text-white text-sm">
          <span>👤 {recipientName}</span>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2">Connecting to {recipientName}</h3>
            <p className="text-purple-300">{callStatus}</p>
          </div>
        </div>
      )}
    </div>
  );
}
