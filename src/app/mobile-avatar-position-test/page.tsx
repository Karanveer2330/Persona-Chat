"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Smartphone, Monitor, RotateCcw, Eye, EyeOff } from 'lucide-react';
import ThreeCanvas from '@/src/components/three-canvas';

export default function MobileAvatarPositionTest() {
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    screenSize: '',
    pixelRatio: 0,
    isSecureContext: false
  });
  
  const [avatarPositions, setAvatarPositions] = useState({
    local: { x: 0, y: 0, z: 0 },
    remote: { x: 0, y: 0, z: 0 }
  });
  
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('/models/vrm/fem3.vrm');
  const [remoteModel, setRemoteModel] = useState('/models/vrm/male1.vrm');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-9), logMessage]);
    console.log(logMessage);
  };

  useEffect(() => {
    // Detect mobile device
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    
    // Get device info
    setDeviceInfo({
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      isSecureContext: window.isSecureContext || location.protocol === 'https:'
    });
    
    addLog(`Device detected: ${mobile ? 'Mobile' : 'Desktop'}`);
    addLog(`Screen size: ${window.innerWidth}x${window.innerHeight}`);
    addLog(`Pixel ratio: ${window.devicePixelRatio}`);
    addLog(`Secure context: ${window.isSecureContext || location.protocol === 'https:'}`);
  }, []);

  const handleModelChange = (modelUrl: string) => {
    addLog(`Model change requested: ${modelUrl}`);
    setSelectedModel(modelUrl);
  };

  const handleRemoteModelChange = (modelUrl: string) => {
    addLog(`Remote model change requested: ${modelUrl}`);
    setRemoteModel(modelUrl);
  };

  const resetPositions = () => {
    addLog('Resetting avatar positions to default');
    setAvatarPositions({
      local: { x: -0.6, y: 0, z: 0 },
      remote: { x: 0.6, y: 0, z: 0 }
    });
  };

  const testPositionPreservation = () => {
    addLog('Testing position preservation...');
    // Simulate model change to test if positions are preserved
    const newModel = selectedModel === '/models/vrm/fem3.vrm' ? '/models/vrm/male1.vrm' : '/models/vrm/fem3.vrm';
    handleModelChange(newModel);
  };

  const availableModels = [
    { name: 'Female 1', url: '/models/vrm/fem1.vrm' },
    { name: 'Female 2', url: '/models/vrm/fem2.vrm' },
    { name: 'Female 3', url: '/models/vrm/fem3.vrm' },
    { name: 'Male 1', url: '/models/vrm/male1.vrm' },
    { name: 'Male 2', url: '/models/vrm/male2.vrm' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Smartphone className="w-6 h-6" />
              Mobile Avatar Position Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="font-semibold text-blue-300">Device Type</div>
                <div className="text-white">{isMobile ? 'Mobile' : 'Desktop'}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="font-semibold text-blue-300">Screen Size</div>
                <div className="text-white">{deviceInfo.screenSize}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="font-semibold text-blue-300">Pixel Ratio</div>
                <div className="text-white">{deviceInfo.pixelRatio}</div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <div className="font-semibold text-blue-300">Secure Context</div>
                <div className="text-white">{deviceInfo.isSecureContext ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={testPositionPreservation}
                variant="outline"
                className="bg-green-600/50 backdrop-blur-sm text-white border-green-400/50 hover:bg-green-600/70"
              >
                Test Position Preservation
              </Button>
              <Button
                onClick={resetPositions}
                variant="outline"
                className="bg-blue-600/50 backdrop-blur-sm text-white border-blue-400/50 hover:bg-blue-600/70"
              >
                Reset Positions
              </Button>
              <Button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                variant="outline"
                className="bg-purple-600/50 backdrop-blur-sm text-white border-purple-400/50 hover:bg-purple-600/70"
              >
                {showDebugInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showDebugInfo ? 'Hide' : 'Show'} Debug Info
              </Button>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-blue-300">Local Model</div>
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <Button
                    key={model.url}
                    onClick={() => handleModelChange(model.url)}
                    variant={selectedModel === model.url ? "default" : "outline"}
                    size="sm"
                    className={selectedModel === model.url ? "bg-blue-600" : "bg-white/10 text-white border-white/20"}
                  >
                    {model.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-blue-300">Remote Model</div>
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <Button
                    key={model.url}
                    onClick={() => handleRemoteModelChange(model.url)}
                    variant={remoteModel === model.url ? "default" : "outline"}
                    size="sm"
                    className={remoteModel === model.url ? "bg-green-600" : "bg-white/10 text-white border-white/20"}
                  >
                    {model.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3D Canvas */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/20">
          <CardContent className="p-0">
            <div className="h-96 relative">
              <ThreeCanvas
                vrmUrl={selectedModel}
                isCameraEnabled={false}
                enableFaceTracking={false}
                remoteAvatarData={null}
                remoteModelUrl={remoteModel}
                isDualAvatar={true}
                localAvatarName="Local"
                remoteAvatarName="Remote"
                callMode="shared-environment"
                onModelChange={handleModelChange}
              />
              
              {/* Position Overlay */}
              {showDebugInfo && (
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                  <div className="text-xs text-white space-y-1">
                    <div className="font-semibold text-blue-300">Avatar Positions</div>
                    <div>Local: ({avatarPositions.local.x.toFixed(2)}, {avatarPositions.local.y.toFixed(2)}, {avatarPositions.local.z.toFixed(2)})</div>
                    <div>Remote: ({avatarPositions.remote.x.toFixed(2)}, {avatarPositions.remote.y.toFixed(2)}, {avatarPositions.remote.z.toFixed(2)})</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Logs */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/60 p-3 rounded-lg max-h-48 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <div className="text-gray-400 text-sm">No logs yet...</div>
              ) : (
                <div className="space-y-1">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="text-xs text-green-300 font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-black/40 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-white space-y-2">
            <div className="text-sm">
              <div className="font-semibold text-blue-300 mb-2">How to Test:</div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click "Test Position Preservation" to simulate model changes</li>
                <li>Manually change models using the model selection buttons</li>
                <li>Observe if avatars maintain their positions (left/right)</li>
                <li>Check debug logs for position information</li>
                <li>Use "Reset Positions" to return to default positions</li>
              </ol>
            </div>
            <div className="text-sm">
              <div className="font-semibold text-yellow-300 mb-2">Expected Behavior:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Local avatar should stay on the left side</li>
                <li>Remote avatar should stay on the right side</li>
                <li>Positions should not reset to center when models change</li>
                <li>Debug logs should show position preservation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







