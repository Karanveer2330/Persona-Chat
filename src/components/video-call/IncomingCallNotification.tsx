"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  User,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { IncomingCall } from '@/src/hooks/use-video-call-notifications';

interface IncomingCallNotificationProps {
  incomingCall: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export function IncomingCallNotification({ 
  incomingCall, 
  onAccept, 
  onReject, 
  onDismiss 
}: IncomingCallNotificationProps) {
  const [isMuted, setIsMuted] = useState(false);
  
  // Debug: Log when component renders
  useEffect(() => {
    console.log('🔔 IncomingCallNotification rendered with:', incomingCall);
  }, [incomingCall]);
  const [animationClass, setAnimationClass] = useState('animate-pulse');

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 30000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Toggle mute for notification sound
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // You can implement actual sound muting here
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-purple-500/50 shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className={`absolute inset-0 bg-purple-500/30 rounded-full blur-xl ${animationClass}`}></div>
              <Avatar className="w-20 h-20 mx-auto border-4 border-purple-400/50 shadow-lg">
                <AvatarImage src={`/api/avatar/${incomingCall.callerId}`} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl font-bold">
                  {incomingCall.callerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-white mb-2">
                📞 Incoming Persona3D Call
              </h2>
              <p className="text-purple-200 text-lg">
                <span className="font-semibold">{incomingCall.callerName}</span> wants to start a 3D video call
              </p>
              <div className="flex items-center justify-center mt-2 text-purple-300">
                <Sparkles className="w-4 h-4 mr-1" />
                <span className="text-sm">3D Avatar Experience</span>
              </div>
            </div>
          </div>

          {/* Call Duration */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-purple-800/50 rounded-full border border-purple-400/30">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-purple-200 text-sm">
                Call started {new Date(incomingCall.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {/* Reject Button */}
            <Button
              onClick={onReject}
              variant="destructive"
              size="lg"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              Decline
            </Button>

            {/* Accept Button */}
            <Button
              onClick={onAccept}
              size="lg"
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg"
            >
              <Phone className="w-5 h-5 mr-2" />
              Accept
            </Button>
          </div>

          {/* Sound Control */}
          <div className="mt-4 flex items-center justify-center">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:text-white hover:bg-purple-800/50"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 mr-1" />
              ) : (
                <Volume2 className="w-4 h-4 mr-1" />
              )}
              {isMuted ? 'Unmute' : 'Mute'} Sound
            </Button>
          </div>

          {/* Auto-dismiss notice */}
          <div className="mt-4 text-center">
            <p className="text-purple-400 text-xs">
              This notification will auto-dismiss in 30 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}