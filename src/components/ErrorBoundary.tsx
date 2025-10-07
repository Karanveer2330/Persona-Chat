"use client";

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details (but filter out Web3/Ethereum errors which are usually from browser extensions)
    if (!error.message.includes('ethereum') && !error.message.includes('web3')) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ error, resetError }) => {
  // Don't show error UI for Web3/Ethereum errors (likely from browser extensions)
  if (error?.message.includes('ethereum') || error?.message.includes('web3')) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-600 mb-4">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button 
        onClick={resetError}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try again
      </button>
    </div>
  );
};

// Global error handler for unhandled promise rejections and errors
export const setupGlobalErrorHandlers = () => {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // Suppress Web3/Ethereum related errors from browser extensions
      if (event.reason?.message?.includes('ethereum') || 
          event.reason?.message?.includes('web3') ||
          event.reason?.message?.includes('selectedAddress')) {
        event.preventDefault();
        return;
      }
      console.error('Unhandled promise rejection:', event.reason);
    });

    // Handle general JavaScript errors
    window.addEventListener('error', (event) => {
      // Suppress Web3/Ethereum related errors from browser extensions
      if (event.message?.includes('ethereum') || 
          event.message?.includes('web3') ||
          event.message?.includes('selectedAddress')) {
        event.preventDefault();
        return;
      }
      console.error('Global error:', event.error);
    });

    // Prevent ethereum-related errors by adding a defensive check
    try {
      if (typeof (window as any).ethereum !== 'undefined') {
        // Create a defensive wrapper to prevent assignment errors
        const ethereum = (window as any).ethereum;
        if (ethereum && typeof ethereum === 'object') {
          // Override the selectedAddress setter to prevent errors
          Object.defineProperty(ethereum, 'selectedAddress', {
            get() { return this._selectedAddress; },
            set(value) { 
              try {
                this._selectedAddress = value;
              } catch (error) {
                // Silently ignore ethereum assignment errors
              }
            },
            configurable: true
          });
        }
      }
    } catch (error) {
      // Silently ignore any ethereum setup errors
    }
  }
};
