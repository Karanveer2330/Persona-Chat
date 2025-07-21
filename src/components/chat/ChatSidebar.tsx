"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { MessageSquare, Users, Globe } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/contexts/AuthContext";
import io from "socket.io-client";

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
}

export default function ChatSidebar({ className }: ChatSidebarProps) {
  const params = useParams();
  const activeChatId = params.chatId || (params.userId ? String(params.userId) : "global");
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState<SidebarChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

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
      const res = await fetch(`http://localhost:5000/api/rooms/${userId}`);
      console.log("Fetch response received:", res);
      if (!res.ok) {
        throw new Error(`Failed to fetch rooms: ${res.status}`);
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
            id: otherUserId,
            type: "private" as const,
            name: otherUser?.name || otherUser?.username || otherUser?.email || otherUser?.id || "Unknown",
            avatarUrl: otherUser?.avatarUrl,
            lastMessage: undefined,
            unreadCount: 0,
            participants: room.users.map((u: any) => ({
              id: String(u._id || u.id),
              name: u.name || u.username || u.email || u.id || "Unknown",
              avatarUrl: u.avatarUrl,
              isOnline: u.isOnline,
            })),
            isOnline: otherUser?.isOnline,
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
          fetch(`http://localhost:5000/api/users/${chat.id}`)
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
      setError(err?.message || "Could not load chats.");
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
      return;
    }
    const s = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = s;

    // Always join global room
    s.emit("joinGlobalRoom");

    // Debug: Log before calling fetchAndSetChats
    console.log("Calling fetchAndSetChats with socket", s);

    // Fetch chats and join private rooms
    fetchAndSetChats(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
    // Only run on mount and when user changes
    // eslint-disable-next-line
  }, [currentUser]);

  // Listen for new private messages and update sidebar
  useEffect(() => {
    const socket = socketRef.current;
    const myId = String(currentUser?.id);
    if (!socket || !currentUser || !myId) return;

    const handleNewMessage = async (msg: any) => {
      if (!msg.recipientId || msg.recipientId === "global") return;
      const senderId = String(msg.senderId);
      const recipientId = String(msg.recipientId);
      const otherUserId = senderId === myId ? recipientId : senderId;

      setChats((prevChats) => {
        const existing = prevChats.find(
          (c) => String(c.id) === otherUserId && c.type === "private"
        );
        if (existing) {
          // Update lastMessage and move to top (after global)
          const updatedChat = {
            ...existing,
            lastMessage: {
              text: msg.content || msg.text,
              senderId: msg.senderId,
              timestamp: msg.timestamp,
            },
            unreadCount:
              existing.id === activeChatId
                ? 0
                : (existing.unreadCount || 0) + (msg.senderId !== myId ? 1 : 0),
          };
          const global = prevChats.find((c) => c.type === "global");
          const others = prevChats.filter(
            (c) => String(c.id) !== otherUserId && c.type === "private"
          );
          return [...(global ? [global] : []), updatedChat, ...others];
        } else {
          // Fetch user info for sidebar (works for both sent and received)
          fetch(`http://localhost:5000/api/users/${otherUserId}`)
            .then((res) => res.json())
            .then((data) => {
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
              };
              setChats((prev) => {
                const global = prev.find((c) => c.type === "global");
                const others = prev.filter((c) => c.type === "private");
                return [...(global ? [global] : []), newChat, ...others];
              });
            });
          return prevChats;
        }
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
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
    let isOnline = chat.isOnline || false;

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
      isOnline = otherUser.isOnline || false;
    }

    return (
      <Link href={href} passHref>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md p-3 transition-colors hover:bg-accent/50",
            isActive ? "bg-accent text-accent-foreground" : "text-foreground"
          )}
        >
          <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-colors">
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
                {isOnline && (
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
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
          {chat.unreadCount && chat.unreadCount > 0 && (
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {chat.unreadCount}
            </span>
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
      <ScrollArea className="h-[calc(100%-140px)] px-2">
        <div className="space-y-1 p-2">
          {/* Always show global chat */}
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