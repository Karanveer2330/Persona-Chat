"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { Button } from '@/src/components/ui/button';
import { MessageSquare, Users as UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export default function UsersPage() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setLoading(false);
      return;
    }

    fetchUsers();
  }, [isAuthenticated, currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use relative path; Next.js rewrites proxy to backend (3444 HTTP / 3443 HTTPS)
      const response = await fetch(`/api/users`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter out current user
      const filteredUsers = data.users?.filter((user: User) => 
        user._id !== currentUser?.id
      ) || [];
      
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const startPrivateChat = async (otherUserId: string) => {
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

      const response = await fetch(`${getApiUrl()}/api/rooms/private`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: currentUser?.id,
          userId2: otherUserId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create room: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.room?._id) {
        // Navigate to the private chat using target user ID
        router.push(`/chat/private/${otherUserId}`);
      } else {
        throw new Error('Invalid room data received');
      }
    } catch (err) {
      console.error('Error creating private chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to start private chat');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <UsersIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Authentication Required</h2>
        <p className="text-gray-500 text-center">Please log in to view users and start private chats.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <UsersIcon className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
        <p className="text-red-500 text-center mb-4">{error}</p>
        <Button onClick={fetchUsers} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mobile-optimized header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-lg font-bold">👥 Users</h1>
        <p className="text-sm opacity-90">Start a private conversation</p>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto p-4">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Users Found</h3>
            <p className="text-gray-500">There are no other users available right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                                         <Avatar className="w-12 h-12">
                       <AvatarImage 
                         src={user.avatarUrl} 
                         alt={user.name}
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                         }}
                       />
                       <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                         {user.name?.charAt(0)?.toUpperCase() || '?'}
                       </AvatarFallback>
                     </Avatar>
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      @{user.username}
                    </p>
                    {user.isOnline && (
                      <p className="text-xs text-green-600 font-medium">
                        Online
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => startPrivateChat(user._id)}
                  size="sm"
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white touch-manipulation"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

