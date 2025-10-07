import { io, Socket } from 'socket.io-client';

// Modern HTTPS-first connection strategy with intelligent fallback
class ConnectionManager {
  private static instance: ConnectionManager;
  private currentSocket: Socket | null = null;
  private connectionAttempts = 0;
  private maxAttempts = 3;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  // Get the optimal connection URL based on environment
  private getOptimalUrl(): string {
    if (typeof window === 'undefined') {
      return 'https://localhost:3443';
    }

    const hostname = window.location.hostname;
    const pageProtocol = window.location.protocol;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // Prefer page protocol to avoid mixed content
    if (pageProtocol === 'https:') {
      return `https://${hostname}:3443`;
    }
    
    // Fallback to HTTP for mobile or non-HTTPS
    return `http://${hostname}:3444`;
  }

  // Test connection with timeout and retry logic
  private async testConnection(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/api/test`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get the best available connection URL
  async getBestConnectionUrl(): Promise<string> {
    const primaryUrl = this.getOptimalUrl();

    // Always use HTTPS, no fallbacks to HTTP
    if (await this.testConnection(primaryUrl)) {
      return primaryUrl;
    }

    // Return primary as last resort
    return primaryUrl;
  }

  // Create socket connection with advanced error handling
  async createSocketConnection(): Promise<Socket> {
    if (this.currentSocket?.connected) {
      return this.currentSocket;
    }

    const url = await this.getBestConnectionUrl();
    // Detect mobile device
    const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const useWebsocketOnly = url.startsWith('https://');
    const socket = io(url, {
      transports: useWebsocketOnly ? ['websocket'] : ['websocket', 'polling'],
      timeout: isMobile ? 30000 : 20000, // Longer timeout for mobile
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: isMobile ? 8 : 5, // More attempts for mobile
      reconnectionDelay: 1000,
      reconnectionDelayMax: isMobile ? 10000 : 5000, // Longer max delay for mobile
      upgrade: true,
      rememberUpgrade: true,
      secure: url.startsWith('https://'),
      rejectUnauthorized: false, // Allow self-signed certificates
      extraHeaders: {
        'X-Client-Type': 'web-chat-app',
        'X-Device-Type': isMobile ? 'mobile' : 'desktop'
      }
    });

    // Enhanced connection event handling
    socket.on('connect', () => {
      this.connectionAttempts = 0;
      this.currentSocket = socket;
    });

    socket.on('connect_error', (error) => {
      this.connectionAttempts++;
      console.error(`❌ Socket.IO connection error (attempt ${this.connectionAttempts}):`, error);
      
      if (this.connectionAttempts < this.maxAttempts) {
        `);
      } else {
        console.error('❌ Max connection attempts reached');
      }
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        this.currentSocket = null;
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      this.connectionAttempts = 0;
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed after all attempts');
    });

    return socket;
  }

  // Get current socket or create new one
  async getSocket(): Promise<Socket> {
    if (this.currentSocket?.connected) {
      return this.currentSocket;
    }
    return await this.createSocketConnection();
  }

  // Disconnect current socket
  disconnect(): void {
    if (this.currentSocket) {
      this.currentSocket.disconnect();
      this.currentSocket = null;
    }
  }
}

// Export singleton instance
const connectionManager = ConnectionManager.getInstance();

// Public API functions
export async function getApiBaseUrl(): Promise<string> {
  return await connectionManager.getBestConnectionUrl();
}

export async function createSocketConnection(): Promise<Socket> {
  return await connectionManager.createSocketConnection();
}

export async function getSocket(): Promise<Socket> {
  return await connectionManager.getSocket();
}

export function disconnectSocket(): void {
  connectionManager.disconnect();
}

// Enhanced connection test with detailed diagnostics
export async function testConnection(): Promise<{ 
  success: boolean; 
  url: string; 
  error?: string;
  details?: {
    protocol: string;
    secure: boolean;
    responseTime: number;
    certificateValid: boolean;
  };
}> {
  const startTime = Date.now();
  const httpsUrl = 'http://localhost:3444';

  try {
    // Test HTTPS backend connection
    const httpsStartTime = Date.now();
    const httpsResponse = await fetch(`${httpsUrl}/api/test`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    const responseTime = Date.now() - httpsStartTime;

    if (httpsResponse.ok) {
      return { 
        success: true, 
        url: httpsUrl,
        details: {
          protocol: 'https',
          secure: true,
          responseTime,
          certificateValid: true
        }
      };
    } else {
      return { 
        success: false, 
        url: httpsUrl, 
        error: `HTTPS ${httpsResponse.status}`,
        details: {
          protocol: 'https',
          secure: true,
          responseTime,
          certificateValid: true
        }
      };
    }
  } catch (httpsError) {
    const errorMessage = httpsError instanceof Error ? httpsError.message : String(httpsError);
    return { 
      success: false, 
      url: httpsUrl, 
      error: `HTTPS connection failed: ${errorMessage}`,
      details: {
        protocol: 'none',
        secure: false,
        responseTime: Date.now() - startTime,
        certificateValid: false
      }
    };
  }
}

