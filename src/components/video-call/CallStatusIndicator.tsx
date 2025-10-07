"use client";

import React from 'react';
import { Badge } from '@/src/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

interface CallStatusIndicatorProps {
  status: string;
  recipientName?: string;
  className?: string;
}

export function CallStatusIndicator({ status, recipientName, className = "" }: CallStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'calling':
        return {
          icon: <Phone className="w-4 h-4 animate-pulse" />,
          text: `Calling ${recipientName || 'user'}...`,
          variant: 'default' as const,
          className: 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
        };
      case 'ringing':
        return {
          icon: <Phone className="w-4 h-4 animate-bounce" />,
          text: `Ringing ${recipientName || 'user'}...`,
          variant: 'default' as const,
          className: 'bg-purple-600 hover:bg-purple-700 text-white animate-bounce'
        };
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Connecting to Persona3D...',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Connected to Persona3D',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: 'Call declined',
          variant: 'destructive' as const,
          className: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: 'Call failed',
          variant: 'destructive' as const,
          className: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'ended':
        return {
          icon: <PhoneOff className="w-4 h-4" />,
          text: 'Call ended',
          variant: 'secondary' as const,
          className: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4" />,
          text: 'Ready for Persona3D calls',
          variant: 'outline' as const,
          className: 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/50'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={`flex items-center space-x-2 px-3 py-2 ${config.className} ${className}`}
    >
      {config.icon}
      <span className="text-sm font-medium">{config.text}</span>
    </Badge>
  );
}

