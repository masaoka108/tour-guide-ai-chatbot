import { Message } from './types';

class SocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private messageQueue: string[] = [];
  private isConnecting = false;
  private isReady = false;
  private connectionTimeout: number = 5000; // 5 second timeout
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    console.log('[WebSocket] Initializing socket client');
    this.connect();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnectDelay *= 1.5; // Exponential backoff
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
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
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      console.log('[WebSocket] Connecting to:', url);
      
      this.socket = new WebSocket(url);

      // Add connection timeout
      const timeoutId = setTimeout(() => {
        if (!this.isReady && this.socket) {
          console.log('[WebSocket] Connection timeout, retrying...');
          this.socket.close();
          this.handleReconnect();
        }
      }, this.connectionTimeout);
      
      this.socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        clearTimeout(timeoutId);
        this.isConnecting = false;
        this.isReady = true;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.reconnectDelay = 1000;
        this.processMessageQueue();
      };

      this.socket.onclose = () => {
        console.log('[WebSocket] Connection closed');
        clearTimeout(timeoutId);
        this.isConnecting = false;
        this.isReady = false;
        this.handleReconnect();
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
      this.isReady = false;
      this.handleReconnect();
    }
  }

  private async processMessageQueue() {
    console.log('[WebSocket] Processing message queue:', this.messageQueue.length);
    while (this.messageQueue.length > 0) {
      if (!this.isReady || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.log('[WebSocket] Connection lost while processing queue');
        break;
      }
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this._sendMessage(message);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[WebSocket] Error sending queued message:', error);
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  private async _sendMessage(content: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    const message = JSON.stringify({
      content,
      timestamp: Date.now()
    });
    this.socket.send(message);
  }

  public async sendMessage(content: string) {
    if (!content.trim()) {
      console.log('[WebSocket] Empty message, not sending');
      return;
    }

    if (this.isReady && this.socket?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending message immediately');
      await this._sendMessage(content);
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
