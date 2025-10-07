"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import VideoCallWindow from '../../components/video-call/VideoCallWindow';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';

function VideoCallContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipientId = searchParams.get('recipientId') || '';
  const recipientName = searchParams.get('recipientName') || 'Unknown User';
  const isInitiator = searchParams.get('isInitiator') === 'true';

  // Check if device is mobile - fix hydration issue
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
             window.innerWidth <= 768;
    };
    setIsMobile(checkMobile());
  }, []);

  const handleGoBack = () => {
    // Go back to the chat page
    router.push(`/chat/private/${recipientId}`);
  };

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading video call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen">
      {/* Back button for mobile */}
      {isMobile && (
        <Button
          onClick={handleGoBack}
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 z-50 bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>
      )}
      
      <VideoCallWindow
        recipientId={recipientId}
        recipientName={recipientName}
        isInitiator={isInitiator}
      />
    </div>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading video call...</p>
        </div>
      </div>
    }>
      <VideoCallContent />
    </Suspense>
  );
}
