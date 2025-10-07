
"use client";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import React, { useState, useEffect, useRef, type KeyboardEvent } from "react";
import SmartReplySuggestions from "./SmartReplySuggestions";
import MediaUpload from "./MediaUpload";
import type { Message, MediaAttachment } from "@/src/lib/types";
import { useAuth } from "@/src/contexts/AuthContext";

interface MessageInputProps {
  onSendMessage: (messageText: string, media?: MediaAttachment[]) => Promise<void>;
  chatHistory: Message[];
  chatId: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export default function MessageInput({ onSendMessage, chatHistory, chatId, onTypingStart, onTypingStop }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isLoadingSmartReplies, setIsLoadingSmartReplies] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAttachment[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const handleSendMessage = async () => {
    console.log('🔧 MessageInput - handleSendMessage called');
    console.log('🔧 MessageInput - messageText:', messageText);
    console.log('🔧 MessageInput - selectedMedia:', selectedMedia);
    console.log('🔧 MessageInput - selectedMedia.length:', selectedMedia.length);
    
    if (messageText.trim() === "" && selectedMedia.length === 0) {
      console.log('🔧 MessageInput - No message text or media, returning');
      return;
    }
    if (!user) {
      console.log('🔧 MessageInput - No user, returning');
      return;
    }
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }
    
    console.log('🔧 MessageInput - Calling onSendMessage with:', { messageText, selectedMedia });
    await onSendMessage(messageText, selectedMedia);
    console.log('🔧 MessageInput - onSendMessage completed');
    
    setMessageText("");
    setSelectedMedia([]);
    setSmartReplies([]); // Clear smart replies after sending
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextChange = (value: string) => {
    setMessageText(value);
    
    // Typing indicator logic
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingStop?.();
      }
    }, 2000); // Stop typing after 2 seconds of inactivity
  };

 

  
  const handleMediaSelected = (media: MediaAttachment[]) => {
    console.log('🔧 MessageInput - handleMediaSelected called with:', media);
    console.log('🔧 MessageInput - Current selectedMedia before:', selectedMedia);
    setSelectedMedia(prev => {
      const newMedia = [...prev, ...media];
      console.log('🔧 MessageInput - New selectedMedia after:', newMedia);
      return newMedia;
    });
  };

  const handleRemoveMedia = (mediaId: string) => {
    setSelectedMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setMessageText(suggestion);
    setSmartReplies([]);
    textareaRef.current?.focus();
  };
  
  // Resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageText]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);


  return (
    <div className="border-t bg-card p-3 md:p-4 safe-area-inset-bottom">
      <SmartReplySuggestions 
        suggestions={smartReplies} 
        onSelectSuggestion={handleSelectSuggestion}
        isLoading={isLoadingSmartReplies}
      />
      
      {/* Main input area with integrated layout */}
      <div className="space-y-2">
        {/* Media Upload - above the input */}
        <MediaUpload
          onMediaSelected={handleMediaSelected}
          onRemoveMedia={handleRemoveMedia}
          selectedMedia={selectedMedia}
          disabled={!user}
        />
        
        {/* Text input and send button */}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-xl border-input focus-visible:ring-primary min-h-[44px] max-h-[120px] md:max-h-[150px] py-2.5 text-base md:text-sm touch-manipulation"
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={messageText.trim() === "" && selectedMedia.length === 0}
            className="rounded-full h-11 w-11 shrink-0 touch-manipulation"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center hidden md:block">
        Press Enter to send, Shift+Enter for a new line. Attach media files up to 50MB each.
      </p>
      <p className="text-xs text-muted-foreground mt-2 text-center md:hidden">
        Tap send button or attach media files
      </p>
    </div>
  );
}

