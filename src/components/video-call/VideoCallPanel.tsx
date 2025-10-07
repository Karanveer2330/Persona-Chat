"use client";

import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { Button } from '../ui/button';

interface VideoCallPanelProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  isInitiator: boolean;
}

export default function VideoCallPanel({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  isInitiator
}: VideoCallPanelProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('Initializing...');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Initialize WebRTC
  useEffect(() => {
    if (!isOpen) return;

    const initializeCall = async () => {
      try {
        setCallStatus('Getting camera and microphone...');
        
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        peerConnectionRef.current = peerConnection;

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          const [remoteStream] = event.streams;
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
          setCallStatus('Connected');
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            // In a real implementation, send this to the other peer via signaling server
            console.log('ICE candidate:', event.candidate);
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          const state = peerConnection.connectionState;
          console.log('Connection state:', state);
          
          switch (state) {
            case 'connecting':
              setCallStatus('Connecting...');
              setIsConnecting(true);
              break;
            case 'connected':
              setCallStatus('Connected');
              setIsConnecting(false);
              setIsConnected(true);
              break;
            case 'disconnected':
              setCallStatus('Disconnected');
              setIsConnected(false);
              break;
            case 'failed':
              setCallStatus('Connection failed');
              setIsConnected(false);
              break;
          }
        };

        if (isInitiator) {
          setCallStatus('Creating offer...');
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          // In a real implementation, send offer to the other peer
          console.log('Created offer:', offer);
        }

        setCallStatus('Waiting for connection...');

      } catch (error) {
        console.error('Error initializing call:', error);
        setCallStatus('Failed to access camera/microphone');
      }
    };

    initializeCall();

    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [isOpen, isInitiator]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">Video Call</h3>
          <p className="text-sm text-muted-foreground">{recipientName}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Remote Video */}
        <div className="relative bg-black rounded-lg overflow-hidden h-48">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                  {recipientName[0]?.toUpperCase()}
                </div>
                <p className="text-sm">{callStatus}</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="relative bg-black rounded-lg overflow-hidden h-32">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p className="text-sm">Camera loading...</p>
            </div>
          )}
          {isVideoOff && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-white" />
            </div>
          )}
        </div>

        {/* Call Status */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{callStatus}</p>
          {isConnecting && (
            <div className="mt-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border">
        <div className="flex justify-center space-x-4">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="icon"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            variant={isVideoOff ? "destructive" : "outline"}
            size="icon"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            onClick={endCall}
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
