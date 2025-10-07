"use client";

import React from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Smartphone, Monitor, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MobileWebRTCTestIndex() {
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-black/30 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl flex items-center justify-center gap-2">
              {isMobile ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
              Mobile WebRTC Testing Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Device Detection */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Current Device</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-4">
                  {isMobile ? (
                    <>
                      <Smartphone className="w-8 h-8 text-blue-400" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-lg">Mobile Device</div>
                        <div className="text-gray-400 text-sm">Optimized for mobile browsers</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Monitor className="w-8 h-8 text-green-400" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-lg">Desktop Device</div>
                        <div className="text-gray-400 text-sm">Standard WebRTC implementation</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Testing Tools */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Testing Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Mobile WebRTC Debugger */}
                <div className="flex items-center justify-between p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-6 h-6 text-blue-400" />
                    <div>
                      <div className="text-white font-semibold">Mobile WebRTC Debugger</div>
                      <div className="text-blue-200 text-sm">Comprehensive mobile WebRTC testing with detailed logs</div>
                    </div>
                  </div>
                  <Link href="/mobile-webrtc-debugger">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Open Debugger
                    </Button>
                  </Link>
                </div>

                {/* Basic Mobile Test */}
                <div className="flex items-center justify-between p-4 bg-green-900/30 border border-green-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="text-white font-semibold">Basic Mobile Test</div>
                      <div className="text-green-200 text-sm">Simple mobile WebRTC audio test</div>
                    </div>
                  </div>
                  <Link href="/mobile-webrtc-test">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Open Test
                    </Button>
                  </Link>
                </div>

                {/* Persona3D Video Call */}
                <div className="flex items-center justify-between p-4 bg-purple-900/30 border border-purple-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-6 h-6 text-purple-400" />
                    <div>
                      <div className="text-white font-semibold">Persona3D Video Call</div>
                      <div className="text-purple-200 text-sm">Test WebRTC audio in the actual video call</div>
                    </div>
                  </div>
                  <Link href="/persona3d-video-call">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Open Video Call
                    </Button>
                  </Link>
                </div>

              </CardContent>
            </Card>

            {/* Mobile Instructions */}
            {isMobile && (
              <Card className="bg-blue-900/30 border-blue-700">
                <CardHeader>
                  <CardTitle className="text-blue-200 text-lg">Mobile Testing Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-100 space-y-2 text-sm">
                  <p>📱 <strong>For Mobile Testing:</strong></p>
                  <p>1. <strong>Use HTTPS:</strong> Make sure you're using https:// not http://</p>
                  <p>2. <strong>Allow Permissions:</strong> Click "Allow" when browser asks for microphone access</p>
                  <p>3. <strong>User Interaction:</strong> Tap the "Enable Audio" button to start</p>
                  <p>4. <strong>Check Logs:</strong> Use the debugger to see detailed error messages</p>
                  <p>5. <strong>Test Different Browsers:</strong> Try Chrome, Safari, Firefox</p>
                  <p>6. <strong>Update Browser:</strong> Make sure you're using the latest version</p>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isMobile && (
              <Card className="bg-green-900/30 border-green-700">
                <CardHeader>
                  <CardTitle className="text-green-200 text-lg">Desktop Testing Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-green-100 space-y-2 text-sm">
                  <p>🖥️ <strong>For Desktop Testing:</strong></p>
                  <p>1. <strong>Standard WebRTC:</strong> Uses the regular WebRTC implementation</p>
                  <p>2. <strong>HTTPS Recommended:</strong> Works with both HTTP and HTTPS</p>
                  <p>3. <strong>Permission Handling:</strong> Standard browser permission prompts</p>
                  <p>4. <strong>Debug Tools:</strong> Use browser dev tools for debugging</p>
                  <p>5. <strong>Cross-Browser:</strong> Test in Chrome, Firefox, Safari, Edge</p>
                </CardContent>
              </Card>
            )}

            {/* Troubleshooting */}
            <Card className="bg-red-900/30 border-red-700">
              <CardHeader>
                <CardTitle className="text-red-200 text-lg">Common Issues & Solutions</CardTitle>
              </CardHeader>
              <CardContent className="text-red-100 space-y-2 text-sm">
                <p>❌ <strong>Error: "The request is not allowed by the user agent"</strong></p>
                <p>• Solution: Use HTTPS, allow permissions, ensure user interaction</p>
                <p>• Mobile: Update browser, disable private mode, close other tabs</p>
                <p>• Desktop: Check browser compatibility, update browser</p>
                <p></p>
                <p>❌ <strong>Error: "Microphone permission denied"</strong></p>
                <p>• Solution: Check browser settings, allow microphone access</p>
                <p>• Mobile: Go to browser settings → Site permissions → Microphone</p>
                <p>• Desktop: Click the microphone icon in address bar</p>
                <p></p>
                <p>❌ <strong>Error: "HTTPS required"</strong></p>
                <p>• Solution: Use https:// instead of http://</p>
                <p>• Mobile browsers require secure context for microphone access</p>
              </CardContent>
            </Card>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}







