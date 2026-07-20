import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import config from '../config/config.js';
import { fetchCandlesFromProvider, saveCandlesToDb } from '../services/ingestionService.js';
import supabase from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  logger.info('================================================');
  logger.info('STARTING INGESTION ENGINE VERIFICATION');
  logger.info('================================================');

  // 1. Verify Yahoo Finance fetching & aggregation for all timeframes
  const timeframes = ['30m', '1h', '4h', '1d'];
  const testResults = {};

  for (const tf of timeframes) {
    try {
      // 30m intraday is typically limited to 7-30 days. We fetch 3 days for testing.
      const daysToFetch = tf === '30m' ? 3 : 5;
      
      logger.info(`[TEST] Fetching and aggregating timeframe "${tf}"...`);
      const quotes = await fetchCandlesFromProvider(tf, daysToFetch);
      
      if (quotes && quotes.length > 0) {
        logger.info(`[SUCCESS] Fetched ${quotes.length} candles for "${tf}". First: ${quotes[0].date.toISOString()}, Last: ${quotes[quotes.length - 1].date.toISOString()}`);
        logger.info(`[SAMPLE] Open: ${quotes[0].open}, High: ${quotes[0].high}, Low: ${quotes[0].low}, Close: ${quotes[0].close}`);
        
        testResults[tf] = {
          success: true,
          count: quotes.length,
          sample: quotes[0]
        };
      } else {
        logger.warn(`[WARNING] No candles retrieved for "${tf}".`);
        testResults[tf] = { success: false, reason: 'Empty response' };
      }
    } catch (err) {
      logger.error(`[ERROR] Failed to fetch/aggregate "${tf}": ${err.message}`);
      testResults[tf] = { success: false, error: err.message };
    }
  }

  // 2. Dry-run fallback writing (always save fetched candles locally to check data structure)
  const localOutputFolder = path.join(__dirname, '..', '..', 'scratch');
  if (!fs.existsSync(localOutputFolder)) {
    fs.mkdirSync(localOutputFolder, { recursive: true });
  }
  
  const testDataFile = path.join(localOutputFolder, 'ingested_sample.json');
  fs.writeFileSync(testDataFile, JSON.stringify(testResults, null, 2));
  logger.info(`[LOCAL] Local dry-run results saved to: ${testDataFile}`);

  // 3. Test Database Connection
  logger.info('[DB] Testing connection to Supabase...');
  
  // Detect placeholder/default env variables
  const isDefaultEnv = config.supabase.url.includes('your-project-id') || config.supabase.key.includes('your-supabase-key');
  if (isDefaultEnv) {
    logger.warn('[DB] Supabase credentials in .env are defaults/placeholders. Skipping database write.');
    logger.info('[DB STATUS] VERIFICATION COMPLETE (DRY-RUN MODE)');
    return;
  }

  try {
    // Try to query the candles table to see if it exists
    const { data, error } = await supabase
      .from('candles')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "candles" does not exist')) {
        logger.error('[DB ERROR] The "candles" table does not exist in your database. Please run "backend/config/schema.sql" in your Supabase SQL editor.');
      } else {
        logger.error(`[DB ERROR] Database query error: ${error.message} (Code: ${error.code})`);
      }
      return;
    }

    logger.info('[DB SUCCESS] Successfully queried database.');

    // Attempt to upsert a small batch of quotes to verify actual DB writes
    logger.info('[DB] Attempting test database write for 1d candle...');
    const dailyQuotes = await fetchCandlesFromProvider('1d', 2);
    if (dailyQuotes.length > 0) {
      const writtenCount = await saveCandlesToDb('1d', dailyQuotes.slice(0, 2));
      logger.info(`[DB SUCCESS] Successfully upserted ${writtenCount} candles to the table.`);
    }
    
    logger.info('[DB STATUS] VERIFICATION COMPLETE (LIVE-DATABASE MODE)');
  } catch (err) {
    logger.error(`[DB CONNECTION ERROR] Failed to connect/write to Supabase: ${err.message}`);
  }
}

runTest().catch(err => {
  logger.error(`Unhandled test rejection: ${err.message}`);
  process.exit(1);
});
