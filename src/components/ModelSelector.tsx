"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { X, Check, Users, Zap, Star, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface VRMModel {
  id: string;
  name: string;
  description: string;
  url: string;
  thumbnail: string;
  size: string;
  creator: string;
  isDefault: boolean;
  features: string[];
  quality: string;
  version: string;
}

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: VRMModel) => void;
  currentModel?: string;
  className?: string;
}

export default function ModelSelector({ 
  isOpen, 
  onClose, 
  onSelectModel, 
  currentModel,
  className 
}: ModelSelectorProps) {
  const [models, setModels] = useState<VRMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const response = await fetch('/models/vrm/models.json');
        if (!response.ok) {
          throw new Error('Failed to load models');
        }
        const data = await response.json();
        setModels(data.models || []);
        setError(null);
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load available models');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const handleModelSelect = (model: VRMModel) => {
    onSelectModel(model);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "flex items-center justify-center p-4",
      className
    )}>
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Choose Your Avatar
            </CardTitle>
            <CardDescription className="text-base">
              Select from our collection of high-quality 3D avatars
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading models...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card 
                  key={model.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105",
                    "border-2 hover:border-primary/50",
                    currentModel === model.url && "border-primary shadow-lg ring-2 ring-primary/20"
                  )}
                  onClick={() => handleModelSelect(model)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {model.name}
                          {model.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {model.description}
                        </CardDescription>
                      </div>
                      {currentModel === model.url && (
                        <div className="flex-shrink-0">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Model Preview Placeholder */}
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-4 flex items-center justify-center">
                      <Users className="h-12 w-12 text-primary/50" />
                    </div>

                    {/* Model Info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size:</span>
                        <Badge variant="outline" className="text-xs">
                          <Download className="h-3 w-3 mr-1" />
                          {model.size}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Quality:</span>
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          {model.quality}
                        </Badge>
                      </div>

                      {/* Features */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {model.features.slice(0, 3).map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {model.features.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{model.features.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Select Button */}
                      <Button 
                        className="w-full mt-4"
                        variant={currentModel === model.url ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModelSelect(model);
                        }}
                      >
                        {currentModel === model.url ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          "Select Avatar"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
