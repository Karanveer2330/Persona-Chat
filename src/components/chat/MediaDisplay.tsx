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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Helper function to keep uploads URLs as they are (served directly by Next.js)
  const convertToApiUrl = (url: string): string => {
    // Keep /uploads/ URLs as they are since Next.js serves them directly from public/uploads
    if (url && url.includes('/uploads/')) {
      console.log('🔧 MediaDisplay - Keeping uploads URL as is:', url);
      return url;
    }
    return url;
  };

  // Debug logging for media data
  useEffect(() => {
    console.log('🔍 MediaDisplay - Received media:', media);
    console.log('🔍 MediaDisplay - Media type:', typeof media);
    console.log('🔍 MediaDisplay - Media length:', media?.length);
    if (media && media.length > 0) {
      console.log('🔍 MediaDisplay - First media item:', media[0]);
      console.log('🔍 MediaDisplay - First media item type:', typeof media[0]);
    }
  }, [media]);

  // Helper function to ensure full URL for media
  const getFullMediaUrl = async (url: string) => {
    console.log('🔍 MediaDisplay - Resolving URL:', url);
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('🔍 MediaDisplay - URL is already absolute:', url);
      return url;
    }
    
    // If it's a relative path starting with /uploads, keep it as is (Next.js serves directly)
    if (url.startsWith('/uploads/')) {
      console.log('🔍 MediaDisplay - Keeping uploads URL as is:', url);
      return url;
    }
    
    // If it's a relative path, prepend the current origin
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : `/${url}`;
    console.log('🔍 MediaDisplay - Converted relative URL to:', fullUrl);
    return fullUrl;
  };

  // Resolve all URLs when media changes
  useEffect(() => {
    const resolveUrls = async () => {
      console.log('🔍 MediaDisplay - Resolving URLs for media:', media);
      const newResolvedUrls: Record<string, string> = {};
      
      for (const mediaItem of media) {
        console.log('🔍 MediaDisplay - Processing media item:', mediaItem);
        
        // Handle case where mediaItem might be a string instead of object
        if (typeof mediaItem === 'string') {
          console.log('⚠️ MediaDisplay - Media item is string, converting to object');
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
          console.log('⚠️ MediaDisplay - Invalid media item:', mediaItem);
        }
      }
      
      console.log('🔍 MediaDisplay - Resolved URLs:', newResolvedUrls);
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

  const handleImageError = (mediaId: string, originalUrl: string, finalUrl: string) => {
    console.warn('🖼️ Image failed to load:', {
      mediaId,
      originalUrl,
      finalUrl,
      timestamp: new Date().toISOString()
    });
    
    // Add to failed images set
    setFailedImages(prev => new Set([...prev, mediaId]));
    
    // Don't throw error - handle gracefully
    return false;
  };

  const renderMedia = (mediaItem: MediaAttachment | string, index: number) => {
    // Handle case where mediaItem might be a string
    let actualMediaItem: MediaAttachment;
    if (typeof mediaItem === 'string') {
      console.log('⚠️ MediaDisplay - Rendering string media item:', mediaItem);
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
    
    console.log('🔍 MediaDisplay - Final URL for rendering:', finalUrl);

    switch (actualMediaItem.type) {
      case 'image':
        // Check if this image has failed to load
        if (failedImages.has(actualMediaItem.id)) {
          return (
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 max-w-xs">
              <Image className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{actualMediaItem.name}</p>
                <p className="text-xs text-muted-foreground">Image failed to load</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(finalUrl, '_blank')}
                  className="mt-1 text-xs"
                >
                  Try opening in new tab
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="relative group">
            <img
              src={finalUrl}
              alt={actualMediaItem.name}
              className="max-w-xs max-h-64 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(finalUrl, '_blank')}
              onError={(e) => {
                // Use the proper error handler instead of throwing
                handleImageError(actualMediaItem.id, actualMediaItem.url, finalUrl);
              }}
              onLoad={() => {
                // Remove from failed images if it loads successfully
                setFailedImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(actualMediaItem.id);
                  return newSet;
                });
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
              onError={(e) => {
                console.warn('🎥 Video failed to load:', {
                  mediaId: actualMediaItem.id,
                  url: finalUrl,
                  timestamp: new Date().toISOString()
                });
              }}
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
              <audio 
                controls 
                className="w-full mt-2"
                onError={(e) => {
                  console.warn('🎵 Audio failed to load:', {
                    mediaId: actualMediaItem.id,
                    url: finalUrl,
                    timestamp: new Date().toISOString()
                  });
                }}
              >
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
