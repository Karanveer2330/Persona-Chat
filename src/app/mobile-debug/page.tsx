"use client";
import React, { useState, useEffect } from 'react';

export default function MobileDebugPage() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      return hostname !== 'localhost' && hostname !== '127.0.0.1' 
        ? `http://${hostname}:3444` 
        : "http://localhost:3444";
    }
    return "http://localhost:3444";
  };

  const testConnectivity = async () => {
    setIsLoading(true);
    setResults([]);
    
    const backendUrl = getBackendUrl();
    
    addResult(`🔍 Current URL: ${window.location.href}`);
    addResult(`🎯 Backend URL: ${backendUrl}`);
    addResult(`📱 User Agent: ${navigator.userAgent}`);
    
    // Test 1: Basic connectivity
    try {
      addResult('🧪 Testing basic connectivity...');
      const response = await fetch(`${backendUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Backend connectivity: SUCCESS`);
        addResult(`📊 Response: ${JSON.stringify(data)}`);
      } else {
        addResult(`❌ Backend responded with error: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      addResult(`❌ Connectivity test failed: ${error.message}`);
    }

    // Test 2: User endpoint (using a test ID)
    try {
      addResult('🧪 Testing user endpoint...');
      const response = await fetch(`${backendUrl}/api/users/test-user-id`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      addResult(`📊 User endpoint status: ${response.status}`);
      const text = await response.text();
      addResult(`📊 User endpoint response: ${text.substring(0, 200)}...`);
    } catch (error: any) {
      addResult(`❌ User endpoint test failed: ${error.message}`);
    }

    // Test 3: Private room endpoint
    try {
      addResult('🧪 Testing private room endpoint...');
      const response = await fetch(`${backendUrl}/api/rooms/private`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId1: 'test-user-1',
          userId2: 'test-user-2'
        })
      });
      
      addResult(`📊 Room endpoint status: ${response.status}`);
      const text = await response.text();
      addResult(`📊 Room endpoint response: ${text.substring(0, 200)}...`);
    } catch (error: any) {
      addResult(`❌ Room endpoint test failed: ${error.message}`);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Auto-run test on component mount
    testConnectivity();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">📱 Mobile Backend Debug</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Connection Test Results</h2>
            <button
              onClick={testConnectivity}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
            >
              {isLoading ? '🔄 Testing...' : '🚀 Run Test'}
            </button>
          </div>
          
          <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">No results yet...</p>
            ) : (
              results.map((result, index) => (
                <div 
                  key={index} 
                  className={`mb-2 p-2 rounded text-sm ${
                    result.includes('✅') ? 'bg-green-100 text-green-800' :
                    result.includes('❌') ? 'bg-red-100 text-red-800' :
                    result.includes('🧪') ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-50 text-gray-700'
                  }`}
                >
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">💡 Troubleshooting Tips:</h3>
                     <ul className="text-sm text-yellow-700 space-y-1">
             <li>• Make sure the backend server is running on port 3444</li>
             <li>• Check if your PC's firewall allows connections on port 3444</li>
             <li>• Verify both devices are on the same network</li>
             <li>• Try accessing the backend directly: <code>{getBackendUrl()}/api/test</code></li>
           </ul>
        </div>
      </div>
    </div>
  );
}
