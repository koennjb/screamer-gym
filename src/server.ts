import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { initializeDatabase, seedIfNeeded } from './lib/db';
import { setupThreadWebSocket } from './lib/threads-websocket';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, dir: __dirname + '/..' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Initialize database
  initializeDatabase();
  
  // Seed with dummy data if empty
  seedIfNeeded();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  setupThreadWebSocket(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
