import type { User, Message, Chat } from './types';

export const mockCurrentUser: User = {
  id: 'user-current',
  name: 'You',
  avatarUrl: 'https://placehold.co/100x100.png?text=Me',
  isOnline: true,
};

export const mockUsers: User[] = [
  { id: 'user-1', name: 'Alice Wonderland', avatarUrl: 'https://placehold.co/100x100.png?text=AW', isOnline: true },
  { id: 'user-2', name: 'Bob The Builder', avatarUrl: 'https://placehold.co/100x100.png?text=BB', isOnline: false },
  { id: 'user-3', name: 'Charlie Chaplin', avatarUrl: 'https://placehold.co/100x100.png?text=CC', isOnline: true },
  mockCurrentUser,
];

export const initialMessages: Message[] = [
  {
    id: 'msg-1',
    chatId: 'global',
    senderId: 'user-1',
    senderName: 'Alice Wonderland',
    senderAvatarUrl: 'https://placehold.co/100x100.png?text=AW',
    text: 'Hello everyone! Welcome to Hub!',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'msg-2',
    chatId: 'global',
    senderId: 'user-2',
    senderName: 'Bob The Builder',
    senderAvatarUrl: 'https://placehold.co/100x100.png?text=BB',
    text: 'Hi Alice! Glad to be here.',
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
  },
  {
    id: 'msg-3',
    chatId: 'user-1', // Private chat with Alice
    senderId: 'user-current',
    senderName: 'You',
    senderAvatarUrl: 'https://placehold.co/100x100.png?text=Me',
    text: 'Hey Alice, how are you doing?',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: 'msg-4',
    chatId: 'user-1', // Private chat with Alice
    senderId: 'user-1',
    senderName: 'Alice Wonderland',
    senderAvatarUrl: 'https://placehold.co/100x100.png?text=AW',
    text: 'Doing great! Thanks for asking.',
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
  },
];

export const mockChats: Chat[] = [
  {
    id: 'global',
    type: 'global',
    name: 'Global Chat',
    messages: initialMessages.filter(m => m.chatId === 'global'),
    lastMessage: initialMessages.filter(m => m.chatId === 'global').slice(-1)[0],
    unreadCount: 1,
  },
  ...mockUsers.filter(u => u.id !== mockCurrentUser.id).map(user => ({
    id: user.id,
    type: 'private' as 'private',
    name: user.name,
    participants: [mockCurrentUser, user],
    messages: initialMessages.filter(m => m.chatId === user.id),
    lastMessage: initialMessages.filter(m => m.chatId === user.id).slice(-1)[0],
    unreadCount: user.id === 'user-1' ? 2 : 0,
  })),
];
