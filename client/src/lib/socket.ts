import { Message } from './types';

class SocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor() {
    console.log('[WebSocket] Initializing socket client');
    this.connect();
  }

  private connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    console.log('[WebSocket] Connecting to:', url);
    
    this.socket = new WebSocket(url);
    
    this.socket.onopen = () => {
      console.log('[WebSocket] Connection established');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    };

    this.socket.onclose = () => {
      console.log('[WebSocket] Connection closed');
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
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

  public sendMessage(content: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        content,
        timestamp: Date.now()
      });
      console.log('[WebSocket] Sending message:', message);
      this.socket.send(message);
    } else {
      console.error('[WebSocket] Cannot send message - connection not open');
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
