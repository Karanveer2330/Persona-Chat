"use client";

import { MediaAttachment } from "@/src/lib/types";
import { 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Download, 
  Play,
  Volume2
} from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { cn } from "@/src/lib/utils";

interface MediaDisplayProps {
  media: MediaAttachment[];
  className?: string;
}

export default function MediaDisplay({ media, className }: MediaDisplayProps) {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  if (!media || media.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (media: MediaAttachment) => {
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMedia = (mediaItem: MediaAttachment, index: number) => {
    switch (mediaItem.type) {
      case 'image':
        return (
          <div key={mediaItem.id} className="relative group">
            <img
              src={mediaItem.url}
              alt={mediaItem.name}
              className="max-w-xs max-h-64 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(mediaItem.url, '_blank')}
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(mediaItem);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );

      case 'video':
        return (
          <div key={mediaItem.id} className="relative group">
            <video
              controls
              className="max-w-xs max-h-64 rounded-lg border"
              preload="metadata"
            >
              <source src={mediaItem.url} type={mediaItem.mimeType} />
              Your browser does not support the video tag.
            </video>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(mediaItem);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );

      case 'audio':
        return (
          <div key={mediaItem.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 max-w-xs">
            <Volume2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaItem.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(mediaItem.size)}
              </p>
              <audio controls className="w-full mt-2">
                <source src={mediaItem.url} type={mediaItem.mimeType} />
                Your browser does not support the audio tag.
              </audio>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(mediaItem)}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      default: // 'file'
        return (
          <div key={mediaItem.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30 max-w-xs hover:bg-muted/50 transition-colors cursor-pointer">
            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaItem.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(mediaItem.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(mediaItem)}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {media.map((mediaItem, index) => renderMedia(mediaItem, index))}
    </div>
  );
}
