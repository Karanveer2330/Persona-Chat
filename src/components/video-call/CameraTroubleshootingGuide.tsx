import React from 'react';
import { AlertCircle, Camera, Mic, RefreshCw, Settings } from 'lucide-react';

interface CameraTroubleshootingGuideProps {
  onClose: () => void;
}

export default function CameraTroubleshootingGuide({ onClose }: CameraTroubleshootingGuideProps) {
  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-blue-400">Camera Access Troubleshooting</h2>
      
      {/* HTTPS Required Section */}
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-300">🔒 HTTPS Required for Camera Access</h3>
        <p className="mb-3 text-gray-300">
          Modern browsers require HTTPS for camera and microphone access. Our server is currently running on HTTP for compatibility.
        </p>
        
        <div className="space-y-3">
          <div className="bg-yellow-900/20 border border-yellow-500 rounded p-3">
            <h4 className="font-semibold text-yellow-300 mb-2">🚀 Quick Development Solution</h4>
            <p className="text-sm text-gray-300 mb-2">
              Enable camera access for local development without changing server settings:
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-800 p-2 rounded">
                <strong>Chrome/Edge:</strong> Navigate to <code className="bg-gray-700 px-1 rounded">chrome://flags/</code>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <strong>Search for:</strong> "Insecure origins treated as secure"
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <strong>Add:</strong> <code className="bg-gray-700 px-1 rounded">http://localhost:3000</code>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <strong>Restart browser</strong> and try camera access again
              </div>
            </div>
          </div>
          
          <div className="bg-green-900/20 border border-green-500 rounded p-3">
            <h4 className="font-semibold text-green-300 mb-2">📱 Mobile Chrome Solution</h4>
            <p className="text-sm text-gray-300 mb-2">
              For mobile devices, use Chrome flags:
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-800 p-2 rounded">
                Navigate to <code className="bg-gray-700 px-1 rounded">chrome://flags/</code>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                Enable "Allow insecure localhost"
              </div>
              <div className="bg-gray-800 p-2 rounded">
                Or add <code className="bg-gray-700 px-1 rounded">http://localhost:3000</code> to "Insecure origins treated as secure"
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing sections */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-green-400">✅ Check These First</h3>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Camera permissions are allowed in browser settings
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            No other applications are using the camera
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Camera is not physically covered or disabled
          </li>
        </ul>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-yellow-400">🔧 Browser-Specific Solutions</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-yellow-300 mb-2">Chrome/Edge</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Click the camera icon in the address bar</li>
              <li>• Select "Allow" for camera access</li>
              <li>• If blocked, click "Site settings" and enable camera</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-300 mb-2">Firefox</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Click the shield icon in the address bar</li>
              <li>• Select "Allow" for camera permissions</li>
              <li>• Or go to Settings → Privacy & Security → Permissions</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-yellow-300 mb-2">Safari</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Go to Safari → Preferences → Websites → Camera</li>
              <li>• Set localhost to "Allow"</li>
              <li>• Or click "Allow" when prompted</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-red-400">🚨 Advanced Troubleshooting</h3>
        
        <div className="space-y-3">
          <div className="bg-red-900/20 border border-red-500 rounded p-3">
            <h4 className="font-semibold text-red-300 mb-2">If Camera Still Not Working</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Try a different browser</li>
              <li>• Check if camera works in other applications</li>
              <li>• Restart your computer</li>
              <li>• Update browser to latest version</li>
            </ul>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500 rounded p-3">
            <h4 className="font-semibold text-blue-300 mb-2">Development Server Info</h4>
            <p className="text-sm text-gray-300">
              Current server: <code className="bg-gray-700 px-1 rounded">http://localhost:3444</code><br/>
              Frontend: <code className="bg-gray-700 px-1 rounded">http://localhost:3000</code><br/>
              Protocol: HTTP (HTTPS failed due to certificate issues)
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-400">
          💡 This troubleshooting guide helps resolve camera access issues for local development.
        </p>
      </div>
    </div>
  );
}
