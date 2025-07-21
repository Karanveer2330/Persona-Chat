
import ChatSidebar from "@/src/components/chat/ChatSidebar";
import React from 'react';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Adjust height to account for AppHeader */}
      <ChatSidebar className="w-full max-w-xs md:max-w-sm lg:max-w-md hidden md:block shrink-0" />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
