"use client";

import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, Camera, Wifi, Settings } from 'lucide-react';
import CameraTestButton from './CameraTestButton';

interface MobileFallbackProps {
  recipientName: string;
  onGoBack: () => void;
  onRetry: () => void;
  onRequestPermissions?: () => void;
}

export default function MobileFallback({ recipientName, onGoBack, onRetry, onRequestPermissions }: MobileFallbackProps) {
  // Detect specific browsers and apps
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isInAppBrowser = /Instagram|FBAN|FBAV|TwitterApp|LinkedInApp|TikTok|Line|WeChat/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent);
  const isFirefox = /Firefox/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
  
  const getBrowserSpecificAdvice = () => {
    if (isInAppBrowser) {
      return "📱 You're in an in-app browser. Tap the three dots (⋯) or share button and select 'Open in Browser' to use your main browser app.";
    }
    if (isChrome) {
      return "✅ Chrome detected - should work! Make sure to tap 'Allow' when asked for camera permission.";
    }
    if (isFirefox) {
      return "✅ Firefox detected - should work! Make sure to tap 'Allow' when asked for camera permission.";
    }
    if (isSafari) {
      return "✅ Safari detected - should work! Make sure to tap 'Allow' when asked for camera permission.";
    }
    return "⚠️ Your browser may not support video calls. Try Chrome, Firefox, or Safari.";
  };

  const getDeviceSpecificHelp = () => {
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
    
    // Since we're now HTTPS-only, camera access should work
    if (isAndroid) {
      return {
        title: "📱 Android Device Help",
        message: "If camera doesn't work on ANY browser, check these Android settings:",
        solutions: [
          "Go to Settings → Apps → [Browser] → Permissions → Camera → Allow",
          "Go to Settings → Privacy → Permission manager → Camera → Allow for browsers",
          "Restart your browser after changing permissions",
          "Clear browser cache and cookies",
          "Update your browser to the latest version",
          "Check if camera works in other apps (Camera app, WhatsApp, etc.)"
        ]
      };
    }

    if (isIOS) {
      return {
        title: "🍎 iOS Device Help", 
        message: "If camera doesn't work on ANY browser, check these iOS settings:",
        solutions: [
          "Go to Settings → Safari → Camera → Ask/Allow",
          "Go to Settings → Privacy & Security → Camera → Safari → Allow",
          "Go to Settings → Screen Time → Content & Privacy → Camera → Allow",
          "Close all browser tabs and restart Safari",
          "Update iOS to the latest version",
          "Try in Safari first, then Chrome"
        ]
      };
    }

    return {
      title: "🔧 General Device Help",
      message: "If camera doesn't work in ANY browser:",
      solutions: [
        "Check if your device has a physical camera",
        "Test camera in other apps (video call apps, camera app)",
        "Restart your device",
        "Check device privacy/permission settings",
        "Try a different device to test if it's device-specific"
      ]
    };
  };

  const deviceHelp = getDeviceSpecificHelp();

  // Quick compatibility check
  const getCompatibilityStatus = () => {
    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices;
    const hasGetUserMedia = hasMediaDevices && navigator.mediaDevices.getUserMedia;
    
    if (!hasMediaDevices) return { status: '❌', message: 'Device does not support camera API' };
    if (!hasGetUserMedia) return { status: '❌', message: 'Browser does not support camera access' };
    
    return { status: '✅', message: 'HTTPS enabled - camera should work!' };
  };

  const compatibility = getCompatibilityStatus();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-start text-white p-4 z-50 overflow-y-auto">
      <div className="text-center space-y-4 max-w-md w-full my-4">
        <div className="text-4xl mb-2">📱</div>
        
        <h1 className="text-xl font-bold">Video Call Not Available</h1>
        
        <div className="bg-gray-500/20 border border-gray-500/50 rounded-lg p-2 text-xs">
          <p className="text-gray-200">
            <span className="text-lg">{compatibility.status}</span> {compatibility.message}
          </p>
        </div>
        
        <p className="text-gray-300 text-center text-sm">
          Video calls may not work properly on this device. Common issues include:
        </p>
        
        <div className="space-y-2 text-left text-xs">
          <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
            <Camera className="h-4 w-4 text-yellow-400" />
            <span>Camera permissions blocked or unavailable</span>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
            <Wifi className="h-4 w-4 text-blue-400" />
            <span>Network connection issues</span>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
            <Settings className="h-4 w-4 text-purple-400" />
            <span>Browser doesn't support WebRTC</span>
          </div>
        </div>
        
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-xs">
          <h3 className="font-semibold text-yellow-400 mb-1">Quick Fixes:</h3>
          <ul className="space-y-1 text-yellow-100 text-xs">
            <li>• Tap "Allow" when browser asks for camera permission</li>
            <li>• Update your browser to the latest version</li>
            <li>• Use Chrome, Firefox, or Safari browser (not in-app browsers)</li>
            <li>• Close other video apps (Zoom, Teams, etc.)</li>
            <li>• Make sure you're on WiFi (not mobile data)</li>
            <li>• Try opening the link in your main browser app</li>
            <li>• Refresh the page and try again</li>
          </ul>
        </div>
        
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-2 text-xs">
          <p className="text-blue-200 text-xs">
            {getBrowserSpecificAdvice()}
          </p>
        </div>

        <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 text-xs">
          <h3 className="font-semibold text-orange-400 mb-1">{deviceHelp.title}</h3>
          <p className="text-orange-200 mb-2 text-xs">{deviceHelp.message}</p>
          <ul className="space-y-1 text-orange-100 text-xs">
            {deviceHelp.solutions.map((solution, index) => (
              <li key={index}>• {solution}</li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-2 w-full">
          <CameraTestButton />
          
          {onRequestPermissions && (
            <Button
              onClick={onRequestPermissions}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
            >
              <Camera className="h-4 w-4" />
              Request Camera Permission
            </Button>
          )}
          
          <Button
            onClick={onRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm"
          >
            Try Again
          </Button>
          
          <Button
            variant="outline"
            onClick={onGoBack}
            className="w-full border-2 border-white/30 text-white hover:bg-white/10 font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Button>
        </div>
        
        <div className="text-xs text-gray-400 text-center mt-4">
          <p>For {recipientName}</p>
          <p>Video calls work best on desktop browsers</p>
        </div>
      </div>
    </div>
  );
}
