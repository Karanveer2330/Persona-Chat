"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Room {
  _id: string;
  users: Array<{
    _id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    isOnline?: boolean;
  }>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
    senderName: string;
  };
  createdAt: string;
}

export default function PrivateChatPage() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setLoading(false);
      return;
    }

    fetchRooms();
  }, [isAuthenticated, currentUser]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);

      // Dynamic API URL for mobile compatibility
      const getApiUrl = () => {
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return "http://localhost:3444";
          } else {
            return `http://${hostname}:3444`;
          }
        }
        return "http://localhost:3444";
      };

      const response = await fetch(`${getApiUrl()}/api/rooms/${currentUser?.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.status}`);
      }

      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch private chats');
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = (room: Room) => {
    return room.users.find(user => user._id !== currentUser?.id);
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <MessageSquare className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Authentication Required</h2>
        <p className="text-gray-500 text-center">Please log in to view your private chats.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading private chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <MessageSquare className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
        <p className="text-red-500 text-center mb-4">{error}</p>
        <button
          onClick={fetchRooms}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mobile-optimized header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-bold">💬 Private Chats</h1>
        </div>
        <p className="text-sm opacity-90">Your private conversations</p>
      </div>

      {/* Chats list */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Private Chats Yet</h3>
            <p className="text-gray-500 mb-4">Start a conversation with someone from the Users page.</p>
            <Link
              href="/chat/users"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Users
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rooms.map((room) => {
              const otherUser = getOtherUser(room);
              if (!otherUser) return null;

              return (
                <Link
                  key={room._id}
                  href={`/chat/private/${otherUser._id}`}
                  className="flex items-center p-4 hover:bg-gray-50 transition-colors touch-manipulation"
                >
                  <div className="relative mr-3">
                                         <Avatar className="w-12 h-12">
                       <AvatarImage 
                         src={otherUser.avatarUrl} 
                         alt={otherUser.name}
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                         }}
                       />
                       <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-semibold">
                         {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                       </AvatarFallback>
                     </Avatar>
                    {otherUser.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {otherUser.name}
                      </h3>
                      {room.lastMessage && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatLastMessageTime(room.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500 truncate">
                      @{otherUser.username}
                    </p>
                    
                    {room.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {room.lastMessage.senderId === currentUser?.id ? 'You: ' : ''}
                        {room.lastMessage.text}
                      </p>
                    )}
                    
                    {otherUser.isOnline && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Online
                      </p>
                    )}
                  </div>
                  
                  <ArrowLeft className="w-5 h-5 text-gray-400 ml-2 rotate-180" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
