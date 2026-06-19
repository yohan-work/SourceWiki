import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectDatabase } from './lib/database.js';
import { logger } from './lib/logger.js';

const server = createServer(createApp());

server.listen(env.API_PORT, '0.0.0.0', () => {
  logger.info({ port: env.API_PORT }, 'SourceWiki API listening');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  server.close(async (error) => {
    await disconnectDatabase();
    if (error) {
      logger.error({ err: error }, 'HTTP server shutdown failed');
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
