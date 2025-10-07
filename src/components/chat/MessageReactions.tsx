"use client";

import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import EmojiPicker from './EmojiPicker';
import { Smile, Plus } from 'lucide-react';
import type { MessageReaction } from '@/src/lib/types';

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  className?: string;
}

export default function MessageReactions({
  messageId,
  reactions,
  onAddReaction,
  onRemoveReaction,
  className
}: MessageReactionsProps) {
  const { user } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const handleReactionClick = (emoji: string) => {
    const userReaction = reactions.find(r => r.emoji === emoji && r.userId === user?.id);
    
    if (userReaction) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setIsPickerOpen(false);
  };

  if (Object.keys(reactionGroups).length === 0) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {Object.entries(reactionGroups).map(([emoji, reactionList]) => {
        const userReacted = reactionList.some(r => r.userId === user?.id);
        const count = reactionList.length;
        
        return (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 py-1 text-xs rounded-full transition-colors",
              userReacted 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "bg-muted/50 hover:bg-muted"
            )}
            onClick={() => handleReactionClick(emoji)}
          >
            <span className="mr-1">{emoji}</span>
            <span className="text-xs">{count}</span>
          </Button>
        );
      })}
      
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
