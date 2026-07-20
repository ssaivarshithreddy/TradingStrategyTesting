import YahooFinanceClass from 'yahoo-finance2';
import supabase from '../config/db.js';
import logger from '../utils/logger.js';

const yahooFinance = new YahooFinanceClass();

// Ticker configuration (XAUUSD=X is Spot Gold, GC=F is Gold Futures)
const GOLD_TICKER = process.env.GOLD_TICKER || 'XAUUSD=X';

/**
 * Helper to compute UTC 4-hour boundary timestamp for a given date
 * @param {Date} date 
 * @returns {Date}
 */
function get4hBoundaryDate(date) {
  const d = new Date(date);
  const hour = d.getUTCHours();
  const boundaryHour = Math.floor(hour / 4) * 4;
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    boundaryHour,
    0,
    0,
    0
  ));
}

/**
 * Aggregates 1-hour quotes into 4-hour quotes
 * @param {Array} quotes 
 * @returns {Array}
 */
function aggregateTo4h(quotes) {
  if (!quotes || quotes.length === 0) return [];
  
  // Sort ascending by date
  const sorted = [...quotes].sort((a, b) => new Date(a.date) - new Date(b.date));
  const groups = {};

  for (const quote of sorted) {
    if (!quote.close || !quote.open || !quote.high || !quote.low) continue;
    const boundaryDate = get4hBoundaryDate(quote.date);
    const key = boundaryDate.toISOString();

    if (!groups[key]) {
      groups[key] = {
        date: boundaryDate,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume || 0,
        quotesInGroup: []
      };
    }
    
    groups[key].high = Math.max(groups[key].high, quote.high);
    groups[key].low = Math.min(groups[key].low, quote.low);
    groups[key].close = quote.close; // Keep updating close to capture the latest close
    groups[key].volume += (quote.volume || 0);
    groups[key].quotesInGroup.push(quote);
  }

  return Object.values(groups).map(g => ({
    date: g.date,
    open: g.open,
    high: g.high,
    low: g.low,
    close: g.close,
    volume: g.volume
  }));
}

/**
 * Fetches candle data from Yahoo Finance for a specified timeframe
 * @param {string} timeframe - '30m', '1h', '4h', '1d'
 * @param {number} daysAgo - number of days of history to fetch
 * @returns {Promise<Array>}
 */
export async function fetchCandlesFromProvider(timeframe, daysAgo = 30, tickerSymbol = 'GC=F') {
  const now = new Date();
  const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  
  let yfInterval = '1d';
  let fetchTimeframe = timeframe;

  if (timeframe === '5m') {
    yfInterval = '5m';
  } else if (timeframe === '30m') {
    yfInterval = '30m';
  } else if (timeframe === '1h') {
    yfInterval = '1h';
  } else if (timeframe === '4h') {
    // We fetch 1h and aggregate to 4h
    yfInterval = '1h';
    fetchTimeframe = '1h';
  } else if (timeframe === '1d') {
    yfInterval = '1d';
  }

  logger.info(`Fetching ${tickerSymbol} data from Yahoo Finance: timeframe=${timeframe}, interval=${yfInterval}, since=${startDate.toISOString().split('T')[0]}`);

  try {
    const result = await yahooFinance.chart(tickerSymbol, {
      period1: startDate,
      interval: yfInterval,
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      logger.warn(`No quotes returned for timeframe=${timeframe}`);
      return [];
    }

    let rawQuotes = result.quotes.map(q => ({
      date: new Date(q.date),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume || 0
    })).filter(q => q.open !== null && q.close !== null);

    if (timeframe === '4h') {
      rawQuotes = aggregateTo4h(rawQuotes);
    }

    logger.info(`Successfully fetched and prepared ${rawQuotes.length} quotes for timeframe=${timeframe}`);
    return rawQuotes;
  } catch (error) {
    logger.error(`Error fetching candles from provider (timeframe=${timeframe}): ${error.message}`);
    throw error;
  }
}

/**
 * Formats and inserts/upserts candles into Supabase DB
 * @param {string} timeframe - '30m', '1h', '4h', '1d'
 * @param {Array} quotes 
 * @returns {Promise<number>} - number of successfully upserted candles
 */
export async function saveCandlesToDb(timeframe, quotes) {
  if (!quotes || quotes.length === 0) return 0;

  const formatted = quotes.map(q => ({
    timeframe,
    timestamp: q.date.toISOString(),
    open: parseFloat(q.open),
    high: parseFloat(q.high),
    low: parseFloat(q.low),
    close: parseFloat(q.close),
    volume: parseFloat(q.volume) || 0
  }));

  try {
    const { data, error } = await supabase
      .from('candles')
      .upsert(formatted, { 
        onConflict: 'timeframe,timestamp',
        ignoreDuplicates: false 
      });

    if (error) {
      throw error;
    }

    logger.info(`Upserted ${formatted.length} candles in database for timeframe=${timeframe}`);
    return formatted.length;
  } catch (error) {
    logger.error(`Database error upserting candles (timeframe=${timeframe}): ${error.message}`);
    throw error;
  }
}

/**
 * Runs the historical data seeding process for all configured timeframes
 * @param {number} daysLimit - number of historical days to seed
 */
export async function seedAllTimeframes(daysLimit = 30) {
  const timeframes = ['30m', '1h', '4h', '1d'];
  const results = {};

  logger.info(`Starting historical data seeding for past ${daysLimit} days...`);
  for (const tf of timeframes) {
    try {
      // Yahoo finance has standard limits on intraday data. 
      // 30m is usually restricted to last 30 days max. Let's adjust window accordingly.
      const daysToFetch = tf === '30m' ? Math.min(daysLimit, 30) : daysLimit;
      const quotes = await fetchCandlesFromProvider(tf, daysToFetch);
      const count = await saveCandlesToDb(tf, quotes);
      results[tf] = count;
    } catch (err) {
      logger.error(`Failed seeding timeframe ${tf}: ${err.message}`);
      results[tf] = 0;
    }
  }

  logger.info(`Historical seeding complete. Summary: ${JSON.stringify(results)}`);
  return results;
}

/**
 * Runs a delta sync (polling) to fetch and save only the latest updates.
 * Can be run in a regular cron schedule.
 */
export async function syncLatestData() {
  const timeframes = ['30m', '1h', '4h', '1d'];
  logger.info('Starting scheduled synchronization of latest candles...');
  
  for (const tf of timeframes) {
    try {
      // For syncing, we only need to fetch the last 1-2 days
      const quotes = await fetchCandlesFromProvider(tf, 2);
      await saveCandlesToDb(tf, quotes);
    } catch (err) {
      logger.error(`Failed to sync latest candles for ${tf}: ${err.message}`);
    }
  }
  
  logger.info('Synchronization complete.');
}
