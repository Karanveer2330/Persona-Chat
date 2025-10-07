"use client";
import type { Message, User, TypingUser } from '@/src/lib/types';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useRouter } from "next/navigation";
import MediaDisplay from './MediaDisplay';
import MessageReactions from './MessageReactions';
import MessageStatus from './MessageStatus';
import TypingIndicator from './TypingIndicator';
import { MessageSquare } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  chatPartner?: User | { name: string, type: 'global' };
  isLoading?: boolean;
  user?: User;
  onStartPrivateChat?: (user: { id: string, name: string }) => void;
  typingUsers?: TypingUser[];
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
}

type PopoverState = {
  msg: Message;
  rect: DOMRect;
} | null;

export default function ChatWindow({ 
  messages, 
  chatPartner, 
  isLoading, 
  user, 
  onStartPrivateChat,
  typingUsers = [],
  onAddReaction,
  onRemoveReaction
}: ChatWindowProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(scrollToBottom, [chatPartner]);

  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [popover]);

  // Mobile-specific: Close popover on touch (but not on popover itself)
  useEffect(() => {
    if (!popover) return;
    const close = (e: TouchEvent) => {
      // Don't close if touch is on the popover or its children
      const target = e.target as HTMLElement;
      if (target.closest('[data-popover]')) return;
      setPopover(null);
    };
    window.addEventListener("touchstart", close);
    return () => window.removeEventListener("touchstart", close);
  }, [popover]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              {i % 2 === 0 && <Skeleton className="h-10 w-10 rounded-full" />}
              <div className={`flex flex-col max-w-[70%] ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
                <Skeleton className={`h-12 w-48 rounded-xl ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
              {i % 2 !== 0 && <Skeleton className="h-10 w-10 rounded-full" />}
            </div>
          ))}
        </ScrollArea>
        <div className="border-t bg-card p-3 md:p-4">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-2 md:p-4 pt-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
            <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mb-4" />
            <p className="text-base md:text-lg text-center">No messages yet.</p>
            <p className="text-sm md:text-base text-center">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            // Always compare as strings and fallback to other possible id fields
            const senderId = String(
              msg.senderId ||
              (msg as any).sender || // <-- support history messages
              (msg as any).userId ||
              (msg as any).userid ||
              (msg as any).user_id ||
              ""
            );
            const userId = String(
              user?.id ||
              (user as any)?.userId ||
              (user as any)?.userid ||
              (user as any)?._id ||
              ""
            );
            const isOwn = user && senderId && senderId === userId;

            const senderName =
              typeof msg.senderName === "string" && msg.senderName.length > 0
                ? msg.senderName
                : (msg as any).username || (msg as any).email || (msg as any).name || msg.id || "Unknown";
            // Use msg.id, msg._id, or create a truly unique fallback key
            const key = msg.id || (msg as any)._id || `message-${index}-${senderId}-${msg.timestamp || Date.now()}`;
            
            // Get message text from either text or content field
            const messageText = msg.text || (msg as any).content || '';
            
            return (
              <div
                key={key}
                data-message-id={msg.id}
                className={`flex items-end gap-3 mb-4 relative ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {/* Avatar */}
                {!isOwn && (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {senderName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                {/* Message bubble and username */}
                <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                  <div className="relative flex items-center">
                    <span
                      className="font-semibold text-primary hover:underline cursor-pointer"
                      onClick={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setPopover({
                          msg,
                          rect
                        });
                      }}
                    >
                      {senderName}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl px-4 py-2 mt-1 ${
                      isOwn
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-white text-black rounded-bl-none"
                    }`}
                  >
                    {messageText && <div className="whitespace-pre-wrap">{messageText}</div>}
                    {msg.media && msg.media.length > 0 && (
                      <div className={messageText ? "mt-2" : ""}>
                        <MediaDisplay media={msg.media} />
                      </div>
                    )}
                  </div>
                  
                  {/* Message Reactions */}
                  <div className="mt-1">
                    <MessageReactions
                      key={`${msg.id}-${(msg.reactions || []).length}`}
                      messageId={msg.id}
                      reactions={msg.reactions || []}
                      onAddReaction={onAddReaction || (() => {})}
                      onRemoveReaction={onRemoveReaction || (() => {})}
                    />
                  </div>
                  
                  {/* Message Status and Timestamp */}
                  <div className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                    <span className={`text-xs text-muted-foreground ${isOwn ? "mr-1" : "ml-1"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && (
                      <MessageStatus message={msg} />
                    )}
                  </div>
                </div>
                {/* Own avatar */}
                {isOwn && (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {typeof user?.name === "string" && user.name.length > 0
                        ? user.name.substring(0, 2).toUpperCase()
                        : (user as any)?.username?.substring(0, 2).toUpperCase() ||
                          (user as any)?.email?.substring(0, 2).toUpperCase() ||
                          user?.id?.substring(0, 2).toUpperCase() ||
                          "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        
        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />
      </ScrollArea>
      {/* Popover for private chat */}
      {popover && (
        <div
          data-popover
          className="fixed z-50 bg-white border rounded shadow-lg p-4 min-w-[180px]"
          style={{
            left: popover.rect.left + popover.rect.width / 2,
            top: popover.rect.top - 120,
            transform: "translate(-50%, 0)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white border-l border-b border-gray-200 rotate-45 z-[-1]" />
          <div className="font-bold mb-2">{popover.msg.senderName || "Unknown"}</div>
          <button
            className="mt-2 inline-block px-3 py-1 bg-primary text-white rounded hover:bg-primary/80"
            onClick={() => {
              console.log('🚨 TALK PRIVATE BUTTON CLICKED - Mobile Debug:');
              console.log('🚨 User agent:', navigator.userAgent);
              console.log('🚨 Screen width:', window.innerWidth);
              console.log('🚨 Is mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
              
              // Try all possible sender id fields - prioritize senderId over id
              const targetUserId =
                popover.msg.senderId ||
                (popover.msg as any).sender ||
                (popover.msg as any).userId ||
                (popover.msg as any).userid ||
                (popover.msg as any).user_id;
                // Note: Removed popover.msg.id because that's the message ID, not user ID
                
              console.log('🚨 TARGET USER ID DEBUG:');
              console.log('🚨 popover.msg:', popover.msg);
              console.log('🚨 popover.msg.senderId:', popover.msg.senderId);
              console.log('🚨 popover.msg.id:', popover.msg.id);
              console.log('🚨 Final targetUserId:', targetUserId);
              
              // Mobile fallback: if no valid user ID, redirect to users page
              if (!targetUserId || targetUserId === popover.msg.id) {
                console.log('🚨 Invalid user ID detected, redirecting to users page');
                window.location.href = '/chat/users';
                return;
              }

              // Try all possible current user id fields
              const currentUserId =
                user?.id ||
                (user as any)?.userId ||
                (user as any)?.userid ||
                (user as any)?._id;

              // Validate both IDs
              if (
                onStartPrivateChat &&
                targetUserId &&
                popover.msg.senderName &&
                currentUserId &&
                String(targetUserId) !== String(currentUserId)
              ) {
                onStartPrivateChat({ id: targetUserId, name: popover.msg.senderName });
              }
              setPopover(null);
              
              // Create/find room and navigate to room-based private chat
              if (targetUserId && String(targetUserId) !== String(currentUserId)) {
                // Start private chat by creating/finding room
                const startPrivateChat = async () => {
                  try {
                    // Dynamic API URL for mobile compatibility
                    const getApiUrl = () => {
                      if (typeof window !== 'undefined') {
                        const hostname = window.location.hostname;
                        const protocol = window.location.protocol;
                        if (hostname === 'localhost' || hostname === '127.0.0.1') {
                          return protocol === 'https:' ? "https://localhost:3443" : "http://localhost:3444";
                        } else {
                          return protocol === 'https:' ? `https://${hostname}:3443` : `http://${hostname}:3444`;
                        }
                      }
                      return "https://localhost:3443";
                    };
                    
                    console.log('🚨 PRIVATE CHAT DEBUG:');
                    console.log('🚨 Current User ID:', currentUserId);
                    console.log('🚨 Target User ID:', targetUserId);
                    console.log('🚨 Current User:', user);
                    console.log('🚨 Making request to:', `${getApiUrl()}/api/rooms/private`);
                    
                    const requestBody = {
                      userId1: currentUserId,
                      userId2: targetUserId,
                    };
                    console.log('🚨 Request body:', requestBody);
                    
                    const response = await fetch(`${getApiUrl()}/api/rooms/private`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify(requestBody),
                    });
                    
                    if (!response.ok) {
                      console.error('Server response:', response.status, response.statusText);
                      throw new Error(`Failed to create room: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    const roomId = data.room._id;
                    
                    console.log('🚨 Room created/found with ID:', roomId);
                    console.log('🚨 Redirecting to target user ID:', targetUserId);
                    
                    // Mobile-specific navigation handling
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
                    const redirectUrl = `/chat/private/${targetUserId}`;
                    
                    if (isMobile) {
                      console.log('📱 Mobile device detected, using window.location for navigation');
                      window.location.href = redirectUrl;
                    } else {
                      console.log('🖥️ Desktop device detected, using router.push');
                      router.push(redirectUrl);
                    }
                  } catch (error) {
                    console.error('Error starting private chat:', error);
                    // Fallback to users page if room creation fails
                    router.push('/chat/users');
                  }
                };
                
                startPrivateChat();
              }
            }}
          >
            Talk Private
          </button>
          <button
            className="ml-2 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setPopover(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}