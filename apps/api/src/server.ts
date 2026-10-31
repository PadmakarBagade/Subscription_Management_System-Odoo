import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { JobScheduler } from './jobs/scheduler';

const server = app.listen(config.port, () => {
  logger.info(`Brightloop API server running on port ${config.port} (${config.env})`);
  logger.info(`Health check available at http://localhost:${config.port}/health`);

  // Start background jobs scheduler
  JobScheduler.start();
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  JobScheduler.stop();

  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma database connection closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
