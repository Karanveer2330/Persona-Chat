"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Download, Volume2, FileText, Image, Video } from 'lucide-react';
import { cn } from "@/src/lib/utils";

export interface MediaAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  size: number;
  mimeType?: string;
}

interface MediaDisplayProps {
  media: MediaAttachment[];
  className?: string;
}

export default function MediaDisplay({ media, className }: MediaDisplayProps) {
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Helper function to immediately convert uploads URLs to API routes
  const convertToApiUrl = (url: string): string => {
    if (url && url.includes('/uploads/') && !url.includes('/api/uploads/')) {
      const filename = url.split('/').pop();
      const apiUrl = `/api/uploads/${filename}`;
      return apiUrl;
    }
    return url;
  };

  // Debug logging for media data
  useEffect(() => {
    if (media && media.length > 0) {
      }
  }, [media]);

  // Helper function to ensure full URL for media
  const getFullMediaUrl = async (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative path starting with /uploads, use the Next.js API route
    if (url.startsWith('/uploads/')) {
      const filename = url.split('/').pop();
      const apiUrl = `/api/uploads/${filename}`;
      return apiUrl;
    }
    
    // If it's a relative path, prepend the current origin
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : `/${url}`;
    return fullUrl;
  };

  // Resolve all URLs when media changes
  useEffect(() => {
    const resolveUrls = async () => {
      const newResolvedUrls: Record<string, string> = {};
      
      for (const mediaItem of media) {
        // Handle case where mediaItem might be a string instead of object
        if (typeof mediaItem === 'string') {
          const convertedItem = {
            id: `converted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'file' as const,
            url: mediaItem,
            name: mediaItem.split('/').pop() || 'unknown',
            size: 0,
            mimeType: 'application/octet-stream'
          };
          newResolvedUrls[convertedItem.id] = await getFullMediaUrl(convertedItem.url);
        } else if (mediaItem && typeof mediaItem === 'object' && mediaItem.url) {
          newResolvedUrls[mediaItem.id] = await getFullMediaUrl(mediaItem.url);
        } else {
          }
      }
      
      setResolvedUrls(newResolvedUrls);
    };
    
    resolveUrls();
  }, [media]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (media: MediaAttachment) => {
    const resolvedUrl = resolvedUrls[media.id];
    if (!resolvedUrl) return;
    
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = media.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMedia = (mediaItem: MediaAttachment | string, index: number) => {
    // Handle case where mediaItem might be a string
    let actualMediaItem: MediaAttachment;
    if (typeof mediaItem === 'string') {
      actualMediaItem = {
        id: `string_${index}_${Date.now()}`,
        type: 'file',
        url: mediaItem,
        name: mediaItem.split('/').pop() || 'unknown',
        size: 0,
        mimeType: 'application/octet-stream'
      };
    } else {
      actualMediaItem = mediaItem;
    }
    
    // IMMEDIATE URL CONVERSION - Don't wait for async resolution
    let finalUrl = convertToApiUrl(actualMediaItem.url);
    
    switch (actualMediaItem.type) {
      case 'image':
        return (
          <div className="relative group">
            <img
              src={finalUrl}
              alt={actualMediaItem.name}
              className="max-w-xs max-h-64 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(finalUrl, '_blank')}
              onError={(e) => {
                console.error('Failed to load image:', actualMediaItem.url);
                console.error('Final URL attempted:', finalUrl);
                console.error('URL conversion applied:', convertToApiUrl(actualMediaItem.url));
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(actualMediaItem);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );

      case 'video':
        return (
          <div className="relative group">
            <video
              controls
              className="max-w-xs max-h-64 rounded-lg border"
              preload="metadata"
            >
              <source src={finalUrl} type={actualMediaItem.mimeType} />
              Your browser does not support the video tag.
            </video>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(actualMediaItem);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 max-w-xs">
            <Volume2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{actualMediaItem.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(actualMediaItem.size)}
              </p>
              <audio controls className="w-full mt-2">
                <source src={finalUrl} type={actualMediaItem.mimeType} />
                Your browser does not support the audio tag.
              </audio>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(actualMediaItem)}
              className="flex-shrink-0"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 max-w-xs">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{actualMediaItem.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(actualMediaItem.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(actualMediaItem)}
              className="flex-shrink-0"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {media.map((mediaItem, index) => (
        <div key={mediaItem.id || `media-${index}`}>
          {renderMedia(mediaItem, index)}
        </div>
      ))}
    </div>
  );
}

