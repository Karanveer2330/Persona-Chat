"use client";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import ChatWindow from "@/src/components/chat/ChatWindow";
import MessageInput from "@/src/components/chat/MessageInput";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Video } from "lucide-react";
import { toast } from "@/src/hooks/use-toast";
import { useVideoCall } from "@/src/hooks/use-video-call";
import { IncomingCallNotification } from "@/src/components/video-call/IncomingCallNotification";
import { User, Message, MediaAttachment } from "@/src/lib/types";

export default function PrivateChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { startCall } = useVideoCall();
  
  // Video call state
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connecting'>('idle');
  
  // Chat state
  const chatPartnerId = params.userId as string;
  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Simple URL helpers
  const API_URL = "http://localhost:3444";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Fetch chat partner
  useEffect(() => {
    if (!chatPartnerId || !currentUser) return;
    
    fetch(`${API_URL}/api/users/${chatPartnerId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const user = data.user || {};
        setChatPartner({
          id: String(user._id || user.id || ""),
          name: user.name || user.username || "Unknown",
          avatarUrl: user.avatarUrl || "",
          isOnline: user.isOnline || false,
        });
      })
      .catch(() => setError("Chat partner not found."));
  }, [chatPartnerId, currentUser]);

  // Create/fetch room
  useEffect(() => {
    if (!currentUser?.id || !chatPartnerId) return;
    
    fetch(`${API_URL}/api/rooms/private`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId1: String(currentUser.id), 
        userId2: String(chatPartnerId) 
      }),
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setRoomId(data.room?._id || null))
      .catch(() => setRoomId(null));
  }, [currentUser, chatPartnerId]);

  // Fetch messages
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    
    fetch(`${API_URL}/api/messages/room/${roomId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const msgs = (data.messages || []).map((msg: any) => ({
          id: msg._id || msg.id,
          chatId: chatPartnerId,
          senderId: msg.sender || msg.senderId,
          senderName: msg.senderName || "Unknown",
          senderAvatarUrl: msg.senderAvatarUrl || "",
          text: msg.content || msg.text || "",
          timestamp: new Date(msg.timestamp),
          media: msg.media || []
        }));
        
        setMessages(msgs.sort((a: Message, b: Message) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [roomId, chatPartnerId]);

  // Socket connection
  useEffect(() => {
    if (!currentUser?.id || !chatPartnerId) return;
    
    const myId = String(currentUser.id);
    const partnerId = String(chatPartnerId);
    
    socketRef.current = io(API_URL);
    const socket = socketRef.current;

    // Register for video calls
    socket.emit("registerForVideoCallNotifications", {
      userId: myId,
      userName: currentUser.name || "Unknown"
    });

    socket.emit("joinPrivateRoom", { userId1: myId, userId2: partnerId });

    // Handle messages
    socket.on("newMessage", (serverMessage: any) => {
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
      
      setMessages(prev => [...prev, clientMessage].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
    });

    // Handle video calls
    socket.on("incomingVideoCall", (callData: any) => {
      console.log("📞 Incoming call:", callData);
      setIncomingCall({
        callerId: callData.callerId,
        callerName: callData.callerName,
        callId: callData.callId,
        timestamp: new Date()
      });
      setCallStatus('ringing');
      
      toast({
        title: "📞 Incoming Video Call",
        description: `${callData.callerName} is calling you!`,
        duration: 30000,
      });
    });

    socket.on("registrationConfirmed", (data: any) => {
      console.log("✅ Registration confirmed:", data);
    });

    socket.on("callInvitationSent", () => setCallStatus('calling'));
    socket.on("callInvitationFailed", (data: any) => {
      setCallStatus('idle');
      setIsCallActive(false);
      toast({ title: "❌ Call Failed", description: data.reason, variant: "destructive" });
    });

    socket.on("callAccepted", (data: any) => {
      setCallStatus('connecting');
      setIncomingCall(null);
      toast({ title: "✅ Call Accepted", description: `${data.recipientName} accepted!` });
    });

    socket.on("callRejected", (data: any) => {
      setCallStatus('idle');
      setIsCallActive(false);
      setIncomingCall(null);
      toast({ title: "❌ Call Declined", description: `${data.recipientName} declined` });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser, chatPartnerId, toast]);

  // Send message
  const handleSendMessage = async (messageText: string, media?: MediaAttachment[]): Promise<void> => {
    const socket = socketRef.current;
    if (!currentUser?.id || !chatPartner || !socket) return;
    if (!messageText.trim() && (!media || media.length === 0)) return;

    socket.emit("sendMessage", {
      content: messageText,
      recipientId: String(chatPartner.id),
      senderId: String(currentUser.id),
      senderName: currentUser.name || "Unknown",
      senderAvatarUrl: currentUser.avatarUrl || "",
      timestamp: new Date(),
      media: media || []
    });
  };

  // Video call handlers
  const handleStartVideoCall = () => {
    if (!chatPartner || !currentUser || !socketRef.current) return;
    
    const callData = {
      callId: `${currentUser.id}-${chatPartner.id}-${Date.now()}`,
      callerId: String(currentUser.id),
      callerName: currentUser.name || 'Unknown',
      recipientId: String(chatPartner.id),
    };
    
    setIsCallActive(true);
    setCallStatus('calling');
    socketRef.current.emit('initiateVideoCall', callData);
    
    toast({
      title: "📞 Calling...",
      description: `Calling ${chatPartner.name}...`,
      duration: 5000,
    });
    
    setTimeout(() => {
      startCall(String(chatPartner.id), chatPartner.name || 'Unknown');
    }, 1000);
  };

  const handleAcceptCall = () => {
    if (!incomingCall || !currentUser || !socketRef.current) return;
    
    socketRef.current.emit('acceptVideoCall', {
      callId: incomingCall.callId,
      callerId: String(incomingCall.callerId),
      recipientId: String(currentUser.id),
      recipientName: currentUser.name || 'Unknown'
    });
    
    setIncomingCall(null);
    setIsCallActive(true);
    setCallStatus('connecting');
    startCall(incomingCall.callerId, incomingCall.callerName, false);
  };

  const handleRejectCall = () => {
    if (!incomingCall || !currentUser || !socketRef.current) return;
    
    socketRef.current.emit('rejectVideoCall', {
      callId: incomingCall.callId,
      callerId: String(incomingCall.callerId),
      recipientId: String(currentUser.id),
      recipientName: currentUser.name || 'Unknown',
      reason: 'Busy'
    });
    
    setIncomingCall(null);
    setCallStatus('idle');
  };

  // Render loading state
  if (authLoading || isLoading || !chatPartner) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          {chatPartner.avatarUrl ? (
            <img
              src={chatPartner.avatarUrl}
              alt={chatPartner.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
              {chatPartner.name[0] || "?"}
            </div>
          )}
          <div>
            <div className="font-semibold">{chatPartner.name}</div>
            <div className="text-xs text-gray-500">
              <span className={`inline-flex items-center gap-1 ${chatPartner.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${chatPartner.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                {chatPartner.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleStartVideoCall}
          disabled={isCallActive}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 px-4 py-2 rounded-full"
        >
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">
            {callStatus === 'calling' ? 'Calling...' : 
             callStatus === 'ringing' ? 'Ringing...' : 
             callStatus === 'connecting' ? 'Connecting...' : 
             'Video Call'}
          </span>
          <span className="sm:hidden">Call</span>
        </Button>
      </div>
      
      {/* Chat content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1">
          <ChatWindow 
            messages={messages} 
            chatPartner={chatPartner}
            user={currentUser || undefined}
          />
        </div>
        <div className="border-t">
          <MessageInput 
            onSendMessage={handleSendMessage}
            chatHistory={messages}
            chatId={roomId || chatPartner.id}
          />
        </div>
      </div>
      
      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallNotification
          incomingCall={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onDismiss={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}
