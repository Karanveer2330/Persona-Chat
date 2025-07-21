"use client";
import ChatWindow from "@/src/components/chat/ChatWindow";
import MessageInput from "@/src/components/chat/MessageInput";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Message, User, MediaAttachment } from "@/src/lib/types";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/src/components/ui/skeleton";
import { io, Socket } from "socket.io-client";

export default function PrivateChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();

  const chatPartnerId = params.userId as string;
  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Fetch chat partner info (allow string ids)
  useEffect(() => {
    if (!chatPartnerId) {
      setChatPartner(null);
      setError("Invalid chat partner ID.");
      return;
    }
    setError(null);
    fetch(`http://localhost:5000/api/users/${chatPartnerId}`)
      .then(res => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then(data => {
        const user = data.user || {};
        setChatPartner({
          id: String(user._id || user.id || ""),
          name: user.name || user.username || user.email || user.id || "Unknown",
          avatarUrl: user.avatarUrl || "",
          isOnline: user.isOnline || false,
        });
      })
      .catch(() => {
        setChatPartner(null);
        setError("Chat partner not found.");
      });
  }, [chatPartnerId]);

  // Fetch or create the private room between the two users (allow string ids)
  useEffect(() => {
    // --- FIX: Only run when currentUser and chatPartnerId are both valid strings ---
    if (!currentUser || !currentUser.id || !chatPartnerId) return;
    const myId = String(currentUser.id);
    const partnerId = String(chatPartnerId);
    if (!myId || !partnerId || myId === partnerId) return;
    fetch("http://localhost:5000/api/rooms/private", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId1: myId,
        userId2: partnerId,
      }),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to create or fetch private room");
        }
        return res.json();
      })
      .then(data => {
        if (data.room && data.room._id) {
          setRoomId(data.room._id);
        } else {
          setRoomId(null);
        }
      })
      .catch((err) => {
        setRoomId(null);
        setError("Could not create or fetch private room.");
        console.error("Private room error:", err);
      });
  }, [currentUser, chatPartnerId]);

  // Fetch message history for the room (if room exists)
  useEffect(() => {
    if (!roomId || !currentUser) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch(`http://localhost:5000/api/messages/room/${roomId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch messages");
        return res.json();
      })
      .then(data => {
        // Transform server message format to client Message interface
        const transformedMessages = (data.messages || []).map((serverMsg: any) => ({
          id: serverMsg._id || serverMsg.id,
          chatId: chatPartnerId,
          senderId: serverMsg.sender || serverMsg.senderId,
          senderName: serverMsg.senderName || "Unknown",
          senderAvatarUrl: serverMsg.senderAvatarUrl || "",
          text: serverMsg.content || serverMsg.text || "",
          timestamp: new Date(serverMsg.timestamp),
          media: serverMsg.media || []
        }));
        
        setMessages(
          transformedMessages.sort(
            (a: Message, b: Message) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [roomId, currentUser]);

  // Initialize socket connection and listen for messages
  useEffect(() => {
    if (!currentUser || !currentUser.id || !chatPartnerId) {
      console.log("Socket init skipped:", { currentUser: !!currentUser, userId: currentUser?.id, chatPartnerId });
      return;
    }
    const myId = String(currentUser.id);
    const partnerId = String(chatPartnerId);
    if (!myId || !partnerId || myId === partnerId) {
      console.log("Socket init failed:", { myId, partnerId, equal: myId === partnerId });
      return;
    }
    
    console.log("Initializing socket for private chat:", { myId, partnerId });
    socketRef.current = io("http://localhost:5000");
    const socket = socketRef.current;

    socket.emit("joinPrivateRoom", {
      userId1: myId,
      userId2: partnerId,
    });

    // Listen for incoming private messages
    const handlePrivateMessage = (serverMessage: any) => {
      console.log("Received message:", serverMessage);
      // Transform server message format to client Message interface
      const clientMessage: Message = {
        id: serverMessage._id || serverMessage.id,
        chatId: chatPartnerId,
        senderId: serverMessage.senderId || serverMessage.sender,
        senderName: serverMessage.senderName || "Unknown",
        senderAvatarUrl: serverMessage.senderAvatarUrl || "",
        text: serverMessage.content || serverMessage.text || "",
        timestamp: new Date(serverMessage.timestamp),
        media: serverMessage.media || []
      };
      
      setMessages(prev =>
        [...prev, clientMessage].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      );
    };

    // Listen for message errors
    const handleMessageError = (error: string) => {
      console.error("Message error from server:", error);
      setError(error);
    };
    
    socket.on("newMessage", handlePrivateMessage);
    socket.on("messageError", handleMessageError);

    return () => {
      socket.off("newMessage", handlePrivateMessage);
      socket.disconnect();
    };
  }, [currentUser, chatPartnerId]);

  // Send message via socket.io (room will be created if not exists)
  const handleSendMessage = async (messageText: string, media?: MediaAttachment[]): Promise<void> => {
    const socket = socketRef.current;
    if (!currentUser || !currentUser.id || !chatPartner || !socket) {
      console.log("Send message failed - missing requirements:", {
        currentUser: !!currentUser,
        userId: currentUser?.id,
        chatPartner: !!chatPartner,
        socket: !!socket
      });
      return;
    }

    const recipientId = String(chatPartner.id || "");
    const senderId = String(currentUser.id);
    if (!recipientId || !senderId || recipientId === senderId) {
      console.log("Send message failed - invalid IDs:", { recipientId, senderId });
      setError("Recipient ID or sender ID missing.");
      return;
    }

    // Ensure we have either content or media
    if (!messageText.trim() && (!media || media.length === 0)) {
      setError("Message must have content or media.");
      return;
    }

    // Clear any previous errors
    setError(null);

    console.log("Sending message:", {
      content: messageText,
      recipientId,
      senderId,
      senderName: currentUser.name || "Unknown",
      media
    });

    socket.emit("sendMessage", {
      content: messageText,  // Server expects 'content', not 'messageText'
      recipientId,
      senderId,
      senderName: currentUser.name || "Unknown",
      senderAvatarUrl: currentUser.avatarUrl || "",
      timestamp: new Date(),
      media: media || []
    });
  };

  // Show error if present
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  // Show skeleton while loading or if chatPartner is not loaded
  if (authLoading || isLoading || !chatPartner) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card p-3 md:p-4 shadow-sm">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              {i % 2 === 0 && <Skeleton className="h-10 w-10 rounded-full" />}
              <Skeleton className={`h-12 w-40 rounded-xl ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
              {i % 2 !== 0 && <Skeleton className="h-10 w-10 rounded-full" />}
            </div>
          ))}
        </div>
        <div className="border-t bg-card p-3 md:p-4">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Show chat partner info at the top, fallback to "Unknown"
  const partnerName = chatPartner?.name || "Unknown";
  const partnerAvatar = chatPartner?.avatarUrl || "";

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card p-3 md:p-4 shadow-sm">
        {partnerAvatar ? (
          <img
            src={partnerAvatar}
            alt={partnerName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
            {partnerName[0] || "?"}
          </div>
        )}
        <div>
          <div className="font-semibold">{partnerName}</div>
          <div className="text-xs text-muted-foreground">Private chat</div>
        </div>
      </div>
      <ChatWindow 
        messages={messages} 
        chatPartner={chatPartner}
        user={currentUser || undefined}
      />
      <MessageInput 
        onSendMessage={handleSendMessage}
        chatHistory={messages}
        chatId={roomId || (chatPartner as any)._id || (chatPartner as any).id}
      />
    </div>
  );
}