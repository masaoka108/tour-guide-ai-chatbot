import type { Express } from "express";
import { WebSocketServer } from 'ws';
import { handleMessage } from './services/dify';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { ExtendedWebSocket } from './services/dify';
import crypto from 'crypto';

export function registerRoutes(app: Express) {
  // Add endpoint to get server port
  app.get('/api/port', (_req, res) => {
    const port = app.get('port') || process.env.PORT || 5000;
    res.json({ port });
  });

  const wss = new WebSocketServer({ 
    noServer: true,
    clientTracking: true,
    perMessageDeflate: false,
    maxPayload: 50 * 1024 * 1024 // 50MB max payload
  });

  // Implement heartbeat mechanism to detect stale connections
  const heartbeat = (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
  };

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('[WebSocket] New connection established');
    ws.isAlive = true;

    // Send initial connection success message
    ws.send(JSON.stringify({
      id: crypto.randomUUID(),
      content: 'Connected successfully to AI Tourism Guide',
      role: 'system',
      timestamp: Date.now()
    }));

    ws.on('pong', () => heartbeat(ws));

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const { content } = message;
        
        if (!content || typeof content !== 'string') {
          throw new Error('Invalid message format');
        }

        // Process through Dify
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
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    console.log('[WebSocket] Server closing');
    clearInterval(interval);
  });

  // Handle upgrade requests
  app.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (socket.destroyed) {
      console.log('[WebSocket] Socket already destroyed, ignoring upgrade');
      return;
    }

    console.log('[WebSocket] Upgrade request received');
    
    socket.on('error', (err) => {
      console.error('[WebSocket] Upgrade socket error:', err);
    });

    try {
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('[WebSocket] Connection upgraded successfully');
        wss.emit('connection', ws as ExtendedWebSocket, request);
      });
    } catch (error) {
      console.error('[WebSocket] Upgrade error:', error);
      socket.destroy();
    }
  });
}
