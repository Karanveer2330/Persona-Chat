"use client";
import ChatWindow from "@/src/components/chat/ChatWindow";
import MessageInput from "@/src/components/chat/MessageInput";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Message, MediaAttachment } from "@/src/lib/types";
import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export default function GlobalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user, isAuthenticated, loading } = useAuth();
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  let curr;

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    socketRef.current.emit("joinGlobalRoom");
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Fetch messages and normalize to always have senderId and senderName
  useEffect(() => {
    setIsLoadingMessages(true);
    fetch("http://localhost:5000/api/messages/global")
      .then(res => res.json())
      .then(data => {
        const normalized = data.messages.map((msg: any) => ({
          ...msg,
          senderId: msg.senderId || (msg.user && (msg.user._id || msg.user.id)) || "",
          senderName: msg.senderName || (msg.user && msg.user.name) || "Unknown",
          media: msg.media || []
        }));
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
    if (!socket) {
      console.log('Socket not available for message listener');
      return;
    }

    console.log('Setting up globalMessage listener');

    const handleGlobalMessage = (message: any) => {
      console.log('Received global message:', message);
      console.log('Message media:', message.media);
      
      const normalizedMsg = {
        ...message,
        senderId: message.senderId || "",
        senderName: message.senderName || "Unknown",
        media: message.media || []
      };
      
      console.log('Normalized message:', normalizedMsg);
      
      setMessages(prev => {
        const updated = [...prev, normalizedMsg].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        console.log('Updated messages array:', updated);
        return updated;
      });
    };

    socket.on("globalMessage", handleGlobalMessage);
    
    // Add debugging for all socket events
    socket.onAny((eventName, data) => {
      console.log('Socket received event:', eventName, data);
    });

    return () => {
      console.log('Cleaning up globalMessage listener');
      socket.off("globalMessage", handleGlobalMessage);
      socket.offAny();
    };
  }, []);

  // Always send senderId and senderName (use _id if available)
  const handleSendMessage = async (messageText: string, media?: MediaAttachment[]): Promise<void> => {
    const socket = socketRef.current;
    if (!user || !socket) return;

    // Ensure we have either content or media
    if (!messageText.trim() && (!media || media.length === 0)) {
      return;
    }

    console.log('Sending global message:', { 
      text: messageText, 
      senderId: user.id, 
      mediaCount: media?.length || 0,
      media 
    });

    socket.emit("sendGlobalMessage", {
      text: messageText,
      senderId: user.id,
      senderName: user.name,
      timestamp: new Date().toISOString(),
      media: media || []
    });
  };

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
    <div className="flex flex-col h-full">
      <ChatWindow
        messages={messages}
        chatPartner={{ name: "Global Chat", type: "global" }}
        isLoading={isLoadingMessages}
        user={user || undefined}
      />
      <MessageInput
        onSendMessage={handleSendMessage}
        chatHistory={messages}
        chatId="global"
      />
    </div>
  );
}