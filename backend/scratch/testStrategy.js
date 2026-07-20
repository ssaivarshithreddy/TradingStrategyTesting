import YahooFinanceClass from 'yahoo-finance2';
import logger from '../utils/logger.js';
import { enrichWithIndicators } from '../services/indicatorService.js';
import { enrichWithPatterns } from '../services/patternService.js';
import { evaluateStrategyA, evaluateStrategyB } from '../services/strategyService.js';
import { validateSignal } from '../services/validatorService.js';

const yahooFinance = new YahooFinanceClass();
const GOLD_TICKER = 'GC=F';

async function runStrategyTest() {
  logger.info('================================================');
  logger.info('STARTING TECHNICAL ENGINE & STRATEGY VERIFICATION');
  logger.info('================================================');

  // We need to fetch enough history for indicator warmup (20+ periods). 
  // Let's fetch the last 15 days of 1-hour candles (roughly 240+ quotes).
  const now = new Date();
  const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  logger.info(`Fetching ${GOLD_TICKER} 1h historical candles for testing...`);
  
  let quotes = [];
  try {
    const result = await yahooFinance.chart(GOLD_TICKER, {
      period1: startDate,
      interval: '1h',
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
    logger.error(`Failed to fetch Yahoo Finance test data: ${error.message}`);
  }

  if (quotes.length > 0) {
    logger.info(`Successfully retrieved ${quotes.length} candles.`);

    // 1. Enrich with technical indicators
    logger.info('Enriching candles with technical indicators...');
    const enrichedCandles = enrichWithIndicators(quotes);
    
    // Verify indicators on a sample candle (index 30)
    if (enrichedCandles.length > 30) {
      const sample = enrichedCandles[30];
      logger.info('[VERIFICATION] Sample Candle Technical Indicators (index 30):');
      logger.info(`- Timestamp: ${sample.timestamp}`);
      logger.info(`- Close: ${sample.close}`);
      logger.info(`- EMA 9: ${sample.indicators.ema9?.toFixed(2) || 'N/A'}`);
      logger.info(`- BB Upper: ${sample.indicators.bbUpper?.toFixed(2) || 'N/A'}`);
      logger.info(`- BB Middle: ${sample.indicators.bbMiddle?.toFixed(2) || 'N/A'}`);
      logger.info(`- BB Lower: ${sample.indicators.bbLower?.toFixed(2) || 'N/A'}`);
      logger.info(`- BB Width: ${sample.indicators.bbWidth?.toFixed(4) || 'N/A'}`);
      logger.info(`- ATR (14): ${sample.indicators.atr?.toFixed(2) || 'N/A'}`);
      logger.info(`- Trend: ${sample.indicators.trend}`);
      logger.info(`- Nearest Support: ${sample.indicators.support?.toFixed(2) || 'N/A'}`);
      logger.info(`- Nearest Resistance: ${sample.indicators.resistance?.toFixed(2) || 'N/A'}`);
    }

    // 2. Enrich with candlestick patterns
    logger.info('Scanning candles for candlestick patterns...');
    const fullyEnriched = enrichWithPatterns(enrichedCandles);

    const matchedPatterns = fullyEnriched.filter(c => c.pattern !== null);
    logger.info(`[VERIFICATION] Detected ${matchedPatterns.length} candlestick patterns out of ${fullyEnriched.length} candles:`);
    matchedPatterns.slice(0, 10).forEach((c, idx) => {
      logger.info(`  ${idx+1}. Candle ${c.timestamp} -> ${c.pattern.name} (${c.pattern.direction}, Strength: ${c.pattern.strength}, Conf: ${c.pattern.confidence}%)`);
    });

    // 3. Scan strategies and run validation
    logger.info('Evaluating Strategy A (Volatility Breakout) and Strategy B (Mean Reversion) on Live History...');
    let validatedSignals = [];
    for (let i = 20; i < fullyEnriched.length; i++) {
      const sigA = evaluateStrategyA(fullyEnriched, i);
      if (sigA) validatedSignals.push(validateSignal(fullyEnriched, sigA));

      const sigB = evaluateStrategyB(fullyEnriched, i);
      if (sigB) validatedSignals.push(validateSignal(fullyEnriched, sigB));
    }

    const trades = validatedSignals.filter(s => s.direction !== 'NO TRADE');
    logger.info(`[SUMMARY] Live Trades passed validation (BUY/SELL): ${trades.length}`);
  }

  // ================================================
  // SIMULATION TESTING (UNIT VERIFICATION FOR STRATEGIES)
  // ================================================
  logger.info('\n================================================');
  logger.info('STARTING SIMULATED TEST SETUP (UNIT TESTING)');
  logger.info('================================================');

  // Test 1: Simulate Strategy A (Volatility Breakout BUY)
  logger.info('[SIMULATION] Setting up Strategy A breakout conditions...');
  const simCandlesA = [];
  const baseTime = new Date();
  
  // 1. Generate 30 candles with high volatility at first (0-5), then low flat volatility (6-29) Squeeze
  for (let i = 0; i < 30; i++) {
    const ts = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
    // First 6 candles: High volatility (amplitude = 6)
    // Last 24 candles: Low flat volatility (amplitude = 1)
    const amplitude = i < 6 ? 6.0 : 1.0; 
    const price = 2000 + (i % 2 === 0 ? amplitude : -amplitude);
    simCandlesA.push({
      timestamp: ts.toISOString(),
      open: 2000,
      high: 2000 + amplitude + 1.0,
      low: 2000 - amplitude - 1.0,
      close: price,
      volume: 100,
    });
  }

  // 2. Add a breakout candle closing completely outside Bollinger bands
  const tsBreakout = new Date(baseTime.getTime() + 30 * 60 * 60 * 1000);
  simCandlesA.push({
    timestamp: tsBreakout.toISOString(),
    open: 2018, // open is above upper band
    high: 2035,
    low: 2010,
    close: 2030, // close is above upper band
    volume: 500, // volume/BB expansion trigger
  });

  // Calculate indicators for Strategy A simulation
  const enrichedA = enrichWithIndicators(simCandlesA);
  const fullyEnrichedA = enrichWithPatterns(enrichedA);
  
  // Evaluate breakout candle (index 30)
  const triggerA = evaluateStrategyA(fullyEnrichedA, 30);
  if (triggerA) {
    logger.info('[SUCCESS] Strategy A Volatility Breakout Triggered in Simulation!');
    const validatedA = validateSignal(fullyEnrichedA, triggerA);
    logger.info(`[VALIDATED] Strategy A result: ${JSON.stringify(validatedA, null, 2)}`);
  } else {
    logger.error('[FAILED] Strategy A Volatility Breakout failed to trigger in simulation.');
    const cand = fullyEnrichedA[30];
    const prevCand = fullyEnrichedA[29];
    logger.error(`  Debug A: bbUpper=${cand.indicators.bbUpper}, close=${cand.close}, open=${cand.open}, bbWidth=${cand.indicators.bbWidth}, prevBbWidth=${prevCand.indicators.bbWidth}`);
  }

  // Test 2: Simulate Strategy B (Mean Reversion BUY)
  logger.info('\n[SIMULATION] Setting up Strategy B reversion conditions...');
  const simCandlesB = [];
  
  // 1. Generate 20 candles in an uptrend (Close slowly increasing to keep bands narrow but establish UP trend)
  for (let i = 0; i < 20; i++) {
    const ts = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
    const price = 2000 + i * 1.5; // low slope uptrend
    simCandlesB.push({
      timestamp: ts.toISOString(),
      open: price - 0.5,
      high: price + 1.0,
      low: price - 1.0,
      close: price,
      volume: 200,
    });
  }

  // 2. Add a flush candle that spikes below the Lower Bollinger Band of ~2010 and forms a Hammer (reversal pattern)
  // Reversal candle: Open is 2012, High is 2018, Low is 1995 (extends below lower BB), Close is 2016.
  // This is a Hammer pattern: lower wick = 2012-1995 = 17. Body = 2016-2012 = 4. 
  // Lower wick (17) >= 2 * body (8). Upper wick (2018-2016 = 2) <= 0.2 * range (23).
  const tsFlush = new Date(baseTime.getTime() + 20 * 60 * 60 * 1000);
  simCandlesB.push({
    timestamp: tsFlush.toISOString(),
    open: 2012,
    high: 2018,
    low: 1995, // flush below lower BB
    close: 2016, // hammer reversal candle
    volume: 600,
  });

  const enrichedB = enrichWithIndicators(simCandlesB);
  const fullyEnrichedB = enrichWithPatterns(enrichedB);

  // Evaluate reversion candle (index 20)
  const triggerB = evaluateStrategyB(fullyEnrichedB, 20);
  if (triggerB) {
    logger.info('[SUCCESS] Strategy B Mean Reversion Triggered in Simulation!');
    const validatedB = validateSignal(fullyEnrichedB, triggerB);
    logger.info(`[VALIDATED] Strategy B result: ${JSON.stringify(validatedB, null, 2)}`);
  } else {
    logger.error('[FAILED] Strategy B Mean Reversion failed to trigger in simulation.');
    const cand = fullyEnrichedB[20];
    logger.error(`  Debug B: trend=${cand.indicators.trend}, low=${cand.low}, bbLower=${cand.indicators.bbLower}, pattern=${JSON.stringify(cand.pattern)}, ema9=${cand.indicators.ema9}, close=${cand.close}`);
  }

  logger.info('\n================================================');
  logger.info('TECHNICAL & STRATEGY ENGINE VERIFICATION COMPLETE');
  logger.info('================================================');
}

runStrategyTest().catch(err => {
  logger.error(`Error during verification script execution: ${err.stack}`);
});
