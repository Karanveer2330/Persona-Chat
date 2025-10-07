"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Bot, Download, Star, User, Sparkles } from 'lucide-react';

interface VRMModel {
  id: string;
  name: string;
  description: string;
  url: string;
  thumbnail: string;
  size: string;
  creator: string;
  isDefault?: boolean;
}

interface VRMModelSelectorProps {
  onModelSelect: (modelUrl: string) => void;
  selectedModelUrl: string | null;
}

const VRMModelSelector: React.FC<VRMModelSelectorProps> = React.memo(({ onModelSelect, selectedModelUrl }) => {
  const [models, setModels] = useState<VRMModel[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("VRMModelSelector rendered with selectedModelUrl:", selectedModelUrl);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading VRM models...");
        const response = await fetch('/models/vrm/models.json');
        const data = await response.json();
        console.log("Loaded models:", data.models);
        setModels(data.models);
      } catch (error) {
        console.error('Failed to load VRM models:', error);
        // Fallback to default model
        setModels([{
          id: "default",
          name: "Default Avatar",
          description: "Default 3D avatar with basic animations",
          url: "https://d1l5n2avb89axj.cloudfront.net/avatar-first.vrm",
          thumbnail: "/models/vrm/thumbnails/default.jpg",
          size: "15MB",
          creator: "PersonaPlay3D",
          isDefault: true
        }]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Select Avatar</h3>
          <p className="text-sm text-gray-400">Choose your 3D avatar model</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model) => (
          <Card 
            key={model.id} 
            className={`bg-black/30 backdrop-blur-lg border border-white/10 cursor-pointer transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 ${
              selectedModelUrl === model.url ? 'border-purple-500 shadow-lg shadow-purple-500/30' : ''
            }`}
            onClick={() => onModelSelect(model.url)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <CardTitle className="text-white text-base">{model.name}</CardTitle>
                    {model.isDefault && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-gray-400 text-sm">
                    {model.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Thumbnail Placeholder */}
              <div className="w-full h-32 bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg flex items-center justify-center">
                <div className="text-center text-purple-300">
                  <User className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-xs">3D Avatar Preview</span>
                </div>
              </div>

              {/* Model Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Download className="w-4 h-4" />
                  <span>{model.size}</span>
                </div>
                <div className="text-gray-400">
                  by {model.creator}
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedModelUrl === model.url && (
                <div className="flex items-center justify-center space-x-2 text-purple-400 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  <span>Currently Selected</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <p className="text-gray-400 text-sm mb-3">
          Want to add your own VRM model?
        </p>
        <Button 
          variant="outline" 
          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          onClick={() => {
            // Future: Open file upload dialog
            console.log('File upload feature coming soon!');
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Upload Custom Model
        </Button>
      </div>
    </div>
  );
});

export default VRMModelSelector;
