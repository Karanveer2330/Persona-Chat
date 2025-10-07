"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  ArrowLeft,
  Users,
  Video,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/src/hooks/use-toast';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import Persona3DVideoCall to avoid SSR issues
const Persona3DVideoCall = dynamic(() => import('@/src/components/video-call/Persona3DVideoCall'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400 mx-auto mb-6"></div>
        <h3 className="text-2xl font-bold mb-2">Loading Video Call</h3>
        <p className="text-purple-300">Initializing 3D avatar communication...</p>
      </div>
    </div>
  )
});

function Persona3DVideoCallContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [recipientId, setRecipientId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [isInitiator, setIsInitiator] = useState(true);

  useEffect(() => {
    // Get recipient info from URL params or localStorage
    const urlRecipientId = params?.userId as string;
    const urlRecipientName = params?.userName as string;
    
    // Also check for search params (fallback)
    const searchRecipientId = searchParams.get('recipientId') || searchParams.get('userId');
    const searchRecipientName = searchParams.get('recipientName') || searchParams.get('userName');
    const searchIsInitiator = searchParams.get('isInitiator') === 'true';
    
    if (urlRecipientId || searchRecipientId) {
      setRecipientId(urlRecipientId || searchRecipientId || '');
      setRecipientName(urlRecipientName || searchRecipientName || 'Unknown User');
      setIsInitiator(searchIsInitiator);
      setIsCallActive(true);
    } else {
      // Try to get from localStorage or redirect
      const storedCallData = localStorage.getItem('persona3d-call-data');
      if (storedCallData) {
        try {
          const callData = JSON.parse(storedCallData);
          setRecipientId(callData.recipientId);
          setRecipientName(callData.recipientName);
          setIsInitiator(callData.isInitiator);
          setIsCallActive(true);
          localStorage.removeItem('persona3d-call-data');
        } catch (error) {
          console.error('Error parsing stored call data:', error);
          router.push('/chat');
        }
      } else {
        router.push('/chat');
      }
    }
  }, [params, searchParams, router]);

  const handleEndCall = () => {
    setIsCallActive(false);
    toast({
      title: "Call Ended",
      description: "3D avatar video call has ended",
    });
    router.push('/chat');
  };

  if (!isCallActive || !recipientId) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96 bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center">Loading Call...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Preparing 3D avatar communication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Persona3D Video Call Component */}
      <Persona3DVideoCall
        recipientId={recipientId}
        recipientName={recipientName}
        isInitiator={isInitiator}
        onEndCall={handleEndCall}
      />
    </div>
  );
}

export default function Persona3DVideoCallPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96 bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Initializing Persona3D video call...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <Persona3DVideoCallContent />
    </Suspense>
  );
}
