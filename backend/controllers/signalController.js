import { fetchCandlesFromProvider, saveCandlesToDb } from '../services/ingestionService.js';
import { enrichWithIndicators } from '../services/indicatorService.js';
import { enrichWithPatterns } from '../services/patternService.js';
import { evaluateStrategyA, evaluateStrategyB, evaluateStrategyC, evaluateStrategyD } from '../services/strategyService.js';
import { validateSignal } from '../services/validatorService.js';
import { enrichSignalWithAI } from '../services/aiService.js';
import { sendWhatsAppSignal } from '../services/whatsappService.js';
import supabase from '../config/db.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

function resolveTickerSymbol(ticker) {
  if (!ticker) return 'GC=F';
  const clean = ticker.toUpperCase();
  if (clean === 'NIFTY' || clean === 'NIFTY50' || clean === '^NSEI') {
    return '^NSEI';
  }
  return 'GC=F';
}

export async function getSignalHistory(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const ticker = req.query.ticker || 'GOLD';
    const tickerSymbol = resolveTickerSymbol(ticker);

    const isDefaultDb = config.supabase.url.includes('your-project-id');
    if (isDefaultDb) {
      return res.status(200).json({
        source: 'mock-fallback',
        count: 0,
        signals: []
      });
    }

    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', tickerSymbol)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback if column 'symbol' doesn't exist yet on database table schema
      if (error.code === 'PGRST204' || error.message.includes('symbol')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('signals')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);
        if (fallbackError) throw fallbackError;
        return res.status(200).json({
          source: 'database-fallback-no-symbol',
          count: fallbackData.length,
          signals: fallbackData
        });
      }
      throw error;
    }

    return res.status(200).json({
      source: 'database',
      count: data.length,
      signals: data
    });
  } catch (error) {
    logger.error(`Error in getSignalHistory: ${error.message}`);
    next(error);
  }
}

export async function checkLiveSignals(req, res, next) {
  try {
    const timeframe = req.body.timeframe || '1h';
    const ticker = req.body.ticker || 'GOLD';
    const tickerSymbol = resolveTickerSymbol(ticker);

    logger.info(`[API] Triggering live trading signals check for ${ticker.toUpperCase()} on timeframe: ${timeframe}...`);

    // 1. Fetch latest candles from provider
    const quotes = await fetchCandlesFromProvider(timeframe, 4, tickerSymbol);
    if (!quotes || quotes.length < 25) {
      return res.status(200).json({
        status: 'NO TRADE',
        reason: 'Insufficient historical candles returned from provider to warm up technical indicators.'
      });
    }

    // Archive candles in database (fails silently if db not configured)
    try {
      const isDefaultDb = config.supabase.url.includes('your-project-id');
      if (!isDefaultDb) {
        await saveCandlesToDb(timeframe, quotes.slice(-5));
      }
    } catch (err) {
      logger.warn(`Silent database candles save skipped: ${err.message}`);
    }

    // 2. Compute Technical Indicators
    const enriched = enrichWithIndicators(quotes);

    // 3. Compute Candlestick Patterns
    const fullyEnriched = enrichWithPatterns(enriched);

    const lastCompletedIndex = fullyEnriched.length - 2;
    if (lastCompletedIndex < 20) {
      return res.status(200).json({
        status: 'NO TRADE',
        reason: 'Warmup index calculation constraints breached.'
      });
    }

    // 4. Run Strategy Checkers
    let rawSignal = evaluateStrategyA(fullyEnriched, lastCompletedIndex);
    if (!rawSignal) {
      rawSignal = evaluateStrategyB(fullyEnriched, lastCompletedIndex);
    }
    if (!rawSignal) {
      rawSignal = evaluateStrategyC(fullyEnriched, lastCompletedIndex);
    }
    if (!rawSignal) {
      rawSignal = evaluateStrategyD(fullyEnriched, lastCompletedIndex);
    }

    // 5. Run Validation
    const validatedSignal = validateSignal(fullyEnriched, rawSignal);

    if (validatedSignal && validatedSignal.direction !== 'NO TRADE') {
      // 6. Enrich with local AI commentary (Ollama Llama 3.1)
      const enrichedSignal = await enrichSignalWithAI(validatedSignal);
      enrichedSignal.symbol = ticker.toUpperCase();

      // 7. Dispatch WhatsApp Alert
      await sendWhatsAppSignal(enrichedSignal);

      // 8. Archive Signal in database (if DB configured)
      const isDefaultDb = config.supabase.url.includes('your-project-id');
      if (!isDefaultDb) {
        try {
          const { error } = await supabase
            .from('signals')
            .insert([{
              timestamp: enrichedSignal.timestamp,
              symbol: tickerSymbol,
              direction: enrichedSignal.direction,
              entry_price: enrichedSignal.entry,
              stop_loss: enrichedSignal.stopLoss,
              take_profit: enrichedSignal.takeProfit,
              risk_reward: enrichedSignal.riskReward,
              confidence: enrichedSignal.confidence,
              strategy_used: enrichedSignal.strategyUsed,
              detected_pattern: enrichedSignal.pattern,
              indicators_state: enrichedSignal.indicators,
              ai_analysis: enrichedSignal.ai_analysis,
              is_sent_whatsapp: true,
            }]);
          if (error) throw error;
          logger.info('[API] Successfully archived validated signal into database.');
        } catch (dbError) {
          logger.error(`Database archiving of signal failed: ${dbError.message}`);
        }
      }

      return res.status(200).json({
        status: 'SIGNAL_TRIGGERED',
        signal: enrichedSignal
      });
    }

    // No trade triggered
    return res.status(200).json({
      status: 'NO TRADE',
      reason: validatedSignal?.reason || 'No strategy entry conditions met on the last completed candle.',
      indicators: fullyEnriched[lastCompletedIndex].indicators,
      pattern: fullyEnriched[lastCompletedIndex].pattern ? fullyEnriched[lastCompletedIndex].pattern.name : 'NONE'
    });
  } catch (error) {
    logger.error(`Error in checkLiveSignals: ${error.message}`);
    next(error);
  }
}
