import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/src/components/ui/toaster';
import { AuthProvider } from '@/src/contexts/AuthContext';
import AppHeader from '@/src/components/layout/AppHeader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GlobalErrorHandler } from '../components/GlobalErrorHandler';

export const metadata: Metadata = {
  title: 'Hub',
  description: 'A real-time communication and collaboration platform.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hub'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Prevent Web3/Ethereum errors from browser extensions
            (function() {
              try {
                if (typeof window !== 'undefined' && window.ethereum) {
                  const originalEthereum = window.ethereum;
                  Object.defineProperty(window, 'ethereum', {
                    get: function() { return originalEthereum; },
                    set: function(value) {
                      try {
                        if (value && typeof value === 'object' && 'selectedAddress' in value) {
                          Object.defineProperty(value, 'selectedAddress', {
                            get: function() { return this._selectedAddress; },
                            set: function(addr) { 
                              try { this._selectedAddress = addr; } catch(e) {} 
                            },
                            configurable: true
                          });
                        }
                        originalEthereum = value;
                      } catch(e) {}
                    },
                    configurable: true
                  });
                }
              } catch(e) {}
            })();
          `
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen touch-manipulation overscroll-none">
        <GlobalErrorHandler />
        <ErrorBoundary>
          <AuthProvider>
            <AppHeader />
            <main className="flex-grow flex flex-col overflow-hidden">
              {children}
            </main>
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
