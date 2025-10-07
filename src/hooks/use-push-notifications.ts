"use client";

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/src/hooks/use-toast';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission({
        granted: Notification.permission === 'granted',
        denied: Notification.permission === 'denied',
        default: Notification.permission === 'default'
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive"
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings",
        variant: "destructive"
      });
      return false;
    }

    const result = await Notification.requestPermission();
    const granted = result === 'granted';
    
    setPermission({
      granted,
      denied: result === 'denied',
      default: result === 'default'
    });

    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll now receive chat notifications",
      });
    } else {
      toast({
        title: "Notifications disabled",
        description: "You won't receive chat notifications",
        variant: "destructive"
      });
    }

    return granted;
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!permission.granted || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Don't show notification if the page is visible
    if (!document.hidden) {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Close when user clicks
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [permission.granted]);

  const showChatNotification = useCallback((senderName: string, messageText: string, chatType: 'global' | 'private' = 'global') => {
    const title = chatType === 'private' ? `Message from ${senderName}` : `New message in Global Chat`;
    const body = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
    
    showNotification(title, {
      body,
      tag: `chat-${chatType}`,
      requireInteraction: false
    });
  }, [showNotification]);

  const showVideoCallNotification = useCallback((callerName: string) => {
    showNotification(`Incoming video call from ${callerName}`, {
      body: 'Click to answer the call',
      tag: 'video-call',
      requireInteraction: true
    });
  }, [showNotification]);

  return {
    permission,
    requestPermission,
    showNotification,
    showChatNotification,
    showVideoCallNotification,
    isSupported: typeof window !== 'undefined' && 'Notification' in window
  };
}
