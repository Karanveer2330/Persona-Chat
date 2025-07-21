
"use client";
import type { Message, User } from '@/src/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import MediaDisplay from './MediaDisplay';

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const { user: currentUser } = useAuth();
  const isCurrentUser = message.senderId === currentUser?.id;

  return (
    <div className={cn("flex items-start gap-3 p-3 hover:bg-accent/10 transition-colors rounded-md", isCurrentUser ? "justify-end" : "justify-start")}>
      {!isCurrentUser && (
        <Avatar className="h-10 w-10">
          <AvatarImage src={message.senderAvatarUrl} alt={message.senderName}/>
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
        <span className={cn("mt-1 text-xs text-muted-foreground", isCurrentUser ? "mr-1" : "ml-1")}>
          {format(new Date(message.timestamp), 'p')}
        </span>
      </div>
      {isCurrentUser && (
         <Avatar className="h-10 w-10">
          <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name}/>
          <AvatarFallback>{currentUser?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
