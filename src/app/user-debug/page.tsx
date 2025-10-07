"use client";

import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { useAuth } from '@/src/contexts/AuthContext';

export default function UserDebugTool() {
  const { user: currentUser } = useAuth();
  const [userId, setUserId] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const fetchUser = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setUserData(null);

    try {
      console.log('🔍 Fetching user with ID:', userId);
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Response data:', data);
      
      setUserData(data.user);
    } catch (err: any) {
      console.error('❌ User fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching all users...');
      
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 All users data:', data);
      
      setAllUsers(data.users || []);
    } catch (err: any) {
      console.error('❌ Users fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              User Debug Tool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current User Info */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Current User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-300">ID:</span> <span className="text-white font-mono">{currentUser?.id || 'Not logged in'}</span></div>
                  <div><span className="text-gray-300">Name:</span> <span className="text-white">{currentUser?.name || 'N/A'}</span></div>
                  <div><span className="text-gray-300">Email:</span> <span className="text-white">{currentUser?.email || 'N/A'}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* User Lookup */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Lookup User by ID</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID..."
                    className="flex-1"
                  />
                  <Button onClick={fetchUser} disabled={loading}>
                    {loading ? 'Loading...' : 'Fetch User'}
                  </Button>
                </div>
                
                {userData && (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <h3 className="text-green-200 font-semibold mb-2">User Found:</h3>
                    <div className="space-y-1 text-sm text-green-100">
                      <div><span className="text-green-300">ID:</span> <span className="font-mono">{userData._id || userData.id}</span></div>
                      <div><span className="text-green-300">Name:</span> {userData.name || userData.username}</div>
                      <div><span className="text-green-300">Username:</span> {userData.username}</div>
                      <div><span className="text-green-300">Email:</span> {userData.email}</div>
                      <div><span className="text-green-300">Avatar:</span> {userData.avatarUrl || 'None'}</div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <h3 className="text-red-200 font-semibold mb-2">Error:</h3>
                    <p className="text-red-100 text-sm">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Users */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg">All Users</CardTitle>
                  <Button onClick={fetchAllUsers} disabled={loading} variant="outline">
                    {loading ? 'Loading...' : 'Fetch All Users'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allUsers.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allUsers.map((user) => (
                      <div key={user._id} className="bg-gray-800/50 rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-semibold">{user.name || user.username}</div>
                            <div className="text-gray-400">@{user.username}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-300 font-mono text-xs">{user._id}</div>
                            <Button
                              onClick={() => setUserId(user._id)}
                              size="sm"
                              variant="outline"
                              className="mt-1"
                            >
                              Use ID
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    No users loaded. Click "Fetch All Users" to load them.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-blue-900/30 border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-200 text-lg">Debug Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2">
                <p>1. Check your current user ID above</p>
                <p>2. Click "Fetch All Users" to see all available users</p>
                <p>3. Copy a user ID and paste it in the lookup field</p>
                <p>4. Click "Fetch User" to test the API endpoint</p>
                <p>5. Check browser console for detailed logs</p>
                <p>6. If a user is not found, check if the ID is correct</p>
                <p><strong>Note:</strong> User IDs should be MongoDB ObjectIds (24 character hex strings)</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







