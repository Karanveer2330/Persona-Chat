
"use client";
import type { Message, User } from '@/src/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import MediaDisplay from './MediaDisplay';
import MessageReactions from './MessageReactions';
import MessageStatus from './MessageStatus';

interface MessageItemProps {
  message: Message;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
}

export default function MessageItem({ message, onAddReaction, onRemoveReaction }: MessageItemProps) {
  const { user: currentUser } = useAuth();
  const isCurrentUser = message.senderId === currentUser?.id;

  return (
    <div 
      className={cn("group flex items-start gap-3 p-3 hover:bg-accent/10 transition-colors rounded-md", isCurrentUser ? "justify-end" : "justify-start")}
      data-message-id={message.id}
    >
      {!isCurrentUser && (
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={message.senderAvatarUrl} 
            alt={message.senderName}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <AvatarFallback>{message.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col max-w-[70%]", isCurrentUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-xl px-4 py-2.5 shadow-sm",
            isCurrentUser
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-card border rounded-bl-none"
          )}
        >
          {!isCurrentUser && <p className="text-xs font-semibold mb-0.5 text-primary">{message.senderName}</p>}
          {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
          {message.media && message.media.length > 0 && (
            <div className={cn("mt-2", message.text ? "mt-2" : "")}>
              <MediaDisplay media={message.media} />
            </div>
          )}
        </div>
        
        {/* Message Reactions */}
        <div className="mt-1">
          <MessageReactions
            messageId={message.id}
            reactions={message.reactions || []}
            onAddReaction={onAddReaction || (() => {})}
            onRemoveReaction={onRemoveReaction || (() => {})}
          />
        </div>
        
        {/* Message Status and Timestamp */}
        <div className={cn("flex items-center gap-2 mt-1", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
          <span className={cn("text-xs text-muted-foreground", isCurrentUser ? "mr-1" : "ml-1")}>
            {format(new Date(message.timestamp), 'p')}
          </span>
          {isCurrentUser && (
            <MessageStatus message={message} />
          )}
        </div>
      </div>
      {isCurrentUser && (
         <Avatar className="h-10 w-10">
          <AvatarImage 
            src={currentUser?.avatarUrl} 
            alt={currentUser?.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <AvatarFallback>{currentUser?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
