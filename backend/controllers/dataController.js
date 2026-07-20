import { fetchCandlesFromProvider } from '../services/ingestionService.js';
import supabase from '../config/db.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

function resolveTickerSymbol(ticker) {
  if (!ticker) return 'GC=F';
  const clean = ticker.toUpperCase();
  if (clean === 'NIFTY' || clean === 'NIFTY50' || clean === '^NSEI') {
    return '^NSEI';
  }
  return 'GC=F';
}

export async function getCandles(req, res, next) {
  try {
    const timeframe = req.query.timeframe || '1h';
    const limit = parseInt(req.query.limit, 10) || 100;
    const ticker = req.query.ticker || 'GOLD';
    const tickerSymbol = resolveTickerSymbol(ticker);
    
    // Check if database is configured
    const isDefaultDb = config.supabase.url.includes('your-project-id');
    
    if (isDefaultDb) {
      // Direct live fallback fetch from Yahoo Finance
      const daysToFetch = timeframe === '5m' ? 2 : timeframe === '30m' ? 5 : timeframe === '1d' ? 90 : 30;
      const quotes = await fetchCandlesFromProvider(timeframe, daysToFetch, tickerSymbol);
      const formatted = quotes.slice(-limit).map(q => ({
        timeframe,
        timestamp: q.date.toISOString(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume
      }));
      return res.status(200).json({
        source: 'yahoo-finance-fallback',
        ticker: ticker.toUpperCase(),
        timeframe,
        count: formatted.length,
        candles: formatted
      });
    }

    // Query Supabase database
    const { data, error } = await supabase
      .from('candles')
      .select('*')
      .eq('timeframe', timeframe)
      .eq('symbol', tickerSymbol)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      // If column 'symbol' doesn't exist yet on user's local Supabase, fallback to query without symbol
      if (error.code === 'PGRST204' || error.message.includes('symbol')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('candles')
          .select('*')
          .eq('timeframe', timeframe)
          .order('timestamp', { ascending: false })
          .limit(limit);
        if (fallbackError) throw fallbackError;
        return res.status(200).json({
          source: 'database-fallback-no-symbol',
          ticker: ticker.toUpperCase(),
          timeframe,
          count: fallbackData.length,
          candles: fallbackData.reverse()
        });
      }
      throw error;
    }

    // Return in chronological ascending order for charting library
    const orderedCandles = data.reverse();

    return res.status(200).json({
      source: 'database',
      ticker: ticker.toUpperCase(),
      timeframe,
      count: orderedCandles.length,
      candles: orderedCandles
    });
  } catch (error) {
    logger.error(`Error in getCandles: ${error.message}`);
    next(error);
  }
}
