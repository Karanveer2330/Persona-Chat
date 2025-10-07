"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';

export default function ImageLoadTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testImageLoad = async () => {
    const testFilename = 'files-1759655730669-55337624.jpg';
    const originalUrl = `/uploads/${testFilename}`;
    const apiUrl = `/api/uploads/${testFilename}`;
    
    addResult(`Testing image load with filename: ${testFilename}`);
    addResult(`Original URL: ${originalUrl}`);
    addResult(`API URL: ${apiUrl}`);
    
    // Test direct API route
    try {
      const response = await fetch(apiUrl);
      addResult(`API route response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        addResult(`Content-Type: ${contentType}`);
        setImageUrl(apiUrl);
      } else {
        addResult(`❌ API route failed: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ API route error: ${error.message}`);
    }
    
    // Test direct backend access
    try {
      const backendUrl = `http://localhost:3001/uploads/${testFilename}`;
      const response = await fetch(backendUrl);
      addResult(`Backend direct response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        addResult(`✅ Backend file accessible directly`);
      } else {
        addResult(`❌ Backend direct access failed: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ Backend direct error: ${error.message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setImageUrl('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Load Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testImageLoad}>
              Test Image Load
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
          
          {imageUrl && (
            <div>
              <div className="text-sm font-medium mb-2">Image Preview:</div>
              <img 
                src={imageUrl} 
                alt="Test image" 
                className="max-w-xs border rounded"
                onLoad={() => addResult('✅ Image loaded successfully')}
                onError={(e) => {
                  addResult('❌ Image failed to load');
                  console.error('Image load error:', e);
                }}
              />
            </div>
          )}
          
          <div>
            <div className="text-sm font-medium mb-2">Test Results:</div>
            <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

