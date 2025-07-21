
export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  isAnonymous?: boolean;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

export interface Message {
  id: string;
  chatId: string; 
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  text: string;
  timestamp: Date;
  smartReplies?: string[];
  media?: MediaAttachment[];
}

export interface Chat {
  id: string;
  type: 'global' | 'private';
  name: string; 
  participants?: User[];
  messages: Message[];
  lastMessage?: Message;
  unreadCount?: number;
}
