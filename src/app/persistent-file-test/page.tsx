"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Upload, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function PersistentFileStorageTest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

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
    // Create a test file
    const testFile = new File(['Test file content'], 'test-file.txt', { 
      type: 'text/plain' 
    });
    
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
    return data;
  };

  const testMessageWithMedia = async () => {
    // First upload a file
    const uploadResult = await testFileUpload();
    
    // Then send a message with the uploaded file
    const messageData = {
      text: 'Test message with persistent file attachment',
      senderId: 'test-user-123',
      senderName: 'Test User',
      media: uploadResult.files,
      type: 'global'
    };
    
    // Simulate sending the message (we'll use a direct API call)
    const response = await fetch('/api/messages/global', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });
    
    if (!response.ok) {
      throw new Error(`Message send failed: ${response.status}`);
    }
    
    return { uploadResult, messageData };
  };

  const testMessageRetrieval = async () => {
    const response = await fetch('/api/messages/global');
    
    if (!response.ok) {
      throw new Error(`Message retrieval failed: ${response.status}`);
    }
    
    const data = await response.json();
    setMessages(data.messages || []);
    
    // Check if any messages have properly structured media
    const messagesWithMedia = data.messages.filter((msg: any) => 
      msg.media && msg.media.length > 0
    );
    
    const structuredMediaMessages = messagesWithMedia.filter((msg: any) => 
      msg.media.every((media: any) => 
        typeof media === 'object' && 
        media.id && 
        media.type && 
        media.url && 
        media.name && 
        typeof media.size === 'number'
      )
    );
    
    return {
      totalMessages: data.messages.length,
      messagesWithMedia: messagesWithMedia.length,
      structuredMediaMessages: structuredMediaMessages.length,
      sampleMessage: structuredMediaMessages[0] || null
    };
  };

  const testPageReload = async () => {
    // Simulate page reload by clearing local state and re-fetching
    setMessages([]);
    
    // Wait a moment to simulate reload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Re-fetch messages
    const response = await fetch('/api/messages/global');
    
    if (!response.ok) {
      throw new Error(`Reload test failed: ${response.status}`);
    }
    
    const data = await response.json();
    setMessages(data.messages || []);
    
    // Check if media attachments are still properly structured
    const messagesWithMedia = data.messages.filter((msg: any) => 
      msg.media && msg.media.length > 0
    );
    
    const persistentMediaMessages = messagesWithMedia.filter((msg: any) => 
      msg.media.every((media: any) => 
        typeof media === 'object' && 
        media.id && 
        media.type && 
        media.url && 
        media.name && 
        typeof media.size === 'number'
      )
    );
    
    return {
      totalMessages: data.messages.length,
      messagesWithMedia: messagesWithMedia.length,
      persistentMediaMessages: persistentMediaMessages.length,
      persistenceRate: messagesWithMedia.length > 0 ? 
        (persistentMediaMessages.length / messagesWithMedia.length * 100).toFixed(1) : 100
    };
  };

  const runAllTests = async () => {
    setTestResults([]);
    
    await runTest('File Upload Test', testFileUpload);
    await runTest('Message with Media Test', testMessageWithMedia);
    await runTest('Message Retrieval Test', testMessageRetrieval);
    await runTest('Page Reload Persistence Test', testPageReload);
  };

  const clearResults = () => {
    setTestResults([]);
    setMessages([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Persistent File Storage Test
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
            This test verifies that file attachments persist after page reload by:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Uploading test files to the server</li>
              <li>Sending messages with file attachments</li>
              <li>Retrieving messages from the database</li>
              <li>Verifying media attachments maintain proper structure</li>
              <li>Testing persistence after simulated page reload</li>
            </ul>
          </div>
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

      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Retrieved Messages ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messages.slice(-5).map((message, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-medium">{message.senderName}</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {message.text}
                  </div>
                  {message.media && message.media.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Media Attachments:</div>
                      {message.media.map((media: any, mediaIndex: number) => (
                        <div key={mediaIndex} className="text-xs bg-gray-100 p-2 rounded">
                          <div><strong>ID:</strong> {media.id}</div>
                          <div><strong>Type:</strong> {media.type}</div>
                          <div><strong>Name:</strong> {media.name}</div>
                          <div><strong>Size:</strong> {media.size} bytes</div>
                          <div><strong>URL:</strong> {media.url}</div>
                          <div><strong>MIME:</strong> {media.mimeType}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

