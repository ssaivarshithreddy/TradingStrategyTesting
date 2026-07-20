import YahooFinanceClass from 'yahoo-finance2';
import logger from '../utils/logger.js';
import { enrichWithIndicators } from '../services/indicatorService.js';
import { enrichWithPatterns } from '../services/patternService.js';
import { runBacktest } from '../services/backtestService.js';

const yahooFinance = new YahooFinanceClass();
const NIFTY_TICKER = '^NSEI';

async function testBacktesterEngine() {
  logger.info('================================================');
  logger.info('STARTING BACKTESTER ENGINE VERIFICATION');
  logger.info('================================================');

  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Fetch 30 days history

  logger.info(`Fetching 30 days of 1-hour historical data for ${NIFTY_TICKER}...`);

  let quotes;
  try {
    const result = await yahooFinance.chart(NIFTY_TICKER, {
      period1: startDate,
      interval: '5m',
    });
    quotes = result.quotes.map(q => ({
      timestamp: q.date.toISOString(),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume || 0
    })).filter(q => q.open !== null && q.close !== null);
  } catch (error) {
    logger.error(`Failed to fetch Yahoo Finance historical data: ${error.message}`);
    process.exit(1);
  }

  logger.info(`Retrieved ${quotes.length} candles.`);

  // 1. Calculate technical indicator arrays
  const enriched = enrichWithIndicators(quotes);

  // 2. Scan candlestick reversal patterns
  const fullyEnriched = enrichWithPatterns(enriched);

  // 3. Run backtest simulation for Strategy B (Mean Reversion)
  // Starts with $100,000 capital, risking 1% ($1,000) per trade
  logger.info('Running backtest simulation for Strategy D (CPR Width Breakout)...');
  const results = runBacktest('Strategy D', fullyEnriched, 100000, 0.01);

  logger.info('\n================================================');
  logger.info('BACKTEST METRICS OUTPUT:');
  logger.info('================================================');
  logger.info(`- Total Trades Executed: ${results.totalTrades}`);
  logger.info(`- Win Rate: ${results.winRate}%`);
  logger.info(`- Loss Rate: ${results.lossRate}%`);
  logger.info(`- Profit Factor: ${results.profitFactor}`);
  logger.info(`- Max Drawdown: ${results.maxDrawdown}%`);
  logger.info(`- Avg Risk-to-Reward: ${results.averageRR}`);
  logger.info(`- Final Simulated Account Balance: $${results.balanceHistory[results.balanceHistory.length - 1]?.balance.toFixed(2) || '100,000.00'}`);
  logger.info('================================================');

  if (results.trades.length > 0) {
    logger.info('\nCOMPLETED TRADES LOG (First 5):');
    results.trades.slice(0, 5).forEach((t, idx) => {
      logger.info(`Trade #${idx+1}:`);
      logger.info(`  - Direction: ${t.direction}`);
      logger.info(`  - Entry Price: $${t.entryPrice.toFixed(2)} (${t.entryTime})`);
      logger.info(`  - Exit Price: $${t.exitPrice.toFixed(2)} (${t.exitTime})`);
      logger.info(`  - Outcome: ${t.outcome}`);
      logger.info(`  - P&L: $${t.profitLoss.toFixed(2)} (R:R: ${t.riskReward})`);
      logger.info('  ------------------------------------------');
    });
  } else {
    logger.info('No trades were triggered by Strategy B during this 30-day historical window.');
  }

  logger.info('\n================================================');
  logger.info('BACKTESTER VERIFICATION COMPLETE');
  logger.info('================================================');
}

testBacktesterEngine().catch(err => {
  logger.error(`Error executing backtest verification: ${err.stack}`);
});
