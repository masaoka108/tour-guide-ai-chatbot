import { Message } from './types';

class SocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private messageQueue: string[] = [];
  private isConnecting = false;
  private isReady = false; // Add ready state tracking
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
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
      // Wait for any existing socket to close
      if (this.socket) {
        this.socket.close();
        // Wait for socket to fully close
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      console.log('[WebSocket] Connecting to:', url);
      
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        this.isConnecting = false;
        this.isReady = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        // Process queued messages
        this.processMessageQueue();
      };

      this.socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed', event);
        this.isConnecting = false;
        this.isReady = false;
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.isConnecting = false;
        this.isReady = false;
      };

      this.socket.onmessage = (event) => {
        console.log('[WebSocket] Received message:', event.data);
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
      this.isReady = false;
      this.handleReconnect();
    }
  }

  private async processMessageQueue() {
    console.log('[WebSocket] Processing message queue:', this.messageQueue.length);
    while (this.messageQueue.length > 0 && this.isReady) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.sendMessage(message);
          // Add small delay between messages
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[WebSocket] Error sending queued message:', error);
          // Re-queue message if failed
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnectDelay *= 1.5;
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  public async sendMessage(content: string) {
    if (!content.trim()) {
      console.log('[WebSocket] Empty message, not sending');
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN && this.isReady) {
      const message = JSON.stringify({
        content,
        timestamp: Date.now()
      });
      console.log('[WebSocket] Sending message:', message);
      this.socket.send(message);
    } else {
      console.log('[WebSocket] Connection not ready, queuing message');
      this.messageQueue.push(content);
      if (!this.isConnecting) {
        await this.connect();
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
