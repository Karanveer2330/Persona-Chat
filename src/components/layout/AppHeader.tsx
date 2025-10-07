
"use client";
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/src/components/ui/dropdown-menu';
import { LogIn, LogOut, UserCircle, Settings } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '@/src/contexts/AuthContext';

// Utility function to safely get user display information
const getUserDisplayInfo = (user: any) => {
  return {
    name: user?.name || 'Unknown User',
    displayName: user?.name || 'Unknown User',
    avatarUrl: user?.avatarUrl,
    id: user?.id || 'Unknown ID',
    initials: (user?.name || 'U').substring(0, 2).toUpperCase()
  };
};

export default function AppHeader() {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Logo />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="w-full flex h-16 items-center px-4 md:px-6">
        <Logo />
        <div className="flex-1"></div>
        <div className="flex items-center">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage 
                      src={getUserDisplayInfo(user).avatarUrl} 
                      alt={getUserDisplayInfo(user).displayName}
                      onError={(e) => {
                        // Hide the image on error, fallback will show
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <AvatarFallback>{getUserDisplayInfo(user).initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getUserDisplayInfo(user).displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {getUserDisplayInfo(user).id.startsWith('user-') ? `ID: ${getUserDisplayInfo(user).id.substring(5)}` : getUserDisplayInfo(user).id}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
