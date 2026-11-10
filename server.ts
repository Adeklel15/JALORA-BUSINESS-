import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Default to port 3000, or allow override if PORT is set and not colliding with reverse proxy
const PORT = parseInt(process.env.APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : '3000'), 10);
const HOST = '0.0.0.0';

app.use(express.json());

// Health check endpoint for Cloud Run and uptime probes
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', app: 'JALORA', timestamp: new Date().toISOString() });
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(distPath);

  if (isProduction && fs.existsSync(distPath)) {
    // Serve static files from built dist folder
    app.use(express.static(distPath, {
      maxAge: '1h',
    }));

    // Fallback all SPA routes to index.html
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In dev mode, attach Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`JALORA Server running on http://${HOST}:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('Server terminated');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
