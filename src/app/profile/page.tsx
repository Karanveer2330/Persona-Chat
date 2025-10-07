
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "@/src/contexts/AuthContext";
import { Edit3, Mail, Save, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading, isAuthenticated, login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@example.com"); // Mock email
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
    if (user) {
      setName(user.name);
    }
  }, [user, loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-2xl animate-pulse">
          <CardHeader className="items-center">
            <div className="h-24 w-24 rounded-full bg-muted" />
            <div className="h-6 w-40 bg-muted mt-4 rounded" />
            <div className="h-4 w-60 bg-muted mt-2 rounded" />
          </CardHeader>
          <CardContent className="space-y-6 mt-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
            </div>
            <div className="h-10 w-32 bg-muted rounded mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    if (user) {
      const updatedUser = { ...user, name };
      login(updatedUser); // This mock login function updates the user in context and localStorage
      setIsEditing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background" data-ai-hint="profile avatar large">
            <AvatarImage 
              src={user.avatarUrl} 
              alt={user.name}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-headline">{isEditing ? "Edit Profile" : user.name}</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center">
              <UserIcon className="w-4 h-4 mr-2 text-muted-foreground" /> Full Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-muted-foreground" /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled // Email editing not supported in this mock
              className="text-base bg-muted/50"
            />
             <p className="text-xs text-muted-foreground">Email editing is disabled for this demo.</p>
          </div>
          
          {isEditing ? (
            <Button onClick={handleSave} className="w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full md:w-auto">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
