"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/src/components/ui/button';
import { PhoneOff, Brain, Users, Palette } from 'lucide-react';
import ThreeCanvas from '@/src/components/three-canvas';
import { useVideoCallNotifications } from '@/src/hooks/use-video-call-notifications-simple';
import { getSocket } from '@/src/lib/socket';
import ModelSelector from '@/src/components/ModelSelector';

interface Persona3DVideoCallProps {
  recipientId: string;
  recipientName: string;
  isInitiator: boolean;
  onEndCall: () => void;
}

// Default avatar data structure
const defaultAvatarData = {
  blink: 0,
  happy: 0,
  angry: 0,
  surprised: 0,
  i: 0,
  a: 0,
  e: 0,
  o: 0,
  u: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  eyeX: 0,
  eyeY: 0,
  isWaving: false,
  isBigWave: false,
  isBowing: false,
  isWinking: false,
  isSurprised: false,
  isConfused: false,
  isExcited: false,
  isHeadBob: false,
  isShoulderShimmy: false,
  isHipSway: false,
  audioLevel: 0
};

export default function Persona3DVideoCall({
  recipientId,
  recipientName,
  isInitiator,
  onEndCall
}: Persona3DVideoCallProps) {
  
  // State management
  const [enableFaceTracking, setEnableFaceTracking] = useState(true);
  const [callMode, setCallMode] = useState<'shared-environment' | 'normal-video'>('shared-environment');
  const [localAvatarData, setLocalAvatarData] = useState(defaultAvatarData);
  const [remoteAvatarData, setRemoteAvatarData] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('/models/vrm/fem3.vrm');
  const [remoteModel, setRemoteModel] = useState<string>('/models/vrm/fem3.vrm');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Generate unique user ID for this session
  const [currentUserId] = useState(() => 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
  
  // Refs
  const socketRef = useRef<any>(null);
  const localAvatarDataRef = useRef(defaultAvatarData);
  const avatarDataIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Video call notifications hook
  const {
    initiateCall,
    acceptCall,
    rejectCall,
    clearIncomingCall,
    endCall
  } = useVideoCallNotifications();

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Set up avatar data listener
        socket.on('avatarData', (data: any) => {
          // Only apply data if it's from another user (not from self)
          if (data.avatarData && data.senderId !== socket.id && data.senderUserId !== currentUserId) {
            setRemoteAvatarData(data.avatarData);
          }
        });

        // Set up model change listener
        socket.on('modelChange', (data: any) => {
          // Only apply model change if it's from another user (not from self)
          if (data.modelUrl && data.senderId !== socket.id && data.senderUserId !== currentUserId) {
            setRemoteModel(data.modelUrl);
          }
        });
        
        // Register user for video calls to ensure they're in server's connectedUsers map
        if (socket.connected && socket.id) {
          socket.emit('registerForVideoCallNotifications', {
            userId: currentUserId, // Use unique user ID
            userName: 'User-' + socket.id.substring(0, 8)
          });
          } else {
          }
        
        // Start avatar data sync after registration
        setTimeout(() => {
          startAvatarDataSync();
        }, 2000);
        
        // Cleanup function
        return () => {
          socket.off('avatarData');
          socket.off('modelChange');
          if (avatarDataIntervalRef.current) {
            clearInterval(avatarDataIntervalRef.current);
          }
        };
        
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };
    
    initializeSocket();
  }, [recipientId]);

  // Avatar data update callback
  const onAvatarDataUpdate = useCallback((avatarData: any) => {
    setLocalAvatarData(avatarData);
    localAvatarDataRef.current = avatarData;
  }, []);

  // Model change handler
  const handleModelChange = useCallback((modelUrl: string) => {
    setSelectedModel(modelUrl);
    
    // Send model change to remote user
    if (socketRef.current && currentUserId) {
      socketRef.current.emit('modelChange', {
        senderId: socketRef.current.id,
        senderUserId: currentUserId,
        modelUrl: modelUrl
      });
    }
  }, [currentUserId]);

  // Send avatar data via socket
  const sendAvatarDataViaSocket = useCallback((avatarData: any) => {
    if (!socketRef.current || !currentUserId) {
      return;
    }
    
    // Send to all connected users (broadcast) - server will filter out self
    socketRef.current.emit('avatarData', {
      senderId: socketRef.current.id,
      senderUserId: currentUserId,
      avatarData: avatarData
    });
  }, [currentUserId]);

  // Start avatar data synchronization
  const startAvatarDataSync = () => {
    if (avatarDataIntervalRef.current) {
      clearInterval(avatarDataIntervalRef.current);
    }
    
    // Send avatar data every 100ms for more fluid synchronization
    avatarDataIntervalRef.current = setInterval(() => {
      const currentAvatarData = localAvatarDataRef.current;
      if (recipientId) {
        sendAvatarDataViaSocket(currentAvatarData);
      }
    }, 100); // Reduced from 200ms to 100ms for more fluid motion
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (avatarDataIntervalRef.current) {
        clearInterval(avatarDataIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h2 className="text-lg font-semibold">3D Video Call</h2>
            <p className="text-sm text-gray-300">with {recipientName}</p>
          </div>
        </div>
        
        <Button
          onClick={onEndCall}
          variant="destructive"
          size="sm"
          className="bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          End Call
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        <ThreeCanvas 
          vrmUrl={selectedModel}
          isCameraEnabled={enableFaceTracking}
          enableFaceTracking={enableFaceTracking}
          onAvatarDataUpdate={onAvatarDataUpdate}
          remoteAvatarData={remoteAvatarData}
          remoteModelUrl={remoteModel}
          isDualAvatar={true}
          localAvatarName="You"
          remoteAvatarName={recipientName}
          callMode={callMode}
        />
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnableFaceTracking(!enableFaceTracking)}
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-white/10"
          >
            <Brain className="w-4 h-4 mr-2" />
            {enableFaceTracking ? 'Face Tracking ON' : 'Face Tracking OFF'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCallMode(callMode === 'shared-environment' ? 'normal-video' : 'shared-environment')}
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-white/10"
          >
            <Users className="w-4 h-4 mr-2" />
            {callMode === 'shared-environment' ? 'Shared Environment' : 'Normal Video'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-white/10"
          >
            <Palette className="w-4 h-4 mr-2" />
            Change Avatar
          </Button>
        </div>

        {/* Model Selector Modal */}
        {showModelSelector && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Select Avatar Model</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModelSelector(false)}
                  className="text-white hover:bg-gray-800"
                >
                  ✕
                </Button>
              </div>
              <ModelSelector
                isOpen={true}
                onClose={() => setShowModelSelector(false)}
                onSelectModel={(model) => {
                  handleModelChange(model.url);
                  setShowModelSelector(false);
                }}
                currentModel={selectedModel}
              />
            </div>
          </div>
        )}
      </div>

      {/* Simple Status */}
      <div className="p-4 bg-black/20 backdrop-blur-sm text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Status:</strong>
            <div className="mt-1">
              <div>Socket: {socketRef.current?.connected ? '✅ Connected' : '❌ Disconnected'}</div>
              <div>Local Data: {localAvatarData ? '✅ Active' : '❌ Inactive'}</div>
              <div>Remote Data: {remoteAvatarData ? '✅ Received' : '❌ None'}</div>
            </div>
          </div>
          <div>
            <strong>Avatar Data:</strong>
            <div className="mt-1 text-gray-300">
              <div>Local: {localAvatarData.blink !== undefined ? 'Ready' : 'Not Ready'}</div>
              <div>Remote: {remoteAvatarData ? 'Ready' : 'Not Ready'}</div>
              <div>Sync: {avatarDataIntervalRef.current ? 'Active' : 'Inactive'}</div>
              <div>Local Model: {selectedModel.split('/').pop()}</div>
              <div>Remote Model: {remoteModel.split('/').pop()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
