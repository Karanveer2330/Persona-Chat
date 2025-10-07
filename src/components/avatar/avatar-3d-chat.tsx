"use client";

import { useState } from "react";
import dynamic from 'next/dynamic';
import { SidebarProvider, Sidebar, SidebarInset } from "@/src/components/ui/sidebar";
import AvatarControls from "@/src/components/avatar/avatar-controls";
import { Card, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";

const ThreeCanvas = dynamic(() => import('@/src/components/three-canvas'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse" /> 
});

interface Avatar3DChatProps {
  children?: React.ReactNode;
}

export default function Avatar3DChat({ children }: Avatar3DChatProps) {
  const [vrmUrl, setVrmUrl] = useState<string | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex h-full w-full bg-background overflow-hidden">
        <Sidebar collapsible="icon" className="border-r">
          <AvatarControls 
            onVrmUpload={setVrmUrl} 
            isCameraEnabled={isCameraEnabled}
            onToggleCamera={setIsCameraEnabled}
          />
        </Sidebar>
        <SidebarInset className="flex-1">
          <div className="flex h-full">
            {/* 3D Avatar Section */}
            <div className="w-1/3 relative border-r">
              <ThreeCanvas vrmUrl={vrmUrl} isCameraEnabled={isCameraEnabled} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                {vrmUrl !== null && !isCameraEnabled && (
                   <Card className="max-w-md pointer-events-auto shadow-2xl animate-fade-in-up">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-foreground">Enable Camera</CardTitle>
                      <CardDescription className="text-sm">Activate your camera to animate your 3D avatar.</CardDescription>
                    </CardHeader>
                   </Card>
                )}
              </div>
            </div>
            
            {/* Chat Section */}
            <div className="flex-1">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
