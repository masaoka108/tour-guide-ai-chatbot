import type { Express } from "express";
import { WebSocketServer } from 'ws';
import { handleMessage } from './services/dify';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { ExtendedWebSocket } from './services/dify';

export function registerRoutes(app: Express) {
  const wss = new WebSocketServer({ noServer: true });

  // Implement heartbeat mechanism to detect stale connections
  const heartbeat = (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
  };

  wss.on('connection', (ws: ExtendedWebSocket) => {
    (ws as any).isAlive = true;
    ws.on('pong', () => heartbeat(ws));

    ws.on('message', async (data: Buffer) => {
      try {
        const { content, timestamp } = JSON.parse(data.toString());
        
        // Send user message immediately
        const userMessage = {
          id: crypto.randomUUID(),
          content,
          role: 'user',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(userMessage));

        // Process message through Dify with conversation context
        await handleMessage(content, ws, ws.conversationId);
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          id: crypto.randomUUID(),
          content: 'An error occurred while processing your message. Please try again.',
          role: 'assistant',
          timestamp: Date.now()
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      (ws as any).isAlive = false;
    });
  });

  // Implement connection cleanup interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (!(extWs as any).isAlive) {
        return ws.terminate();
      }
      (extWs as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // Handle upgrade request
  app.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws as ExtendedWebSocket, request);
    });
  });
}
