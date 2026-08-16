import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes.js';

dotenv.config();

// Default project configuration fallback if not set in runtime environment
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://hepedzbbmrdsslvxiobv.supabase.co';
}
if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcGVkemJibXJkc3Nsdnhpb2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NzQ3NzYsImV4cCI6MjEwMjM1MDc3Nn0.V-04N73YUy5nYe_PRhbM_G05qn_D6uMrv_-Ww0m76H0';
}
if (!process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = 'https://hepedzbbmrdsslvxiobv.supabase.co';
}
if (!process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcGVkemJibXJkc3Nsdnhpb2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NzQ3NzYsImV4cCI6MjEwMjM1MDc3Nn0.V-04N73YUy5nYe_PRhbM_G05qn_D6uMrv_-Ww0m76H0';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), app: 'Haven Mattresses Kenya' });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Haven Mattresses Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
