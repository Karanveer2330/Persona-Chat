"use client";

import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Message } from '@/src/lib/types';

interface MessageStatusProps {
  message: Message;
  className?: string;
}

export default function MessageStatus({ message, className }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (message.status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return 'Unknown';
    }
  };

  if (!message.status) return null;

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {message.readBy && message.readBy.length > 0 && (
        <span className="ml-1">
          ({message.readBy.length} read)
        </span>
      )}
    </div>
  );
}





