
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
}

export default function MessageInput({ onSendMessage, chatHistory, chatId }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isLoadingSmartReplies, setIsLoadingSmartReplies] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const handleSendMessage = async () => {
    if (messageText.trim() === "" && selectedMedia.length === 0) return;
    if (!user) return;
    
    await onSendMessage(messageText, selectedMedia);
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

 

  
  const handleMediaSelected = (media: MediaAttachment[]) => {
    setSelectedMedia(prev => [...prev, ...media]);
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


  return (
    <div className="border-t bg-card p-3 md:p-4">
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
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-xl border-input focus-visible:ring-primary min-h-[44px] max-h-[150px] py-2.5"
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={messageText.trim() === "" && selectedMedia.length === 0}
            className="rounded-full h-11 w-11 shrink-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Press Enter to send, Shift+Enter for a new line. Attach media files up to 50MB each.
      </p>
    </div>
  );
}

