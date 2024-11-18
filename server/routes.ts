import type { Express } from "express";
import { WebSocketServer } from 'ws';
import { handleMessage } from './services/dify';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { ExtendedWebSocket } from './services/dify';
import crypto from 'crypto';

export function registerRoutes(app: Express) {
  const wss = new WebSocketServer({ noServer: true });

  // Implement heartbeat mechanism to detect stale connections
  const heartbeat = (ws: ExtendedWebSocket) => {
    console.log('[WebSocket] Heartbeat received');
    ws.isAlive = true;
  };

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('[WebSocket] New connection established');
    ws.isAlive = true;
    ws.on('pong', () => {
      console.log('[WebSocket] Received pong');
      heartbeat(ws);
    });

    ws.on('message', async (data: Buffer) => {
      try {
        console.log('[WebSocket] Received message:', data.toString());
        const { content, timestamp } = JSON.parse(data.toString());
        
        // Send user message immediately
        const userMessage = {
          id: crypto.randomUUID(),
          content,
          role: 'user',
          timestamp: Date.now()
        };
        console.log('[WebSocket] Sending user message:', userMessage);
        ws.send(JSON.stringify(userMessage));

        console.log('[WebSocket] Processing through Dify with conversationId:', ws.conversationId);
        await handleMessage(content, ws, ws.conversationId);
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({
          id: crypto.randomUUID(),
          content: 'An error occurred while processing your message. Please try again.',
          role: 'assistant',
          timestamp: Date.now()
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    ws.on('close', () => {
      console.log('[WebSocket] Connection closed');
      ws.isAlive = false;
    });
  });

  // Implement connection cleanup interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (!extWs.isAlive) {
        console.log('[WebSocket] Terminating inactive connection');
        return ws.terminate();
      }
      extWs.isAlive = false;
      ws.ping(() => {
        console.log('[WebSocket] Ping sent');
      });
    });
  }, 30000);

  wss.on('close', () => {
    console.log('[WebSocket] Server closing');
    clearInterval(interval);
  });

  // Handle upgrade request
  app.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    console.log('[WebSocket] Upgrade request received');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws as ExtendedWebSocket, request);
    });
  });
}
