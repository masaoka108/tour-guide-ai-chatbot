import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import net from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  // Check required environment variables
  if (!process.env.DIFY_API_KEY) {
    console.error('Error: DIFY_API_KEY environment variable is required');
    process.exit(1);
  }

  // Initialize routes and create server
  const server = createServer(app);
  registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[express] Error: ${message}`);
    res.status(status).json({ message });
  });

  // Setup development or production mode
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Function to check if a port is in use
  const isPortInUse = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', () => resolve(true))
        .once('listening', () => {
          tester.once('close', () => resolve(false));
          tester.close();
        })
        .listen(port, '0.0.0.0');
    });
  };

  // Find an available port starting from the preferred port
  const findAvailablePort = async (startPort: number): Promise<number> => {
    let port = startPort;
    while (await isPortInUse(port)) {
      port++;
    }
    return port;
  };

  try {
    const preferredPort = parseInt(process.env.PORT || '5000');
    const port = await findAvailablePort(preferredPort);

    server.listen(port, "0.0.0.0", () => {
      const time = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      console.log(`${time} [express] Server running at http://0.0.0.0:${port}`);
      app.set('port', port);
    });

    server.on('error', (error: any) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
