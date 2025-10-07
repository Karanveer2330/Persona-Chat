"use client";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import React, { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { createSocketConnection } from "../../../../lib/socket";
import ChatWindow from "@/src/components/chat/ChatWindow";
import MessageInput from "@/src/components/chat/MessageInput";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Video } from "lucide-react";
import { toast } from "@/src/hooks/use-toast";
import { useVideoCall } from "@/src/hooks/use-video-call";
import { useVideoCallNotifications } from "@/src/hooks/use-video-call-notifications-simple";
import { IncomingCallNotification } from "@/src/components/video-call/IncomingCallNotification";
import { User, Message, MediaAttachment } from "@/src/lib/types";

export default function PrivateChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { startCall } = useVideoCall();
  
  // Global video call notifications
  const {
    incomingCall,
    isCallActive,
    callStatus: notificationCallStatus,
    initiateCall,
    acceptCall,
    rejectCall,
    clearIncomingCall,
    endCall
  } = useVideoCallNotifications();
  
  // Debug incoming call state
  useEffect(() => {
    console.log('🔍 Private chat page - incomingCall state:', incomingCall);
    console.log('🔍 Private chat page - isCallActive:', isCallActive);
    console.log('🔍 Private chat page - callStatus:', notificationCallStatus);
  }, [incomingCall, isCallActive, notificationCallStatus]);
  
  // Add client-side check
  const [isClient, setIsClient] = useState(false);
  
  const chatPartnerId = params.userId as string;
  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Fetch chat partner details
  useEffect(() => {
    if (!isClient || !chatPartnerId) return;
    
    if (!chatPartnerId || chatPartnerId === "undefined" || chatPartnerId === "") {
      setError("Invalid chat partner ID.");
      return;
    }
    setError(null);
    
    console.log("🔍 Fetching user data for chatPartnerId:", chatPartnerId);
    
    // Use API utility for HTTPS detection
    const fetchUserData = async () => {
      try {
        console.log("🔍 Making request to:", `/api/users/${chatPartnerId}`);
        
        const response = await fetch(`/api/users/${chatPartnerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout
          signal: AbortSignal.timeout(10000)
        });
        
        console.log("🔍 Response status:", response.status);
        console.log("🔍 Response ok:", response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Response error:", errorText);
          console.log("❌ Response status:", response.status);
          
          // If user not found, create a fallback user object
          if (response.status === 404) {
            console.log("⚠️ User not found, creating fallback user object");
            console.log("⚠️ chatPartnerId:", chatPartnerId);
            setChatPartner({
              id: chatPartnerId,
              name: `User ${chatPartnerId.slice(-4)}`, // Use last 4 chars of ID
              avatarUrl: "",
              isOnline: false,
            });
            console.log("✅ Fallback chat partner set");
            return; // Don't throw error, continue with fallback
          }
          
          console.log("❌ Throwing error for status:", response.status);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("🔍 Response data:", data);
        
        const user = data.user || {};
        console.log("🔍 User object:", user);
        
        if (!user._id && !user.id) {
          throw new Error("User data is missing ID field");
        }
        
        setChatPartner({
          id: String(user._id || user.id || ""),
          name: user.name || user.username || user.email || "Unknown",
          avatarUrl: user.avatarUrl || "",
          isOnline: user.isOnline || false,
        });
        
        console.log("✅ Chat partner set successfully");
      } catch (err: any) {
        console.error("❌ User fetch failed:", err.message);
        console.error("❌ Full error:", err);
        
        // If it's a 404 error, create fallback user instead of showing error
        if (err.message.includes('404')) {
          console.log("⚠️ Catch block - User not found, creating fallback user object");
          setChatPartner({
            id: chatPartnerId,
            name: `User ${chatPartnerId.slice(-4)}`, // Use last 4 chars of ID
            avatarUrl: "",
            isOnline: false,
          });
          console.log("✅ Fallback chat partner set from catch block");
          return; // Don't set error, continue with fallback
        }
        
        setChatPartner(null);
        
        let errorMessage = `Chat partner not found. `;
        if (err.message.includes('fetch') || err.name === 'TypeError') {
          errorMessage += `Network error: ${err.message}. Check if you're connected to the same WiFi network as the server.`;
        } else if (err.message.includes('timeout') || err.name === 'AbortError') {
          errorMessage += `Connection timeout. Server may be unreachable.`;
        } else {
          errorMessage += `Server error: ${err.message}`;
        }
        
        setError(errorMessage);
      }
    };
    
    fetchUserData();
  }, [chatPartnerId, isClient]);

  // Fetch or create the private room between the two users (allow string ids)
  useEffect(() => {
    // --- FIX: Only run when currentUser and chatPartnerId are both valid strings ---
    if (!isClient || !currentUser || !currentUser.id || !chatPartnerId) return;
    const myId = String(currentUser.id);
    const partnerId = String(chatPartnerId);
    if (!myId || !partnerId || myId === partnerId) return;
    
    // Use API utility for HTTPS detection
    const fetchPrivateRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/private`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            userId1: myId,
            userId2: partnerId,
          }),
          // Add timeout
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          throw new Error("Failed to create or fetch private room");
        }
        const data = await response.json();
        if (data.room && data.room._id) {
          setRoomId(data.room._id);
        } else {
          setRoomId(null);
        }
      } catch (err: any) {
        console.error("❌ Private room creation failed:", {
          error: err.message,
          stack: err.stack,
          requestBody: { userId1: myId, userId2: partnerId },
          isTimeout: err.name === 'AbortError'
        });
        setRoomId(null);
        const errorMsg = err.name === 'AbortError' 
          ? 'Request timeout - please check your network connection'
          : err.message.includes('fetch') 
            ? 'Network connection failed - make sure backend server is running'
            : err.message;
        setError(`Could not create or fetch private room. Error: ${errorMsg}`);
      }
    };
    
    fetchPrivateRoom();
  }, [currentUser, chatPartnerId, isClient]);

  // Fetch message history for the room (if room exists)
  useEffect(() => {
    if (!roomId || !currentUser) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages/room/${roomId}`);
        
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        
        // Transform server message format to client Message interface
        const transformedMessages = (data.messages || []).map((serverMsg: any) => {
          console.log('🔍 Private chat - Processing message:', serverMsg);
          console.log('🔍 Private chat - Message media:', serverMsg.media);
          
          const transformedMsg = {
            id: serverMsg._id || serverMsg.id,
            chatId: chatPartnerId,
            senderId: serverMsg.sender || serverMsg.senderId,
            senderName: serverMsg.senderName || "Unknown",
            senderAvatarUrl: serverMsg.senderAvatarUrl || "",
            text: serverMsg.content || serverMsg.text || "",
            timestamp: new Date(serverMsg.timestamp),
            media: serverMsg.media || []
          };
          
          console.log('🔍 Private chat - Transformed message:', transformedMsg);
          console.log('🔍 Private chat - Transformed media:', transformedMsg.media);
          
          return transformedMsg;
        });
        
        setMessages(
          transformedMessages.sort(
            (a: Message, b: Message) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
  }, [roomId, currentUser]);

  // Listen for call acceptance to redirect caller to Persona3D page
  useEffect(() => {
    if (notificationCallStatus === 'connecting' && isCallActive && chatPartner) {
      console.log('🎉 Call accepted! Redirecting to Persona3D page...');
      
      // Set preference for Persona3D calls
      localStorage.setItem('prefer-persona3d-calls', 'true');
      
      // Redirect to Persona3D video call page
      setTimeout(() => {
        startCall(String(chatPartner.id), chatPartner.name || 'Unknown');
      }, 500);
    }
  }, [notificationCallStatus, isCallActive, chatPartner, startCall]);

  // Initialize socket connection and listen for messages
  useEffect(() => {
    if (!isClient || !currentUser || !currentUser.id || !chatPartnerId) {
      console.log("Socket init skipped:", { isClient, currentUser: !!currentUser, userId: currentUser?.id, chatPartnerId });
      return;
    }
    const myId = String(currentUser.id);
    const partnerId = String(chatPartnerId);
    if (!myId || !partnerId || myId === partnerId) {
      console.log("Socket init failed:", { myId, partnerId, equal: myId === partnerId });
      return;
    }
    
    console.log("🔗 Initializing socket for private chat:", { myId, partnerId });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
    
    // Create socket connection with automatic HTTPS detection
    console.log("🔗 Creating socket connection...");
    createSocketConnection().then(socket => {
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log("✅ Socket connected successfully!", {
          socketId: socket.id,
          connected: socket.connected,
          url: window?.location?.protocol === 'https:' ? `https://${window.location.hostname}:3444` : `http://${window.location.hostname}:3444`
        });
        
        // Note: Video call registration is handled by ChatSidebar to avoid conflicts
        console.log("📝 Video call registration handled by ChatSidebar");

        console.log("🚪 Joining private room...");
        socket.emit("joinPrivateRoom", {
          userId1: myId,
          userId2: partnerId,
        });
      });

      socket.on('connect_error', (error) => {
        console.error("❌ Socket connection error:", error);
        setError(`Connection failed: ${error.message}`);
      });

      socket.on('disconnect', (reason) => {
        console.log("🔌 Socket disconnected:", reason);
      });

      // Listen for incoming private messages
      const handlePrivateMessage = (serverMessage: any) => {
        console.log("📨 Received message from server:", serverMessage);
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
        
        console.log("✅ Processed client message:", clientMessage);
        
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => 
            msg.id === clientMessage.id || 
            (msg.text === clientMessage.text && 
             msg.senderId === clientMessage.senderId && 
             Math.abs(new Date(msg.timestamp).getTime() - new Date(clientMessage.timestamp).getTime()) < 1000)
          );
          
          if (messageExists) {
            console.log("🔄 Message already exists, skipping duplicate:", clientMessage.id);
            return prev;
          }
          
          console.log("✅ Adding new message:", clientMessage.id);
          return [...prev, clientMessage].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      };

      // Listen for user status updates
      socket.on('userStatusUpdate', (data: { userId: string; isOnline: boolean; name?: string }) => {
        console.log("📡 User status update received:", data);
        
        // Update chat partner's online status if this update is for them
        if (String(data.userId) === String(partnerId)) {
          console.log(`🟢 Updating ${chatPartner?.name || 'chat partner'} online status to: ${data.isOnline}`);
          setChatPartner(prev => prev ? {
            ...prev,
            isOnline: data.isOnline
          } : null);
        }
      });

      // Listen for current online users response
      socket.on('currentOnlineUsers', (onlineUsers: Array<{ userId: string; name: string; isOnline: boolean }>) => {
        console.log("📋 Received current online users:", onlineUsers);
        
        // Find if our chat partner is online
        const partnerOnlineStatus = onlineUsers.find(u => String(u.userId) === String(partnerId));
        if (partnerOnlineStatus) {
          console.log(`🔄 Setting ${chatPartner?.name || 'chat partner'} online status to: ${partnerOnlineStatus.isOnline}`);
          setChatPartner(prev => prev ? {
            ...prev,
            isOnline: partnerOnlineStatus.isOnline
          } : null);
        }
      });

      // Request current online status of all users
      socket.emit('requestOnlineUsers');

      // Listen for new messages
      socket.on('newMessage', handlePrivateMessage);

      // Listen for message errors
      const handleMessageError = (error: string) => {
        console.error("❌ Message error from server:", error);
        setError(error);
      };

      // Listen for video call notifications on the main socket
      const handleIncomingVideoCall = (callData: any) => {
        console.log("🔔 Incoming video call received on main socket:", callData);
        
        // Set incoming call state - this is handled by the hook
        // setIncomingCall is not available directly, it's managed internally
        
        // Show incoming call notification directly here
        toast({
          title: "📞 Incoming Video Call",
          description: `${callData.callerName} is calling you!`,
          duration: 30000,
        });

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Incoming call from ${callData.callerName}`, {
            body: 'Click to answer the video call',
            icon: '/favicon.ico'
          });
        }
      };

      const handleRegistrationConfirmed = (data: any) => {
        console.log("✅ Video call registration confirmed on main socket:", data);
        
        // Show a toast
        toast({
          title: "✅ Registration Confirmed",
          description: `Ready to receive calls! ${data.connectedUsers} users online`,
          duration: 5000,
        });
      };

      const handleCallInvitationSent = (data: any) => {
        console.log("📤 Call invitation sent:", data);
      };

      const handleCallInvitationFailed = (data: any) => {
        console.error("❌ Call invitation failed:", data);
        toast({
          title: "❌ Call Failed",
          description: data.reason || "Could not reach the user",
          variant: "destructive",
        });
      };

      const handleCallAccepted = (data: any) => {
        console.log("✅ Call accepted:", data);
        clearIncomingCall();
        toast({
          title: "✅ Call Accepted",
          description: `${data.recipientName} accepted your call!`,
          duration: 3000,
        });
      };

      const handleCallRejected = (data: any) => {
        console.log("❌ Call rejected:", data);
        clearIncomingCall();
        toast({
          title: "❌ Call Declined",
          description: `${data.recipientName} declined the call`,
          variant: "destructive",
        });
      };
      
      const handleTestResponse = (data: any) => {
        console.log('🧪 Test response received:', data);
      };

      socket.on("newMessage", handlePrivateMessage);
      socket.on("messageError", handleMessageError);
      socket.on("registrationConfirmed", handleRegistrationConfirmed);
      socket.on("incomingVideoCall", handleIncomingVideoCall);
      socket.on("callInvitationSent", handleCallInvitationSent);
      socket.on("callInvitationFailed", handleCallInvitationFailed);
      socket.on("callAccepted", handleCallAccepted);
      socket.on("callRejected", handleCallRejected);
      socket.on("testResponse", handleTestResponse);

      // Store cleanup function
      const cleanup = () => {
        socket.off("newMessage", handlePrivateMessage);
        socket.off("messageError", handleMessageError);
        socket.off("registrationConfirmed", handleRegistrationConfirmed);
        socket.off("incomingVideoCall", handleIncomingVideoCall);
        socket.off("callInvitationSent", handleCallInvitationSent);
        socket.off("callInvitationFailed", handleCallInvitationFailed);
        socket.off("callAccepted", handleCallAccepted);
        socket.off("callRejected", handleCallRejected);
        socket.off("testResponse", handleTestResponse);
        socket.disconnect();
      };

      // Store socket reference
      socketRef.current = socket;
    }).catch(error => {
      console.error("❌ Failed to create socket connection:", error);
      setError(`Connection failed: ${error.message}`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser, chatPartnerId, toast, isClient]);

  // Send message via socket.io (room will be created if not exists)
  const handleSendMessage = async (messageText: string, media?: MediaAttachment[]): Promise<void> => {
    const socket = socketRef.current;
    console.log("🚀 handleSendMessage called with:", {
      messageText,
      mediaCount: media?.length || 0,
      socketConnected: socket?.connected,
      socketId: socket?.id,
      currentUser: currentUser?.id,
      chatPartner: chatPartner?.id
    });

    if (!currentUser || !currentUser.id || !chatPartner || !socket) {
      console.log("❌ Send message failed - missing requirements:", {
        currentUser: !!currentUser,
        userId: currentUser?.id,
        chatPartner: !!chatPartner,
        socket: !!socket,
        socketConnected: socket?.connected
      });
      return;
    }

    const recipientId = String(chatPartner.id || "");
    const senderId = String(currentUser.id);
    if (!recipientId || !senderId || recipientId === senderId) {
      console.log("❌ Send message failed - invalid IDs:", { recipientId, senderId });
      setError("Recipient ID or sender ID missing.");
      return;
    }

    // Ensure we have either content or media
    if (!messageText.trim() && (!media || media.length === 0)) {
      console.log("❌ Send message failed - no content or media");
      setError("Message must have content or media.");
      return;
    }

    // Clear any previous errors
    setError(null);

    const messageData = {
      content: messageText,  // Server expects 'content', not 'messageText'
      recipientId,
      senderId,
      senderName: currentUser.name || "Unknown",
      senderAvatarUrl: currentUser.avatarUrl || "",
      timestamp: new Date(),
      media: media || [],
      roomId: roomId  // Add roomId for message persistence
    };

    console.log("📤 Emitting sendMessage with data:", messageData);

    try {
      socket.emit("sendMessage", messageData);
      console.log("✅ Message emitted successfully");
    } catch (err) {
      console.error("❌ Error emitting message:", err);
      setError("Failed to send message");
    }
  };

  // Show loading for SSR or client hydration
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if present
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="text-red-500 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Chat Error</h2>
          <p className="mb-4 text-sm">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => router.push('/chat/users')} variant="default" className="w-full bg-blue-600 hover:bg-blue-700">
              Go to Users Page
            </Button>
            <Button onClick={() => router.push('/chat')} variant="outline" className="w-full">
              Back to Chat
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton while loading or if chatPartner is not loaded
  if (authLoading || isLoading || !chatPartner) {
    return (
      <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
        {/* Header skeleton */}
        <div className="sticky top-0 z-20 flex-shrink-0 flex items-center gap-3 border-b bg-white dark:bg-gray-900 p-3 md:p-4 shadow-md">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        
        {/* Chat content skeleton */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 p-4 space-y-4 min-h-0">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                {i % 2 === 0 && <Skeleton className="h-10 w-10 rounded-full" />}
                <Skeleton className={`h-12 w-40 rounded-xl ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
                {i % 2 !== 0 && <Skeleton className="h-10 w-10 rounded-full" />}
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 border-t bg-card p-3 md:p-4">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Show loading if authentication is still loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (this will be handled by useEffect)
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show chat partner info at the top, fallback to "Unknown"
  const partnerName = chatPartner?.name || "Unknown";
  const partnerAvatar = chatPartner?.avatarUrl || "";

  const handleStartVideoCall = () => {
    if (chatPartner && currentUser && socketRef.current) {
      const socket = socketRef.current;
      const callId = `${currentUser.id}-${chatPartner.id}-${Date.now()}`;
      
      const callData = {
        callId,
        callerId: String(currentUser.id),
        callerName: currentUser.name || 'Unknown',
        recipientId: String(chatPartner.id),
      };
      
      console.log('📞 Starting video call via main socket:', {
        ...callData,
        recipientName: chatPartner.name,
        socketConnected: socket.connected,
        socketId: socket.id
      });
      
      // Set local call state
      
      // Send invitation through main socket
      socket.emit('initiateVideoCall', callData);

      console.log('✅ Video call invitation sent to server:', callData);

      toast({
        title: "📞 Calling...",
        description: `Inviting ${chatPartner.name} to 3D video call...`,
        duration: 5000,
      });
      
      // Wait a moment then start the video call window
      setTimeout(() => {
        startCall(String(chatPartner.id), chatPartner.name || 'Unknown');
        
        // Reset call state after video window loads
        setTimeout(() => {
        }, 3000);
      }, 1000);
          } else {
        console.error('❌ Cannot start video call: missing requirements', {
          chatPartner: !!chatPartner,
          currentUser: !!currentUser,
          socket: !!socketRef.current,
          socketConnected: socketRef.current?.connected
        });
      
      toast({
        title: "❌ Call Failed",
        description: "Connection issue. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartPersona3DVideoCall = () => {
    if (chatPartner && currentUser) {
      console.log('🎭 Starting Persona3D video call via global hook:', {
        callerId: currentUser.id,
        callerName: currentUser.name,
        recipientId: chatPartner.id,
        recipientName: chatPartner.name
      });
      
      // Use the global notification hook to initiate the call
      const callId = initiateCall(String(chatPartner.id), chatPartner.name || 'Unknown');
      
      if (callId) {
        console.log('✅ Persona3D video call initiated with callId:', callId);
        console.log('⏳ Waiting for recipient to accept the call...');
        
        // Don't redirect immediately - wait for call acceptance
        // The redirect will happen when the call is accepted via the notification hook
      } else {
        console.error('❌ Failed to initiate Persona3D video call');
        toast({
          title: "❌ Call Failed",
          description: "Could not initiate call. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.error('❌ Cannot start Persona3D video call: missing requirements', {
        chatPartner: !!chatPartner,
        currentUser: !!currentUser
      });
      
      toast({
        title: "❌ Call Failed",
        description: "Connection issue. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };


  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (incomingCall && currentUser) {
      console.log('✅ Accepting Persona3D video call:', incomingCall);
      
      // Use the global notification hook to accept the call
      acceptCall(incomingCall.callId, incomingCall.callerId, incomingCall.callerName);
      
      // Start the Persona3D video call window
      setTimeout(() => {
        localStorage.setItem('prefer-persona3d-calls', 'true');
        startCall(String(incomingCall.callerId), incomingCall.callerName);
      }, 500);
    }
  };

  // Handle incoming call rejection
  const handleRejectCall = async () => {
    if (incomingCall) {
      console.log('❌ Rejecting Persona3D video call:', incomingCall);
      
      // Use the global notification hook to reject the call
      rejectCall(incomingCall.callId, incomingCall.callerId, 'Call declined');
    }
  };

  // Handle dismissing incoming call notification
  const handleDismissCall = () => {
    console.log('🚫 Dismissing incoming call notification');
    clearIncomingCall();
  };

  // Show loading if authentication is still loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (this will be handled by useEffect)
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
      {/* Header - ensuring it's visible and properly positioned */}
      <div className="sticky top-0 z-20 flex-shrink-0 flex items-center justify-between border-b bg-white dark:bg-gray-900 p-3 md:p-4 shadow-md">`
        <div className="flex items-center gap-3">
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
            <div className="font-semibold text-gray-900 dark:text-white">{partnerName}</div>
            <div className="text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 ${chatPartner?.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${chatPartner?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                {chatPartner?.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Persona3D Video Call Button */}
          <Button 
            onClick={handleStartPersona3DVideoCall}
            disabled={isCallActive}
            className={`persona3d-call-btn ${isCallActive ? 'opacity-50 cursor-not-allowed' : ''} bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 px-4 py-2 rounded-full font-semibold relative overflow-hidden group`}
            title={isCallActive ? "Call in progress" : "Launch Persona3D video call with dual modes"}
          >
            <Video className="h-4 w-4 animate-pulse group-hover:animate-bounce" />
            <span className="hidden sm:inline text-sm">
              {notificationCallStatus === 'calling' ? 'Calling...' : 
               notificationCallStatus === 'ringing' ? 'Ringing...' : 
               notificationCallStatus === 'connecting' ? 'Connecting...' : 
               notificationCallStatus === 'rejected' ? 'Call Declined' :
               notificationCallStatus === 'failed' ? 'Call Failed' :
               '🎭 Persona3D'}
            </span>
            <span className="sm:hidden">
              {isCallActive ? (notificationCallStatus === 'calling' ? 'Calling' : 
                              notificationCallStatus === 'ringing' ? 'Ringing' :
                              notificationCallStatus === 'connecting' ? 'Connecting' : 'Calling') : '🎭'}
            </span>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
          </Button>
        </div>
      </div>
      
      {/* Chat content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0">
          <ChatWindow 
            messages={messages} 
            chatPartner={chatPartner || undefined}
            user={currentUser || undefined}
          />
        </div>
        <div className="flex-shrink-0 border-t">
          <MessageInput 
            onSendMessage={handleSendMessage}
            chatHistory={messages}
            chatId={roomId || (chatPartner as any)._id || (chatPartner as any).id}
          />
        </div>
      </div>
      
      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallNotification
          incomingCall={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onDismiss={handleDismissCall}
        />
      )}
    </div>
  );
}