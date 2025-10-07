"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { MessageSquare, Users, Globe, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/contexts/AuthContext";
import { createSocketConnection } from "../../lib/socket";

interface ChatSidebarProps {
  className?: string;
}

interface SidebarChat {
  id: string;
  type: "global" | "private";
  name: string;
  avatarUrl?: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount?: number;
  participants?: Array<{ id: string; name: string; avatarUrl?: string; isOnline?: boolean }>;
  isOnline?: boolean;
  roomId?: string; // For private chats
  otherUserId?: string; // For private chats
}

export default function ChatSidebar({ className }: ChatSidebarProps) {
  const params = useParams();
  const activeChatId = params.userId ? String(params.userId) : (params.chatId || "global");
  console.log("Active chat ID:", activeChatId, "Params:", params);
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState<SidebarChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  // Clear unread count when viewing a chat
  useEffect(() => {
    if (activeChatId) {
      setChats(prevChats => 
        prevChats.map(chat => {
          // Clear unread count for global chat
          if (activeChatId === "global" && chat.type === "global") {
            return { ...chat, unreadCount: 0 };
          }
          // Clear unread count for private chats
          if (activeChatId !== "global" && String(chat.id) === String(activeChatId)) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        })
      );
    }
  }, [activeChatId]);

  // Debug: Log currentUser whenever it changes
  useEffect(() => {
    console.log("currentUser changed:", currentUser);
  }, [currentUser]);

  // Helper to fetch and set chats, and join private rooms
  const fetchAndSetChats = async (socketInstance?: any) => {
    const userId = currentUser?.id;
    if (!currentUser || !userId) {
      setChats([
        {
          id: "global",
          type: "global",
          name: "Global Chat",
          avatarUrl: "",
          lastMessage: undefined,
          unreadCount: 0,
        },
      ]);
      setError("You must be logged in to view chats.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Debug log for userId and endpoint
      console.log("Fetching rooms for userId:", userId);
      // Use relative API paths to leverage Next.js rewrites (avoids SSL/mixed-content issues on mobile)
      
      // First, test server connectivity
      try {
        const testRes = await fetch(`/api/test`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        console.log("Server connectivity test:", testRes.ok ? "SUCCESS" : "FAILED");
        if (!testRes.ok) {
          throw new Error(`Server test failed: ${testRes.status}`);
        }
      } catch (testErr) {
        console.error("Server connectivity test failed:", testErr);
        
        // Check if it's a certificate error
        if (testErr instanceof Error && testErr.message.includes('Failed to fetch')) {
          throw new Error(`SSL Certificate Error: Please visit https://localhost:9443 and accept the certificate, then refresh this page.`);
        }
        
        throw new Error(`Cannot connect to server. Please ensure the backend is running. Test error: ${testErr instanceof Error ? testErr.message : 'Unknown error'}`);
      }
      
      // Retry mechanism for better resilience
      let res;
      let lastError;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt} to fetch rooms...`);
          res = await fetch(`/api/rooms/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            // Add timeout for mobile networks
            signal: AbortSignal.timeout(10000)
          });
          console.log("Fetch response received:", res);
          if (!res.ok) {
            throw new Error(`Failed to fetch rooms: ${res.status} ${res.statusText}`);
          }
          break; // Success, exit retry loop
        } catch (fetchErr) {
          lastError = fetchErr;
          console.warn(`Attempt ${attempt} failed:`, fetchErr);
          if (attempt === maxRetries) {
            throw fetchErr; // Re-throw on final attempt
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      if (!res) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await res.json();
      console.log("Rooms API response:", data);
      console.log("Rooms details:", data.rooms?.map((room: any) => ({
        roomId: room._id,
        users: room.users?.map((u: any) => ({
          _id: u._id,
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email
        }))
      })));
      if (!data.rooms || !Array.isArray(data.rooms) || data.rooms.length === 0) {
        console.warn("No private rooms found for user:", userId);
      }
      const privateChats: SidebarChat[] = (data.rooms || [])
        .map((room: any, roomIndex: number) => {
          const otherUser = room.users.find(
            (u: any) => String(u._id || u.id) !== String(userId)
          );
          const otherUserId = otherUser?._id ? String(otherUser._id) : String(otherUser?.id || "");
          
          // Skip if no valid other user ID found
          if (!otherUserId || otherUserId === "undefined" || otherUserId === "") {
            return null;
          }

          return {
            id: otherUserId, // Use other user ID for navigation
            type: "private" as const,
            name: otherUser?.name || otherUser?.username || otherUser?.email || otherUser?.id || "Unknown",
            avatarUrl: otherUser?.avatarUrl,
            lastMessage: undefined,
            unreadCount: 0,
            participants: room.users.map((u: any) => ({
              id: String(u._id || u.id),
              name: u.name || u.username || u.email || u.id || "Unknown",
              avatarUrl: u.avatarUrl,
              isOnline: u.isOnline !== undefined ? u.isOnline : false, // Default to offline if field missing
            })),
            isOnline: otherUser?.isOnline !== undefined ? otherUser.isOnline : false, // Default to offline if field missing
            roomId: room._id, // Store room ID for reference
            otherUserId: otherUserId, // Store other user ID for reference
          };
        })
        .filter((chat: SidebarChat | null): chat is SidebarChat => chat !== null)
        .filter((chat: SidebarChat, index: number, array: SidebarChat[]) => {
          // Remove duplicates by checking if this is the first occurrence of this ID
          return array.findIndex((c: SidebarChat) => c.id === chat.id) === index;
        });

      setChats([
        {
          id: "global",
          type: "global",
          name: "Global Chat",
          avatarUrl: "",
          lastMessage: undefined,
          unreadCount: 0,
        },
        ...privateChats,
      ]);

      // --- PATCH: Fetch missing user info for chats with "Unknown" name ---
      privateChats.forEach((chat, idx) => {
        if (chat.name === "Unknown" && chat.id) {
          // Use relative path so Next.js rewrites proxy to backend
          fetch(`/api/users/${chat.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data && data.user) {
                setChats(prevChats => {
                  // Update only the matching chat
                  return prevChats.map(c =>
                    c.id === chat.id
                      ? {
                          ...c,
                          name: data.user.name || data.user.username || data.user.email || "Unknown",
                          avatarUrl: data.user.avatarUrl || "",
                        }
                      : c
                  );
                });
              }
            })
            .catch(err => {
              console.warn(`Failed to fetch user info for chat ${chat.id}:`, err);
            });
        }
      });
      // Join all private rooms
      if (socketInstance) {
        (data.rooms || []).forEach((room: any) => {
          if (room.users && room.users.length === 2) {
            const [user1, user2] = room.users.map((u: any) => String(u._id));
            socketInstance.emit("joinPrivateRoom", { userId1: user1, userId2: user2 });
          }
        });
      }
    } catch (err: any) {
      // Log error for debugging
      console.error("Error fetching chats:", err);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Network error';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection.';
        } else if (err.message.includes('Failed to fetch')) {
          const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          errorMessage = `SSL Certificate Error: Please visit https://${host}:9443 in your browser and accept the certificate, then refresh this page.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setChats([
        {
          id: "global",
          type: "global",
          name: "Global Chat",
          avatarUrl: "",
          lastMessage: undefined,
          unreadCount: 0,
        },
      ]);
      setError(`Failed to load chats: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialize socket and fetch chats
  useEffect(() => {
    console.log("useEffect for fetchAndSetChats running", currentUser);

    // --- FIX: Accept either _id or id for user check ---
    const userId = currentUser?.id;
    if (!currentUser || !userId) {
      console.log("No currentUser or currentUser._id/id, skipping fetchAndSetChats");
      // Clean up any existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    
    // Clean up existing socket before creating new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Create socket connection with automatic HTTPS detection
    console.log("Creating new socket connection for user:", userId);
    createSocketConnection().then(s => {
      socketRef.current = s;

      // Wait for socket to connect before emitting events
      s.on('connect', () => {
      console.log("Socket connected, joining rooms and setting online status");
      
      // Always join global room
      s.emit("joinGlobalRoom");

      // Send user online status
      if (currentUser?.id) {
        // Register for video call notifications (this also handles userOnline functionality)
        s.emit("registerForVideoCallNotifications", {
          userId: currentUser.id,
          userName: currentUser.name || "Unknown"
        });
        console.log("Emitted registerForVideoCallNotifications:", { userId: currentUser.id, userName: currentUser.name });
        
        // Immediately mark this user as online in the UI
        setChats(prevChats => 
          prevChats.map(chat => {
            if (chat.type === "private" && String(chat.otherUserId) === String(currentUser.id)) {
              return { ...chat, isOnline: true };
            }
            if (chat.participants) {
              const updatedParticipants = chat.participants.map(p => 
                String(p.id) === String(currentUser.id) ? { ...p, isOnline: true } : p
              );
              return { ...chat, participants: updatedParticipants };
            }
            return chat;
          })
        );
        
        // Online users list will be automatically sent by server after registration
      }
    });

    // Listen for current online users response
    s.on("currentOnlineUsers", (onlineUsers: Array<{ userId: string; name: string; isOnline: boolean }>) => {
      console.log("📋 Received current online users:", onlineUsers);
      console.log("📋 Online users details:", onlineUsers.map(u => ({ userId: u.userId, name: u.name, isOnline: u.isOnline })));
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.type === "private" && chat.otherUserId) {
            const onlineUser = onlineUsers.find(u => String(u.userId) === String(chat.otherUserId));
            if (onlineUser) {
              console.log(`🔄 Setting ${chat.name} online status to: ${onlineUser.isOnline}`);
              return { ...chat, isOnline: onlineUser.isOnline };
            }
          }
          return chat;
        });
        console.log("📊 Updated chats with online status:", updatedChats.map(c => ({ name: c.name, isOnline: c.isOnline })));
        return updatedChats;
      });
    });

    // Listen for user status updates
    s.on("userStatusUpdate", (data: { userId: string; isOnline: boolean; name?: string }) => {
      console.log("📡 User status update received:", data);
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          let updated = false;
          let newChat = { ...chat };
          
          // For private chats, check if the status update is for the other user
          if (chat.type === "private" && String(chat.otherUserId) === String(data.userId)) {
            console.log(`🟢 Updating online status for ${chat.name}: ${data.isOnline}`);
            newChat.isOnline = data.isOnline;
            updated = true;
          }
          
          // Also update participants array
          if (chat.participants) {
            const updatedParticipants = chat.participants.map(p => 
              String(p.id) === String(data.userId) ? { ...p, isOnline: data.isOnline } : p
            );
            const hasUpdated = updatedParticipants.some((p, i) => p.isOnline !== chat.participants![i].isOnline);
            if (hasUpdated) {
              newChat.participants = updatedParticipants;
              updated = true;
              console.log(`👥 Updated participant status for ${data.userId}: ${data.isOnline}`);
            }
          }
          
          return updated ? newChat : chat;
        });
        
        console.log("📊 Updated chats state:", updatedChats.map(c => ({ 
          name: c.name, 
          type: c.type, 
          isOnline: c.isOnline,
          participants: c.participants?.map(p => ({ name: p.name, isOnline: p.isOnline }))
        })));
        
        return updatedChats;
      });
    });

    // Listen for video call notifications
    s.on("incomingVideoCall", (callData: any) => {
      console.log("📞 Incoming video call in ChatSidebar:", callData);
      // The video call notification will be handled by the private chat page
      // This is just for logging purposes
    });

    s.on("registrationConfirmed", (data: any) => {
      console.log("✅ Video call registration confirmed in ChatSidebar:", data);
    });

    // Debug: Log before calling fetchAndSetChats
    console.log("Calling fetchAndSetChats with socket", s);

    // Fetch chats and join private rooms
    fetchAndSetChats(s);

    return () => {
      console.log("Cleaning up socket connection");
      if (s) {
        s.disconnect();
      }
      socketRef.current = null;
    };
  }).catch(error => {
    console.error("Failed to create socket connection:", error);
  });
    // Only run on mount and when user changes
    // eslint-disable-next-line
  }, [currentUser]);

  // Listen for new private messages and update sidebar
  useEffect(() => {
    const socket = socketRef.current;
    const myId = String(currentUser?.id);
    if (!socket || !currentUser || !myId) return;

    // Notification sound function
    const playNotificationSound = () => {
      try {
        // Create a simple notification sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log("Could not play notification sound:", error);
      }
    };

    // Handle global chat messages for notifications
    const handleGlobalMessage = (msg: any) => {
      console.log("Global message received in sidebar:", msg);
      
      const senderId = String(msg.senderId);
      
      // Play notification sound and update counter if message is from someone else and not currently viewing global chat
      if (senderId !== myId && activeChatId !== "global") {
        playNotificationSound();
        
        setChats((prevChats) => {
          return prevChats.map(chat => {
            if (chat.type === "global") {
              return {
                ...chat,
                lastMessage: {
                  text: msg.text || msg.content || "Media",
                  senderId: msg.senderId,
                  timestamp: msg.timestamp,
                },
                unreadCount: (chat.unreadCount || 0) + 1,
              };
            }
            return chat;
          });
        });
      }
    };

    const handleNewMessage = async (msg: any) => {
      console.log("New message received in sidebar:", msg);
      
      // Handle room-based messages (private chats)
      if (msg.roomId) {
        const senderId = String(msg.senderId);
        
        // Play notification sound if message is from someone else
        if (senderId !== myId) {
          playNotificationSound();
        }

        setChats((prevChats) => {
          return prevChats.map(chat => {
            // Find the chat by room ID
            if (chat.type === "private" && String(chat.roomId) === String(msg.roomId)) {
              const updatedChat = {
                ...chat,
                lastMessage: {
                  text: msg.content || msg.text || "Media",
                  senderId: msg.senderId,
                  timestamp: msg.timestamp,
                },
                unreadCount: (String(chat.id) === String(activeChatId) || senderId === myId) 
                  ? 0 
                  : (chat.unreadCount || 0) + 1,
              };
              return updatedChat;
            }
            return chat;
          });
        });
        return;
      }

      // Handle legacy user-based messages (fallback)
      if (!msg.recipientId || msg.recipientId === "global") return;
      const senderId = String(msg.senderId);
      const recipientId = String(msg.recipientId);
      const otherUserId = senderId === myId ? recipientId : senderId;

      // Play notification sound if message is for current user
      if (recipientId === myId && senderId !== myId) {
        playNotificationSound();
      }

      setChats((prevChats) => {
        const existing = prevChats.find(
          (c) => String(c.otherUserId) === otherUserId && c.type === "private"
        );
        if (existing) {
          // Update lastMessage and unread count
          const updatedChat = {
            ...existing,
            lastMessage: {
              text: msg.content || msg.text,
              senderId: msg.senderId,
              timestamp: msg.timestamp,
            },
            unreadCount:
              String(existing.id) === String(activeChatId)
                ? 0
                : (existing.unreadCount || 0) + (msg.senderId !== myId ? 1 : 0),
          };
          const global = prevChats.find((c) => c.type === "global");
          const others = prevChats.filter(
            (c) => String(c.otherUserId) !== otherUserId && c.type === "private"
          );
          return [...(global ? [global] : []), updatedChat, ...others];
        } else {
          // Create new chat entry for unknown user (legacy support)
          // Handle this asynchronously outside of setState
          (async () => {
            try {
              const response = await fetch(`/api/users/${otherUserId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(5000)
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data?.user) {
                  const user = data.user;
                  const newChat: SidebarChat = {
                    id: String(user._id || user.id),
                    type: "private",
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    lastMessage: {
                      text: msg.content || msg.text,
                      senderId: msg.senderId,
                      timestamp: msg.timestamp,
                    },
                    unreadCount: msg.senderId !== myId ? 1 : 0,
                    participants: [
                      {
                        id: String(user._id || user.id),
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                        isOnline: user.isOnline,
                      },
                    ],
                    isOnline: user.isOnline,
                    otherUserId: String(user._id || user.id),
                  };
                  setChats((prev) => {
                    const global = prev.find((c) => c.type === "global");
                    const others = prev.filter((c) => c.type === "private");
                    return [...(global ? [global] : []), newChat, ...others];
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch user info for new message from ${otherUserId}:`, err);
            }
          })();
          return prevChats;
        }
      });
    };

    socket.on("globalMessage", handleGlobalMessage); // Listen for global chat messages
    socket.on("newMessage", handleNewMessage);
    socket.on("newRoomMessage", handleNewMessage); // Also listen for room-based messages

    return () => {
      socket.off("globalMessage", handleGlobalMessage);
      socket.off("newMessage", handleNewMessage);
      socket.off("newRoomMessage", handleNewMessage);
    };
  }, [currentUser, activeChatId]);

  const globalChat = chats.find((c) => c.type === "global");
  const privateChats = chats.filter((c) => c.type === "private");

  const ChatListItem = ({ chat }: { chat: SidebarChat }) => {
    const isActive = String(chat.id) === String(activeChatId);
    const href =
      chat.type === "global" ? "/chat/global" : `/chat/private/${chat.id}`;
    let displayName = chat.name || "Unknown";
    let avatarUrl = chat.avatarUrl || "";
    let fallbackText = displayName.substring(0, 2).toUpperCase();
    let isOnline = chat.isOnline !== undefined ? chat.isOnline : false; // Default to offline
    console.log(`💡 Chat ${displayName} isOnline:`, isOnline, 'chat.isOnline:', chat.isOnline);

    if (
      chat.type === "private" &&
      chat.participants &&
      chat.participants.length > 0 &&
      currentUser
    ) {
      const myId = String(currentUser.id);
      const otherUser =
        chat.participants.find(
          (p) => String(p.id) !== myId
        ) || chat.participants[0];
      displayName = otherUser.name || "Unknown";
      avatarUrl = otherUser.avatarUrl || "";
      fallbackText = displayName.substring(0, 2).toUpperCase();
      isOnline = otherUser.isOnline !== undefined ? otherUser.isOnline : false; // Default to offline
      console.log(`👤 Participant ${displayName} isOnline:`, isOnline, 'otherUser.isOnline:', otherUser.isOnline);
    }

    return (
      <Link href={href} passHref>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-accent/50",
            isActive ? "bg-accent text-accent-foreground" : "text-foreground"
          )}
        >
          <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-colors relative">
            {chat.type === "global" ? (
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-full bg-muted",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Globe className="h-5 w-5" />
              </div>
            ) : (
              <>
                <AvatarImage
                  src={avatarUrl}
                  alt={displayName}
                  data-ai-hint="user avatar"
                />
                <AvatarFallback
                  className={cn(isActive && "bg-primary text-primary-foreground")}
                >
                  {fallbackText}
                </AvatarFallback>
                {/* Enhanced online status indicator - more visible */}
                {isOnline && chat.type === "private" && (
                  <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-white shadow-lg">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-sm" />
                  </div>
                )}
              </>
            )}
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium">{displayName}</p>
            {chat.lastMessage && (
              <p
                className={cn(
                  "truncate text-xs",
                  isActive
                    ? "text-accent-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {String(chat.lastMessage.senderId) === String(currentUser?.id)
                  ? "You: "
                  : ""}
                {chat.lastMessage.text}
              </p>
            )}
          </div>
          {/* Enhanced notification badge */}
          {chat.unreadCount && chat.unreadCount > 0 && (
            <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white animate-bounce">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className={cn("h-full border-r bg-card", className)}>
      <div className="p-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> Chats
        </h2>
      </div>
      
      {/* PersonaPlay3D Navigation */}
      <div className="px-4 pb-4">
        <Link href="/persona3d" passHref>
          <div className="flex items-center gap-3 rounded-md p-3 transition-all hover:bg-primary/10 hover:scale-105 border border-primary/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">PersonaPlay3D</p>
              <p className="text-xs text-muted-foreground">3D Avatar Video Experience</p>
            </div>
          </div>
        </Link>
      </div>
      
      <ScrollArea className="h-[calc(100%-200px)] px-2">
        <div className="space-y-1 p-2">
          {/* Show global chat with proper unread count */}
          {globalChat ? (
            <ChatListItem key="global" chat={globalChat} />
          ) : (
            <ChatListItem
              key="global"
              chat={{
                id: "global",
                type: "global",
                name: "Global Chat",
                avatarUrl: "",
                lastMessage: undefined,
                unreadCount: 0,
              }}
            />
          )}
          <div className="my-3 px-3 text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> Private Messages
          </div>
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">
              Loading...
            </div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-red-500 italic">{error}</div>
          ) : privateChats.length > 0 ? (
            privateChats.map((chat, index) => (
              <ChatListItem key={`private-${chat.id || index}`} chat={chat} />
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">
              No private messages yet.
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">
          Real-time updates via Socket.IO (Private chat auto-appears)
        </p>
      </div>
    </div>
  );
}