"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { 
  Paperclip, 
  Image, 
  Video, 
  FileText, 
  X, 
  Upload,
  Loader2 
} from "lucide-react";
import React, { useState, useRef } from "react";
import { MediaAttachment } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

interface MediaUploadProps {
  onMediaSelected: (media: MediaAttachment[]) => void;
  onRemoveMedia: (mediaId: string) => void;
  selectedMedia: MediaAttachment[];
  disabled?: boolean;
}

export default function MediaUpload({ 
  onMediaSelected, 
  onRemoveMedia, 
  selectedMedia, 
  disabled 
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    console.log('Files selected for upload:', files.length);
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        console.log('Adding file to FormData:', file.name, file.type, file.size);
        formData.append('files', file);
      });

      console.log('Sending upload request to server...');
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log('Upload successful, received data:', data);
      onMediaSelected(data.files);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      {/* File Input */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="h-8"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          <span className="ml-1">
            {isUploading ? 'Uploading...' : 'Attach'}
          </span>
        </Button>
        
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          className="hidden"
        />
      </div>

      {/* Selected Media Preview */}
      {selectedMedia.length > 0 && (
        <div className="space-y-2">
          {selectedMedia.map((media) => (
            <div
              key={media.id}
              className="flex items-center gap-3 p-2 border border-border rounded-lg bg-muted/30"
            >
              {/* Media Preview */}
              <div className="flex-shrink-0">
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={media.name}
                    className="w-12 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                    {getFileIcon(media.type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{media.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(media.size)} • {media.type}
                </p>
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveMedia(media.id)}
                className="h-8 w-8 p-0 hover:bg-destructive/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
