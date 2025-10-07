"use client";

import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';

export default function DirectImageTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testDirectImageLoad = () => {
    const testFilename = 'files-1759657162311-624188342.jpg';
    const originalUrl = `/uploads/${testFilename}`;
    const apiUrl = `/api/uploads/${testFilename}`;
    
    addResult(`Testing direct image load`);
    addResult(`Original URL: ${originalUrl}`);
    addResult(`API URL: ${apiUrl}`);
    
    // Test the API route directly
    fetch(apiUrl)
      .then(response => {
        addResult(`API route response: ${response.status} ${response.statusText}`);
        if (response.ok) {
          addResult(`✅ API route working - Content-Type: ${response.headers.get('content-type')}`);
          setImageLoaded(true);
        } else {
          addResult(`❌ API route failed: ${response.status}`);
        }
      })
      .catch(error => {
        addResult(`❌ API route error: ${error.message}`);
      });
  };

  const clearResults = () => {
    setTestResults([]);
    setImageLoaded(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Direct Image Load Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testDirectImageLoad}>
              Test Image Load
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
          
          {imageLoaded && (
            <div>
              <div className="text-sm font-medium mb-2">Image Preview:</div>
              <img 
                src="/api/uploads/files-1759657162311-624188342.jpg" 
                alt="Test image" 
                className="max-w-xs border rounded"
                onLoad={() => addResult('✅ Image loaded successfully in preview')}
                onError={(e) => {
                  addResult('❌ Image failed to load in preview');
                  console.error('Preview image load error:', e);
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

