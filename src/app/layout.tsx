import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/src/components/ui/toaster';
import { AuthProvider } from '@/src/contexts/AuthContext';
import AppHeader from '@/src/components/layout/AppHeader';

export const metadata: Metadata = {
  title: 'Hub',
  description: 'A real-time communication and collaboration platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <AppHeader />
          <main className="flex-grow">
              <Toaster />

            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
