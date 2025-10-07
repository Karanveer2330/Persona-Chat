"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { Search, Filter, X, Calendar, User, FileImage, FileVideo, FileAudio, FileText } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Message, SearchFilters } from '@/src/lib/types';

interface MessageSearchProps {
  messages: Message[];
  onSearchResults: (results: Message[]) => void;
  onMessageClick?: (messageId: string) => void;
  className?: string;
}

export default function MessageSearch({ messages, onSearchResults, onMessageClick, className }: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const performSearch = () => {
    if (!searchQuery.trim() && !filters.userId && !filters.mediaType) {
      setSearchResults([]);
      onSearchResults([]);
      return;
    }

    let results = messages;

    // Text search
    if (searchQuery.trim()) {
      results = results.filter(message => 
        message.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.senderName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // User filter
    if (filters.userId) {
      results = results.filter(message => message.senderId === filters.userId);
    }

    // Date filters
    if (filters.dateFrom) {
      results = results.filter(message => 
        new Date(message.timestamp) >= filters.dateFrom!
      );
    }

    if (filters.dateTo) {
      results = results.filter(message => 
        new Date(message.timestamp) <= filters.dateTo!
      );
    }

    // Media type filter
    if (filters.mediaType) {
      results = results.filter(message => 
        message.media?.some(media => media.type === filters.mediaType)
      );
    }

    setSearchResults(results);
    onSearchResults(results);
  };

  useEffect(() => {
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters, messages]);

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const hasActiveFilters = searchQuery.trim() || filters.userId || filters.mediaType || filters.dateFrom || filters.dateTo;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm", className)}>
          <Search className="h-4 w-4" />
          Search Messages
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {searchResults.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              key="filter-image"
              variant={filters.mediaType === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                mediaType: prev.mediaType === 'image' ? undefined : 'image' 
              }))}
              className={cn(
                "justify-start",
                filters.mediaType === 'image' 
                  ? "" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              )}
            >
              <FileImage className="h-3 w-3 mr-1" />
              Images
            </Button>
            <Button
              key="filter-video"
              variant={filters.mediaType === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                mediaType: prev.mediaType === 'video' ? undefined : 'video' 
              }))}
              className={cn(
                "justify-start",
                filters.mediaType === 'video' 
                  ? "" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              )}
            >
              <FileVideo className="h-3 w-3 mr-1" />
              Videos
            </Button>
            <Button
              key="filter-audio"
              variant={filters.mediaType === 'audio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                mediaType: prev.mediaType === 'audio' ? undefined : 'audio' 
              }))}
              className={cn(
                "justify-start",
                filters.mediaType === 'audio' 
                  ? "" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              )}
            >
              <FileAudio className="h-3 w-3 mr-1" />
              Audio
            </Button>
            <Button
              key="filter-file"
              variant={filters.mediaType === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                mediaType: prev.mediaType === 'file' ? undefined : 'file' 
              }))}
              className={cn(
                "justify-start",
                filters.mediaType === 'file' 
                  ? "" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              )}
            >
              <FileText className="h-3 w-3 mr-1" />
              Files
            </Button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-64">
            <div className="p-3 border-b bg-muted/30">
              <span className="text-sm font-medium">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 space-y-2">
                {searchResults.slice(0, 10).map((message) => (
                  <div
                    key={`search-result-${message.id}-${message.timestamp}`}
                    className="p-2 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (onMessageClick) {
                        onMessageClick(message.id);
                      } else {
                        // Fallback: scroll to message in chat
                        const element = document.querySelector(`[data-message-id="${message.id}"]`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Add highlight effect
                          element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
                          setTimeout(() => {
                            element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
                          }, 2000);
                        }
                      }
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary">{message.senderName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.text || 'Media message'}
                    </p>
                    {message.media && message.media.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {message.media.slice(0, 3).map((media, idx) => (
                          <span key={`media-${message.id}-${idx}-${media.id}`} className="text-xs text-muted-foreground">
                            {media.type === 'image' && '🖼️'}
                            {media.type === 'video' && '🎥'}
                            {media.type === 'audio' && '🎵'}
                            {media.type === 'file' && '📄'}
                          </span>
                        ))}
                        {message.media.length > 3 && (
                          <span key={`media-more-${message.id}`} className="text-xs text-muted-foreground">
                            +{message.media.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {hasActiveFilters && searchResults.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages found</p>
            <p className="text-xs">Try adjusting your search criteria</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
