import type { Express } from "express";
import { WebSocketServer, WebSocket } from 'ws';
import { handleMessage } from './services/dify';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

export function registerRoutes(app: Express) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const { content, timestamp } = JSON.parse(data.toString());
        
        // Get response from Dify
        const difyResponse = await handleMessage(content);
        
        // Send response
        const response = {
          id: crypto.randomUUID(),
          content: difyResponse,
          role: 'assistant',
          timestamp: Date.now(),
          responseTime: Date.now() - timestamp
        };

        ws.send(JSON.stringify(response));
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          id: crypto.randomUUID(),
          content: 'エラーが発生しました。もう一度お試しください。',
          role: 'assistant',
          timestamp: Date.now()
        }));
      }
    });
  });

  // @ts-ignore - Express types don't match perfectly with WebSocket upgrade
  app.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
}
