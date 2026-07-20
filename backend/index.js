import app from './app.js';
import config from './config/config.js';
import logger from './utils/logger.js';
import { syncLatestData } from './services/ingestionService.js';

const PORT = config.port;

// Boot Server
const server = app.listen(PORT, () => {
  logger.info(`================================================`);
  logger.info(`AI GOLD TRADING INTELLIGENCE PLATFORM ENGINE RUNNING`);
  logger.info(`- Port: ${PORT}`);
  logger.info(`- Environment: ${config.nodeEnv}`);
  logger.info(`================================================`);
  
  // Check if database is configured before launching background sync
  const isDefaultDb = config.supabase.url.includes('your-project-id') || config.supabase.key.includes('your-supabase-key');
  if (isDefaultDb) {
    logger.warn('[SERVER] Placeholder Supabase credentials detected. Background sync scheduler suspended.');
    logger.info('[SERVER] Run in offline/dry-run REST API mode.');
  } else {
    logger.info('[SERVER] Live database connection active. Launching candle sync scheduler (Interval: 5 minutes)...');
    
    // Run an initial sync once immediately on startup
    syncLatestData().catch(err => {
      logger.error(`Initial data sync failed: ${err.message}`);
    });

    // Schedule sync to run every 5 minutes
    const SYNC_INTERVAL_MS = 5 * 60 * 1000;
    setInterval(async () => {
      try {
        await syncLatestData();
      } catch (err) {
        logger.error(`Error in background data sync: ${err.message}`);
      }
    }, SYNC_INTERVAL_MS);
  }
});

// Handle graceful shutdowns
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
