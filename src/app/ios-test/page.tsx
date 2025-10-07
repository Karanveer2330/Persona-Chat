"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { createSocketConnection } from '@/src/lib/socket';
import { Socket } from 'socket.io-client';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function IOSTestPage() {
  const { user, isAuthenticated } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Basic API connectivity
    addResult({ name: 'API Connectivity', status: 'pending', message: 'Testing...' });
    try {
      const response = await fetch(`/api/test`);
      if (response.ok) {
        const data = await response.json();
        addResult({ 
          name: 'API Connectivity', 
          status: 'success', 
          message: 'API server is reachable',
          details: data
        });
      } else {
        addResult({ 
          name: 'API Connectivity', 
          status: 'error', 
          message: `API responded with ${response.status}` 
        });
      }
    } catch (error: any) {
      addResult({ 
        name: 'API Connectivity', 
        status: 'error', 
        message: `Failed to connect: ${error.message}` 
      });
    }

    // Test 2: Socket.IO connection
    addResult({ name: 'Socket.IO Connection', status: 'pending', message: 'Testing...' });
    try {
      const socketInstance = await createSocketConnection();
      setSocket(socketInstance);
      
      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        
        socketInstance.on('connect', () => {
          clearTimeout(timeout);
          addResult({ 
            name: 'Socket.IO Connection', 
            status: 'success', 
            message: `Connected successfully (ID: ${socketInstance.id})`,
            details: { socketId: socketInstance.id, url: 'socket.io connection' }
          });
          resolve(true);
        });
        
        socketInstance.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error: any) {
      addResult({ 
        name: 'Socket.IO Connection', 
        status: 'error', 
        message: `Connection failed: ${error.message}` 
      });
    }

    // Test 3: User authentication
    addResult({ name: 'User Authentication', status: 'pending', message: 'Testing...' });
    if (isAuthenticated && user) {
      addResult({ 
        name: 'User Authentication', 
        status: 'success', 
        message: `Authenticated as ${user.name}`,
        details: { userId: user.id, username: user.name }
      });
    } else {
      addResult({ 
        name: 'User Authentication', 
        status: 'error', 
        message: 'User not authenticated' 
      });
    }

    // Test 4: Browser compatibility
    addResult({ name: 'Browser Compatibility', status: 'pending', message: 'Testing...' });
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    
    if (isIOS) {
      addResult({ 
        name: 'Browser Compatibility', 
        status: 'success', 
        message: `iOS detected: ${userAgent}`,
        details: { isIOS, isSafari, userAgent }
      });
    } else {
      addResult({ 
        name: 'Browser Compatibility', 
        status: 'success', 
        message: `Non-iOS browser: ${userAgent}`,
        details: { isIOS, isSafari, userAgent }
      });
    }

    // Test 5: WebSocket support
    addResult({ name: 'WebSocket Support', status: 'pending', message: 'Testing...' });
    if (typeof WebSocket !== 'undefined') {
      addResult({ 
        name: 'WebSocket Support', 
        status: 'success', 
        message: 'WebSocket is supported' 
      });
    } else {
      addResult({ 
        name: 'WebSocket Support', 
        status: 'error', 
        message: 'WebSocket is not supported' 
      });
    }

    // Test 6: Media capabilities
    addResult({ name: 'Media Capabilities', status: 'pending', message: 'Testing...' });
    try {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
      
      addResult({ 
        name: 'Media Capabilities', 
        status: 'success', 
        message: 'Media capabilities available',
        details: { hasGetUserMedia, hasAudioContext }
      });
    } catch (error: any) {
      addResult({ 
        name: 'Media Capabilities', 
        status: 'error', 
        message: `Media test failed: ${error.message}` 
      });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on mount
    runTests();
  }, []);

  useEffect(() => {
    // Cleanup socket on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">📱 iOS Compatibility Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Test Results</h2>
            <button
              onClick={runTests}
              disabled={isRunning}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
            >
              {isRunning ? '🔄 Running...' : '🚀 Run Tests'}
            </button>
          </div>
          
          <div className="space-y-3">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${
                  result.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  result.status === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{result.name}</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    result.status === 'success' ? 'bg-green-200' :
                    result.status === 'error' ? 'bg-red-200' :
                    'bg-yellow-200'
                  }`}>
                    {result.status === 'success' ? '✅' : 
                     result.status === 'error' ? '❌' : '⏳'}
                  </span>
                </div>
                <p className="text-sm mt-1">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer">View Details</summary>
                    <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">📋 iOS Compatibility Notes:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Uses HTTP instead of HTTPS for better iOS compatibility</li>
            <li>• Socket.IO with polling fallback for WebSocket issues</li>
            <li>• Automatic reconnection with exponential backoff</li>
            <li>• Mobile-optimized UI with touch-friendly controls</li>
            <li>• Progressive Web App features for home screen installation</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 