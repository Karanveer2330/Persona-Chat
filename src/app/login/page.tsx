"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "@/src/contexts/AuthContext";
import { LogIn, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, loginAnonymous } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Use relative URL to go through Next.js proxy
      const res = await fetch('/api/users/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        toast.error(data.error || "Login failed");
        return;
      }
      // Log in the user in your context
      login({
        id: data.user.id,
        name: data.user.username,
        avatarUrl: `https://placehold.co/100x100.png?text=${data.user.username.substring(0,2).toUpperCase()}`,
        isOnline: true,
        isAnonymous: false, // Explicitly mark as not anonymous
      });
      toast.success("Login successful! Redirecting...");
      router.push('/chat/global');
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = "Login failed";
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = "Cannot connect to server. Please ensure the backend is running.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleAnonymous = () => {
    loginAnonymous();
    router.push('/chat/global');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Welcome Back!</CardTitle>
          <CardDescription>Log in to continue to Hub.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Your Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-5 w-5" /> Log In
            </Button>
          </form>
          <div className="flex items-center justify-center mt-4">
            {/* Anonymous login button */}
            <Button variant="outline" className="w-full" onClick={handleAnonymous}>
              <User className="mr-2 h-5 w-5" /> Continue as Anonymous
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Link href="#" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}