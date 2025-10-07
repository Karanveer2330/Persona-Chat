"use client";
import React from 'react';
import { Globe, MessageSquare, Users, Video } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/src/lib/utils';

interface MobileChatTabsProps {
  className?: string;
}

export default function MobileChatTabs({ className }: MobileChatTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      id: 'global',
      label: 'Global',
      icon: Globe,
      href: '/chat/global',
      isActive: pathname === '/chat/global'
    },
    {
      id: 'private',
      label: 'Private',
      icon: MessageSquare,
      href: '/chat/private',
      isActive: pathname.startsWith('/chat/private')
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      href: '/chat/users',
      isActive: pathname === '/chat/users'
    },
    {
      id: 'video',
      label: 'Video Call',
      icon: Video,
      href: '/video-call',
      isActive: pathname === '/video-call'
    }
  ];

  return (
    <div className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom",
      className
    )}>
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors touch-manipulation",
                tab.isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5",
                tab.isActive ? "text-blue-600" : "text-gray-400"
              )} />
              <span className={cn(
                "text-xs",
                tab.isActive ? "text-blue-600 font-semibold" : "text-gray-500"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
