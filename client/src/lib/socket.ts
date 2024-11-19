import { Message } from './types';

class SocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private messageQueue: string[] = [];
  private isConnecting = false;
  private isReady = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReconnecting = false;

  constructor() {
    console.log('[WebSocket] Initializing socket client');
    this.connect();
  }

  private async connect() {
    if (this.isConnecting) {
      console.log('[WebSocket] Connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.isReady = false;

    try {
      if (this.socket) {
        this.socket.close();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Get the current location including port
      const hostname = window.location.hostname;
      const port = window.location.port || '5001'; // Default to 5001 if no port specified
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${hostname}${port ? `:${port}` : ''}/ws`;
      
      console.log('[WebSocket] Connecting to:', url);
      this.socket = new WebSocket(url);

      // Set connection timeout
      const timeoutId = setTimeout(() => {
        if (this.socket?.readyState === WebSocket.CONNECTING) {
          console.log('[WebSocket] Connection timeout, closing socket...');
          this.socket.close();
          this.handleReconnect();
        }
      }, 5000);

      this.socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        clearTimeout(timeoutId);
        this.isConnecting = false;
        this.isReady = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.processMessageQueue();
      };

      this.socket.onclose = () => {
        console.log('[WebSocket] Connection closed');
        clearTimeout(timeoutId);
        this.isConnecting = false;
        this.isReady = false;
        if (!this.isReconnecting) {
          this.handleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        clearTimeout(timeoutId);
        this.isConnecting = false;
        this.isReady = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Error during connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private async handleReconnect() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      this.isReconnecting = false;
      this.connect();
    } else {
      console.log('[WebSocket] Max reconnection attempts reached');
      this.isReconnecting = false;
    }
  }

  private async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      if (!this.isReady || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        break;
      }
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.sendMessage(message);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[WebSocket] Error sending queued message:', error);
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  public async sendMessage(content: string) {
    if (!content.trim()) {
      return;
    }

    const message = JSON.stringify({
      content,
      timestamp: Date.now()
    });

    if (this.isReady && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.log('[WebSocket] Connection not ready, queuing message');
      this.messageQueue.push(content);
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  public onMessage(handler: (message: Message) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
}

export const socketClient = new SocketClient();
