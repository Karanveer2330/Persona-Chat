"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/src/components/ui/button';
import { PhoneOff, Brain, Users, Palette, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import ThreeCanvas from '@/src/components/three-canvas';
import { useVideoCallNotifications } from '@/src/hooks/use-video-call-notifications-simple';
import { useWebRTCAudio } from '@/src/hooks/use-webrtc-audio';
import { useMobileWebRTCAudio } from '@/src/hooks/use-mobile-webrtc-audio';
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
  
  // WebRTC Audio integration
  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Use mobile-optimized WebRTC hook on mobile devices
  const webRTCAudio = isMobile ? useMobileWebRTCAudio(recipientId, currentUserId, {
    onVoiceDataUpdate: (data) => {
      // Update local avatar data with voice information
      setLocalAvatarData(prev => ({
        ...prev,
        audioLevel: data.audioLevel
      }));
    },
    onRemoteVoiceData: (data) => {
      // Update remote avatar data with voice information
      setRemoteAvatarData((prev: any) => ({
        ...prev,
        audioLevel: data.volume / 128 // Normalize volume to 0-1
      }));
    },
    onRemoteAudioStream: (stream) => {
      console.log('🎧 Remote audio stream received:', stream);
    },
    onError: (error) => {
      console.error('❌ Mobile WebRTC error:', error);
    }
  }) : useWebRTCAudio(recipientId, currentUserId, {
    onVoiceDataUpdate: (data) => {
      // Update local avatar data with voice information
      setLocalAvatarData(prev => ({
        ...prev,
        audioLevel: data.audioLevel
      }));
    },
    onRemoteVoiceData: (data) => {
      // Update remote avatar data with voice information
      setRemoteAvatarData((prev: any) => ({
        ...prev,
        audioLevel: data.volume / 128 // Normalize volume to 0-1
      }));
    },
    onRemoteAudioStream: (stream) => {
      console.log('🎧 Remote audio stream received:', stream);
    }
  });

  const {
    audioState,
    remoteVoiceData,
    enableWebRTCAudio,
    disableWebRTCAudio,
    toggleMute
  } = webRTCAudio;
  
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
            // Debug received arm movement data
            if (data.avatarData.leftUpperArmX !== undefined || data.avatarData.rightUpperArmX !== undefined) {
              console.log('🎭 Received arm movement data from:', data.senderUserId, {
                leftUpperArm: { x: data.avatarData.leftUpperArmX, y: data.avatarData.leftUpperArmY, z: data.avatarData.leftUpperArmZ },
                rightUpperArm: { x: data.avatarData.rightUpperArmX, y: data.avatarData.rightUpperArmY, z: data.avatarData.rightUpperArmZ },
                timestamp: data.avatarData.timestamp
              });
            }
            setRemoteAvatarData(data.avatarData);
          }
        });

        // Set up model change listener
        socket.on('modelChange', (data: any) => {
          console.log('📥 RECEIVED model change:', data.modelUrl, 'from user:', data.senderUserId);
          // Only apply model change if it's from another user (not from self)
          if (data.modelUrl && data.senderId !== socket.id && data.senderUserId !== currentUserId) {
            console.log('✅ Applying remote model change');
            setRemoteModel(data.modelUrl);
          } else {
            console.log('❌ Ignoring self model change');
          }
        });

        // Voice data handling is now managed by the useVoiceChat hook
        
        // Register user for video calls to ensure they're in server's connectedUsers map
        if (socket.connected && socket.id) {
          socket.emit('registerForVideoCallNotifications', {
            userId: currentUserId, // Use unique user ID
            userName: 'User-' + socket.id.substring(0, 8)
          });
          console.log('📞 User registered with ID:', currentUserId);
        } else {
          console.log('❌ Socket not connected or no ID, skipping registration');
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
    console.log('🎭 MODEL CHANGE:', modelUrl);
    setSelectedModel(modelUrl);
    
    // Send model change to remote user
    if (socketRef.current && currentUserId) {
      console.log('📤 Sending to server...');
      socketRef.current.emit('modelChange', {
        senderId: socketRef.current.id,
        senderUserId: currentUserId,
        modelUrl: modelUrl
      });
    } else {
      console.log('❌ No socket or user ID');
    }
  }, [currentUserId]);

  // Send avatar data via socket
  const sendAvatarDataViaSocket = useCallback((avatarData: any) => {
    if (!socketRef.current || !currentUserId) {
      return;
    }
    
    // Debug arm movement data
    if (avatarData.leftUpperArmX !== undefined || avatarData.rightUpperArmX !== undefined) {
      console.log('🎭 Sending arm movement data:', {
        leftUpperArm: { x: avatarData.leftUpperArmX, y: avatarData.leftUpperArmY, z: avatarData.leftUpperArmZ },
        rightUpperArm: { x: avatarData.rightUpperArmX, y: avatarData.rightUpperArmY, z: avatarData.rightUpperArmZ },
        timestamp: avatarData.timestamp
      });
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
    
    // Send avatar data every 50ms for enhanced fluidity and smoother synchronization
    avatarDataIntervalRef.current = setInterval(() => {
      const currentAvatarData = localAvatarDataRef.current;
      if (recipientId) {
        sendAvatarDataViaSocket(currentAvatarData);
      }
    }, 50); // Reduced from 60ms to 50ms for enhanced fluidity
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
          onModelChange={handleModelChange}
        />
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          {/* WebRTC Audio Controls */}
          <div className="flex flex-col space-y-2">
            {!audioState.isEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await enableWebRTCAudio();
                  } catch (error) {
                    console.error('❌ Failed to enable WebRTC audio:', error);
                  }
                }}
                className="bg-green-600/50 backdrop-blur-sm text-white border-green-400/50 hover:bg-green-600/70"
              >
                <Mic className="w-4 h-4 mr-2" />
                Enable Voice Chat
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  className={`backdrop-blur-sm text-white border-white/20 hover:bg-white/10 ${
                    audioState.isMuted ? 'bg-red-600/50 border-red-400/50' : 'bg-black/50'
                  }`}
                >
                  {audioState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disableWebRTCAudio}
                  className="bg-red-600/50 backdrop-blur-sm text-white border-red-400/50 hover:bg-red-600/70"
                >
                  <VolumeX className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Voice Level Indicator */}
            {audioState.isEnabled && (
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-xs text-white">
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <div className="text-xs mb-1">Your Voice</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-100 ${
                          audioState.isSpeaking ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                        style={{ width: `${Math.min(audioState.audioLevel * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs mb-1">{recipientName}</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-100 ${
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
                </div>
                {/* Audio Status */}
                <div className="mt-2 text-xs text-gray-300">
                  <div>Remote Audio: {audioState.remoteAudioEnabled ? '✅ Connected' : '❌ Not Connected'}</div>
                  <div>WebRTC: {audioState.isEnabled ? '✅ Active' : '❌ Inactive'}</div>
                  <div>Role: {audioState.isCaller ? '📞 Caller' : '📱 Callee'}</div>
                  <div>Signaling: {audioState.signalingState}</div>
                  <div>Connection: {audioState.connectionState}</div>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnableFaceTracking(!enableFaceTracking)}
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-white/10"
            title={enableFaceTracking ? 'Face Tracking ON' : 'Face Tracking OFF'}
          >
            <Brain className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCallMode(callMode === 'shared-environment' ? 'normal-video' : 'shared-environment')}
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-white/10"
            title={callMode === 'shared-environment' ? 'Shared Environment' : 'Normal Video'}
          >
            <Users className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-white/10"
            title="Change Avatar"
          >
            <Palette className="w-4 h-4" />
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
                isOpen={showModelSelector}
                onClose={() => setShowModelSelector(false)}
                onSelectModel={(model) => {
                  console.log('🎭 ModelSelector - Model selected:', model);
                  handleModelChange(model.url); // Extract URL from model object
                  setShowModelSelector(false);
                }}
                currentModel={selectedModel}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}