"use client";

import { useState, useCallback } from 'react';

export interface VideoCallState {
  isOpen: boolean;
  recipientId: string | null;
  recipientName: string | null;
  isInitiator: boolean;
  popupWindow: Window | null;
}

export function useVideoCall() {
  const [callState, setCallState] = useState<VideoCallState>({
    isOpen: false,
    recipientId: null,
    recipientName: null,
    isInitiator: false,
    popupWindow: null
  });

  const startCall = useCallback((recipientId: string, recipientName: string, isInitiator: boolean = true) => {
    // Check if Persona3D video call is preferred
    const usePersona3D = localStorage.getItem('prefer-persona3d-calls') === 'true';
    
    const videoCallUrl = usePersona3D 
      ? `/persona3d-video-call?recipientId=${encodeURIComponent(recipientId)}&recipientName=${encodeURIComponent(recipientName)}&isInitiator=${isInitiator}`
      : `/video-call?recipientId=${encodeURIComponent(recipientId)}&recipientName=${encodeURIComponent(recipientName)}&isInitiator=${isInitiator}`;
    
    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    window.innerWidth <= 768;
    
    if (isMobile) {
      // On mobile, redirect to video call page instead of popup
      window.location.href = videoCallUrl;
      
      setCallState({
        isOpen: true,
        recipientId,
        recipientName,
        isInitiator,
        popupWindow: null
      });
    } else {
      // On desktop, use popup window
      const popupFeatures = usePersona3D 
        ? 'width=1400,height=900,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no'
        : 'width=800,height=600,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no';
      const popup = window.open(videoCallUrl, usePersona3D ? 'Persona3DVideoCall' : 'VideoCall', popupFeatures);
      
      if (popup) {
        setCallState({
          isOpen: true,
          recipientId,
          recipientName,
          isInitiator,
          popupWindow: popup
        });

        // Listen for popup close
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setCallState({
              isOpen: false,
              recipientId: null,
              recipientName: null,
              isInitiator: false,
              popupWindow: null
            });
          }
        }, 1000);
      } else {
        // Popup blocked or failed, fallback to redirect
        window.location.href = videoCallUrl;
        
        setCallState({
          isOpen: true,
          recipientId,
          recipientName,
          isInitiator,
          popupWindow: null
        });
      }
    }
  }, []);

  const endCall = useCallback(() => {
    if (callState.popupWindow && !callState.popupWindow.closed) {
      callState.popupWindow.close();
    }
    setCallState({
      isOpen: false,
      recipientId: null,
      recipientName: null,
      isInitiator: false,
      popupWindow: null
    });
  }, [callState.popupWindow]);

  const answerCall = useCallback((recipientId: string, recipientName: string) => {
    startCall(recipientId, recipientName, false);
  }, [startCall]);

  return {
    callState,
    startCall,
    endCall,
    answerCall
  };
}
