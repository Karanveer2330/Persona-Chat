"use client";

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Camera, Check, X, AlertCircle, Info } from 'lucide-react';

interface CameraTestButtonProps {
  onTestComplete?: (success: boolean) => void;
}

export default function CameraTestButton({ onTestComplete }: CameraTestButtonProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');

  const runDiagnostics = () => {
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    let diagnostics = [];
    
    // Device info
    if (isAndroid) diagnostics.push('📱 Android device detected');
    if (isIOS) diagnostics.push('🍎 iOS device detected');
    
    // Browser info
    if (isChrome) diagnostics.push('✅ Chrome browser');
    else if (isFirefox) diagnostics.push('✅ Firefox browser');
    else if (isSafari) diagnostics.push('✅ Safari browser');
    else diagnostics.push('⚠️ Unknown browser');
    
    // Security context
    if (isSecure) diagnostics.push('🔒 Secure connection (HTTPS)');
    else diagnostics.push('❌ Insecure connection - Camera requires HTTPS');
    
    // API availability
    if (navigator.mediaDevices) diagnostics.push('✅ MediaDevices API available');
    else diagnostics.push('❌ MediaDevices API not available');
    
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      diagnostics.push('✅ getUserMedia available');
    } else {
      diagnostics.push('❌ getUserMedia not available');
    }
    
    // Permissions API
    if (navigator.permissions) diagnostics.push('✅ Permissions API available');
    else diagnostics.push('⚠️ Permissions API not available');

    return diagnostics.join('\n');
  };

  const testCamera = async () => {
    setTestStatus('testing');
    setErrorMessage('');
    setDiagnosticInfo(runDiagnostics());
    
    try {
      // First check if getUserMedia exists at all
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API not supported - This device/browser combination does not support camera access');
      }

      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported - Camera API is not available in this browser');
      }

      // Check if we're in a secure context (required for camera access)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Secure context required - Camera access requires HTTPS connection');
      }

      // Try to enumerate devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available video devices:', videoDevices.length);
        
        if (videoDevices.length === 0) {
          throw new Error('No camera devices found - This device does not have a camera or camera drivers are not installed');
        }
      } catch (enumError) {
        console.warn('Could not enumerate devices:', enumError);
      }

      // Test with most basic constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { max: 320 },
          height: { max: 240 }
        },
        audio: false
      });

      // If successful, stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      setTestStatus('success');
      onTestComplete?.(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setTestStatus('idle');
      }, 3000);
      
    } catch (error: any) {
      console.error('Camera test failed:', error);
      
      let message = 'Camera test failed';
      if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied - Please allow camera access when prompted';
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found - This device does not have a camera or it\'s not connected';
      } else if (error.name === 'NotReadableError') {
        message = 'Camera is busy - Another app is using the camera';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Camera constraints not supported - Try updating your browser';
      } else if (error.name === 'NotSupportedError') {
        message = 'Camera not supported - This browser/device combination does not support camera access';
      } else if (error.message.includes('not supported')) {
        message = 'Camera API not supported - This browser does not support camera access';
      } else if (error.message.includes('Secure context')) {
        message = 'Secure connection required - Camera needs HTTPS';
      } else if (error.message.includes('MediaDevices')) {
        message = 'Device not supported - This device does not support camera access';
      } else {
        message = `Camera error: ${error.message}`;
      }
      
      setErrorMessage(message);
      setTestStatus('failed');
      onTestComplete?.(false);
      
      // Reset after 8 seconds to give time to read diagnostics
      setTimeout(() => {
        setTestStatus('idle');
        setErrorMessage('');
        setDiagnosticInfo('');
      }, 8000);
    }
  };

  const getButtonContent = () => {
    switch (testStatus) {
      case 'testing':
        return (
          <>
            <Camera className="h-4 w-4 animate-pulse" />
            Testing Camera...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4 text-green-400" />
            Camera Works!
          </>
        );
      case 'failed':
        return (
          <>
            <X className="h-4 w-4 text-red-400" />
            Test Failed
          </>
        );
      default:
        return (
          <>
            <Camera className="h-4 w-4" />
            Test Camera
          </>
        );
    }
  };

  const getButtonClass = () => {
    switch (testStatus) {
      case 'testing':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'failed':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={testCamera}
        disabled={testStatus === 'testing'}
        className={`w-full text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm ${getButtonClass()}`}
      >
        {getButtonContent()}
      </Button>
      
      {diagnosticInfo && (
        <div className="p-2 bg-gray-500/20 border border-gray-500/50 rounded-lg text-gray-200 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4" />
            <span className="font-semibold">Device Diagnostics:</span>
          </div>
          <pre className="whitespace-pre-line text-xs">{diagnosticInfo}</pre>
        </div>
      )}
      
      {errorMessage && (
        <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
