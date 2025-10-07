"use client";

import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Upload, CheckCircle, XCircle, RefreshCw, Image } from 'lucide-react';

export default function FileAccessTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testImageUrl, setTestImageUrl] = useState<string>('');

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setIsLoading(true);
    try {
      console.log(`🧪 Running test: ${testName}`);
      const result = await testFunction();
      setTestResults(prev => [...prev, { 
        name: testName, 
        status: 'success', 
        result,
        timestamp: new Date().toISOString()
      }]);
      console.log(`✅ Test passed: ${testName}`, result);
    } catch (error) {
      console.error(`❌ Test failed: ${testName}`, error);
      setTestResults(prev => [...prev, { 
        name: testName, 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const testFileUpload = async () => {
    // Create a test image file
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('TEST', 30, 50);
    }
    
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    const testFile = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('files', testFile);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Upload result:', data);
    
    if (data.files && data.files.length > 0) {
      setTestImageUrl(data.files[0].url);
      return data.files[0];
    } else {
      throw new Error('No files returned from server');
    }
  };

  const testImageAccess = async () => {
    if (!testImageUrl) {
      throw new Error('No test image URL available. Please run file upload test first.');
    }
    
    console.log('Testing image access for URL:', testImageUrl);
    
    // Convert /uploads/filename to /api/uploads/filename
    const filename = testImageUrl.split('/').pop();
    const apiUrl = `/api/uploads/${filename}`;
    
    console.log('Testing API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Image access failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    return {
      status: response.status,
      contentType,
      contentLength,
      url: apiUrl
    };
  };

  const testDirectBackendAccess = async () => {
    if (!testImageUrl) {
      throw new Error('No test image URL available. Please run file upload test first.');
    }
    
    const filename = testImageUrl.split('/').pop();
    const backendUrl = `http://localhost:3001/uploads/${filename}`;
    
    console.log('Testing direct backend access:', backendUrl);
    
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      throw new Error(`Direct backend access failed: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    return {
      status: response.status,
      contentType,
      contentLength,
      url: backendUrl
    };
  };

  const runAllTests = async () => {
    setTestResults([]);
    
    await runTest('File Upload Test', testFileUpload);
    await runTest('Image Access via API Route', testImageAccess);
    await runTest('Direct Backend Access', testDirectBackendAccess);
  };

  const clearResults = () => {
    setTestResults([]);
    setTestImageUrl('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            File Access Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
            <Button 
              onClick={clearResults} 
              variant="outline"
            >
              Clear Results
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            This test verifies that uploaded files can be accessed through:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>File upload to the server</li>
              <li>Image access via Next.js API route (/api/uploads/)</li>
              <li>Direct backend server access (port 3001)</li>
            </ul>
          </div>
          
          {testImageUrl && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Test Image Preview:</div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Original URL:</div>
                  <img 
                    src={testImageUrl} 
                    alt="Test image" 
                    className="w-20 h-20 border rounded"
                    onError={(e) => {
                      console.error('Original URL failed to load:', testImageUrl);
                      e.currentTarget.style.border = '2px solid red';
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">API Route:</div>
                  <img 
                    src={`/api/uploads/${testImageUrl.split('/').pop()}`}
                    alt="Test image via API" 
                    className="w-20 h-20 border rounded"
                    onError={(e) => {
                      console.error('API route failed to load');
                      e.currentTarget.style.border = '2px solid red';
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.timestamp}
                      </div>
                      {result.error && (
                        <div className="text-sm text-red-500">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {result.status === 'success' ? (
                      <Badge variant="default" className="bg-green-500">
                        Passed
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

