"use client";

import { useEffect } from 'react';

export const GlobalErrorHandler: React.FC = () => {
  useEffect(() => {
    // Setup global error handlers for unhandled promise rejections and errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress Web3/Ethereum related errors from browser extensions
      if (event.reason?.message?.includes('ethereum') || 
          event.reason?.message?.includes('web3') ||
          event.reason?.message?.includes('selectedAddress')) {
        event.preventDefault();
        return;
      }
      
      // Handle null/undefined reason gracefully
      if (event.reason) {
        console.error('Unhandled promise rejection:', event.reason);
      } else {
        console.error('Unhandled promise rejection: Unknown reason');
      }
    };

    const handleError = (event: ErrorEvent) => {
      // Suppress Web3/Ethereum related errors from browser extensions
      if (event.message?.includes('ethereum') || 
          event.message?.includes('web3') ||
          event.message?.includes('selectedAddress')) {
        event.preventDefault();
        return;
      }
      
      // Suppress ResizeObserver errors (common browser quirk)
      if (event.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
          event.message?.includes('ResizeObserver loop limit exceeded')) {
        event.preventDefault();
        return;
      }
      
      // Handle null error gracefully
      if (event.error) {
        console.error('Global error:', event.error);
      } else if (event.message) {
        console.error('Global error:', event.message);
      } else {
        console.error('Global error: Unknown error occurred');
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

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

    // Cleanup on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null; // This component doesn't render anything
};
