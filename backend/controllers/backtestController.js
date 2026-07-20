import { fetchCandlesFromProvider } from '../services/ingestionService.js';
import { enrichWithIndicators } from '../services/indicatorService.js';
import { enrichWithPatterns } from '../services/patternService.js';
import { runBacktest } from '../services/backtestService.js';
import logger from '../utils/logger.js';

function resolveTickerSymbol(ticker) {
  if (!ticker) return 'GC=F';
  const clean = ticker.toUpperCase();
  if (clean === 'NIFTY' || clean === 'NIFTY50' || clean === '^NSEI') {
    return '^NSEI';
  }
  return 'GC=F';
}

export async function runBacktestSimulation(req, res, next) {
  try {
    const strategy = req.body.strategy || 'Strategy A';
    const timeframe = req.body.timeframe || '1h';
    const days = parseInt(req.body.days, 10) || 30;
    const ticker = req.body.ticker || 'GOLD';
    const tickerSymbol = resolveTickerSymbol(ticker);

    logger.info(`[API] Running backtest simulation request: Strategy=${strategy}, Timeframe=${timeframe}, Days=${days}, Ticker=${ticker.toUpperCase()}...`);

    // 1. Fetch historical candles from provider
    const daysToFetch = (timeframe === '5m' || timeframe === '30m') ? Math.min(days, 30) : days;
    const quotes = await fetchCandlesFromProvider(timeframe, daysToFetch, tickerSymbol);
    
    if (!quotes || quotes.length < 30) {
      return res.status(400).json({
        error: `Insufficient historical data to perform a backtest on ${timeframe} for ${ticker.toUpperCase()}. Retrieved ${quotes?.length || 0} quotes (minimum 30 required).`
      });
    }

    // 2. Calculate Indicators
    const enriched = enrichWithIndicators(quotes);

    // 3. Scan Candlestick Patterns
    const fullyEnriched = enrichWithPatterns(enriched);

    // 4. Run Backtester
    const results = runBacktest(strategy, fullyEnriched, 100000, 0.01);

    return res.status(200).json({
      message: 'Backtest simulation completed successfully.',
      strategy,
      timeframe,
      days,
      ticker: ticker.toUpperCase(),
      metrics: {
        totalTrades: results.totalTrades,
        winRate: results.winRate,
        lossRate: results.lossRate,
        profitFactor: results.profitFactor,
        maxDrawdownPercent: results.maxDrawdown,
        averageRiskReward: results.averageRR,
      },
      trades: results.trades,
      balanceHistory: results.balanceHistory,
    });
  } catch (error) {
    logger.error(`Error in runBacktestSimulation: ${error.message}`);
    next(error);
  }
}
