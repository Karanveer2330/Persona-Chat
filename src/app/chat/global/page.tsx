"use client";
import ChatWindow from "@/src/components/chat/ChatWindow";
import MessageInput from "@/src/components/chat/MessageInput";
import MessageSearch from "@/src/components/chat/MessageSearch";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Message, MediaAttachment, TypingUser, MessageReaction } from "@/src/lib/types";
import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { usePushNotifications } from "@/src/hooks/use-push-notifications";

export default function GlobalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user, isAuthenticated, loading } = useAuth();
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showChatNotification, requestPermission } = usePushNotifications();

  // Connect to socket only once when component mounts and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Prefer page protocol to avoid mixed content; if HTTPS, connect to the SAME host you're on at 3443; otherwise mobile 5000
    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname; // e.g., 192.168.x.x or localhost
        const protocol = window.location.protocol;
        if (protocol === 'https:') return `https://${hostname}:3443`;
        return `http://${hostname}:3444`;
      }
      return "https://localhost:3443";
    };
    
    const url = getSocketUrl();
    const socket = io(url, {
      transports: url.startsWith('https://') ? ['websocket'] : ['websocket', 'polling'],
      secure: url.startsWith('https://'),
      rejectUnauthorized: false
    });
    socketRef.current = socket;
    
    // Join global room and send user online status
    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit("joinGlobalRoom");
      
      if (user?.id) {
        socket.emit("userOnline", { userId: user.id, name: user.name });
        }
      
      // Force re-run of message listener when socket connects
      });
    
    socket.on('disconnect', () => {
      setSocketConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // New feature event handlers
    socket.on('typingStart', (data: { userId: string; userName: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, userName: data.userName, timestamp: new Date() }];
        });
      }
    });
    
    socket.on('typingStop', (data: { userId: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    });
    
    socket.on('messageReaction', (data: { messageId: string; reaction: MessageReaction }) => {
      setMessages(prev => prev.map(msg => {
        const msgIdStr = String(msg.id);
        const dataMsgIdStr = String(data.messageId);
        if (msgIdStr === dataMsgIdStr) {
          const reactions = msg.reactions || [];
          const existingIndex = reactions.findIndex(r => 
            r.userId === data.reaction.userId && r.emoji === data.reaction.emoji
          );
          
          if (existingIndex >= 0) {
            // Remove existing reaction
            const newReactions = reactions.filter((_, index) => index !== existingIndex);
            return {
              ...msg,
              reactions: newReactions
            };
          } else {
            // Add new reaction
            const newReactions = [...reactions, data.reaction];
            return {
              ...msg,
              reactions: newReactions
            };
          }
        }
        return msg;
      }));
    });
    
    socket.on('messageStatusUpdate', (data: { messageId: string; status: string; readBy?: any[] }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            status: data.status as any,
            readBy: data.readBy || msg.readBy
          };
        }
        return msg;
      }));
    });
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  // Fetch messages and normalize to always have senderId and senderName
  useEffect(() => {
    setIsLoadingMessages(true);
    
    // Use relative API path (Next.js rewrite proxies to backend)
    fetch(`/api/messages/global`)
      .then(res => res.json())
      .then(data => {
        const normalized = data.messages.map((msg: any) => {
          const normalizedMsg = {
            ...msg,
            id: msg._id || msg.id, // Ensure id is set from MongoDB _id
            senderId: msg.senderId || (msg.user && (msg.user._id || msg.user.id)) || "",
            senderName: msg.senderName || (msg.user && msg.user.name) || "Unknown",
            media: msg.media || [],
            reactions: msg.reactions || []
          };
          
          return normalizedMsg;
        });
        setMessages(
          normalized.sort(
            (a: Message, b: Message) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
        setIsLoadingMessages(false);
      })
      .catch(() => setIsLoadingMessages(false));
  }, []);

  // Listen for incoming global messages and normalize
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }

    const handleGlobalMessage = (message: any) => {
      const normalizedMsg = {
        ...message,
        id: message._id || message.id, // Ensure id is set from MongoDB _id
        senderId: message.senderId || "",
        senderName: message.senderName || "Unknown",
        media: message.media || [],
        reactions: message.reactions || []
      };
      
      setMessages(prev => {
        const updated = [...prev, normalizedMsg].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return updated;
      });
    };

    socket.on("globalMessage", handleGlobalMessage);
    
    // Add debugging for specific socket events
    socket.on('connect', () => {
      });
    
    socket.on('disconnect', (reason) => {
      });
    
    socket.on('connect_error', (error) => {
      });

    return () => {
      socket.off("globalMessage", handleGlobalMessage);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [socketConnected]);

  // Always send senderId and senderName (use _id if available)
  const handleSendMessage = async (messageText: string, media?: MediaAttachment[]): Promise<void> => {
    const socket = socketRef.current;
    if (!user || !socket) {
      return;
    }

    // Ensure we have either content or media
    if (!messageText.trim() && (!media || media.length === 0)) {
      return;
    }

    const messageData = {
      text: messageText,
      senderId: user.id,
      senderName: user.name,
      timestamp: new Date().toISOString(),
      media: media || []
    };

    try {
      );
      socket.emit("sendGlobalMessage", messageData);
      } catch (err) {
      console.error('❌ Global chat - Error emitting message:', err);
    }
  };

  // Typing indicator handlers
  const handleTypingStart = () => {
    if (socketRef.current && user) {
      socketRef.current.emit('typingStart', { userId: user.id, userName: user.name });
    }
  };

  const handleTypingStop = () => {
    if (socketRef.current && user) {
      socketRef.current.emit('typingStop', { userId: user.id });
    }
  };

  // Message reaction handlers
  const handleAddReaction = (messageId: string, emoji: string) => {
    if (socketRef.current && user) {
      const reaction: MessageReaction = {
        emoji,
        userId: user.id,
        userName: user.name,
        timestamp: new Date()
      };
      socketRef.current.emit('messageReaction', { messageId, reaction });
    }
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    if (socketRef.current && user) {
      const reaction: MessageReaction = {
        emoji,
        userId: user.id,
        userName: user.name,
        timestamp: new Date()
      };
      socketRef.current.emit('messageReaction', { messageId, reaction });
    }
  };

  // Enhanced message highlighting function
  const handleMessageClick = (messageId: string) => {
    setHighlightedMessageId(messageId);
    
    // Try to find the message element
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      // Scroll to the message
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add a prominent highlight effect
      element.classList.add(
        'ring-4', 
        'ring-primary', 
        'ring-opacity-75', 
        'bg-primary/10',
        'transition-all',
        'duration-300'
      );
      
      // Create pulsing effect
      setTimeout(() => {
        element.classList.add('animate-pulse');
      }, 100);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        element.classList.remove(
          'ring-4', 
          'ring-primary', 
          'ring-opacity-75', 
          'bg-primary/10',
          'animate-pulse'
        );
        setHighlightedMessageId(null);
      }, 3000);
    } else {
      setTimeout(() => setHighlightedMessageId(null), 3000);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if (isAuthenticated) {
      requestPermission();
    }
  }, [isAuthenticated, requestPermission]);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p>Please log in to access the chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
      {/* Mobile-optimized header - now sticky */}
      <div className="sticky top-0 z-10 flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">🌍 Global Chat</h1>
            <p className="text-sm opacity-90">
              Connected users worldwide
              {searchResults.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {searchResults.length} search result{searchResults.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <MessageSearch 
            messages={messages} 
            onSearchResults={setSearchResults}
            onMessageClick={handleMessageClick}
          />
        </div>
      </div>
      
      {/* Chat content */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatWindow
          messages={messages}
          chatPartner={{ name: "Global Chat", type: "global" }}
          isLoading={isLoadingMessages}
          user={user || undefined}
          typingUsers={typingUsers}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
        />
        <div className="flex-shrink-0">
          <MessageInput
            onSendMessage={handleSendMessage}
            chatHistory={messages}
            chatId="global"
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </div>
      </div>
    </div>
  );
}
