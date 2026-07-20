import logger from '../utils/logger.js';

/**
 * Validates a strategy signal against trend, indicator, pattern, and risk-reward constraints
 * @param {Array<Object>} candles - entire enriched candle array
 * @param {Object} rawSignal - strategy signal output { strategy, direction, entry, triggerIndex }
 * @returns {Object} - Complete formatted signal (BUY, SELL, or NO TRADE)
 */
export function validateSignal(candles, rawSignal) {
  const noTradeSignal = (reason) => ({
    direction: 'NO TRADE',
    entry: null,
    stopLoss: null,
    takeProfit: null,
    riskReward: null,
    confidence: 0,
    strategyUsed: rawSignal?.strategy || 'UNKNOWN',
    pattern: rawSignal?.pattern || 'NONE',
    indicators: null,
    reason: reason,
  });

  if (!rawSignal) {
    return noTradeSignal('No strategy signal generated.');
  }

  const { strategy, direction, entry, triggerIndex } = rawSignal;
  const candle = candles[triggerIndex];
  
  if (!candle || !candle.indicators) {
    return noTradeSignal('Trigger candle or technical indicator state is missing.');
  }

  const ind = candle.indicators;

  // 1. Indicator Validation (check for valid computations)
  if (
    ind.ema9 === null || 
    ind.bbUpper === null || 
    ind.bbLower === null || 
    ind.bbWidth === null || 
    ind.atr === null
  ) {
    return noTradeSignal('Technical indicators are in an incomplete state (loading/warmup period).');
  }

  // 2. Trend Validation (Only for Bollinger-based strategies)
  if (!strategy.includes('Supertrend') && !strategy.includes('CPR')) {
    if (direction === 'BUY' && candle.close < ind.bbMiddle) {
      return noTradeSignal('Trend validation failed: BUY trigger is below Bollinger middle band.');
    }
    if (direction === 'SELL' && candle.close > ind.bbMiddle) {
      return noTradeSignal('Trend validation failed: SELL trigger is above Bollinger middle band.');
    }
  }

  // 3. Pattern Validation
  // For Strategy B (Mean Reversion), a validated reversal pattern must exist.
  if (strategy.includes('Mean Reversion')) {
    if (!candle.pattern) {
      return noTradeSignal('Pattern validation failed: Strategy B requires a valid candlestick reversal pattern.');
    }
    if (candle.pattern.confidence < 75) {
      return noTradeSignal(`Pattern validation failed: Reversal pattern confidence is too low (${candle.pattern.confidence}%).`);
    }
  }

  // 4. Risk Reward Validation (Calculate Entry, SL, TP, and R:R)
  const atrVal = parseFloat(ind.atr);
  let stopLoss = 0;
  let takeProfit = 0;

  if (direction === 'BUY') {
    if (rawSignal.stopLoss) {
      stopLoss = parseFloat(rawSignal.stopLoss);
    } else if (strategy.includes('Supertrend') && ind.supertrend) {
      stopLoss = parseFloat(ind.supertrend.value);
    } else {
      // Stop Loss: 1.5 * ATR below current price, or below the nearest swing low (whichever is tighter but safe)
      const slAtr = entry - 1.5 * atrVal;
      const slSwing = ind.swingLow ? parseFloat(ind.swingLow) - 0.5 : slAtr;
      stopLoss = Math.min(slAtr, slSwing);
    }
    
    // Ensure Stop Loss is not too close (minimum 0.5 * ATR)
    if (entry - stopLoss < 0.5 * atrVal) {
      stopLoss = entry - 0.5 * atrVal;
    }

    // Take Profit: set strictly to meet 1:2 risk-reward
    const risk = entry - stopLoss;
    takeProfit = entry + 2.0 * risk;
  } else if (direction === 'SELL') {
    if (rawSignal.stopLoss) {
      stopLoss = parseFloat(rawSignal.stopLoss);
    } else if (strategy.includes('Supertrend') && ind.supertrend) {
      stopLoss = parseFloat(ind.supertrend.value);
    } else {
      // Stop Loss: 1.5 * ATR above current price, or above the nearest swing high
      const slAtr = entry + 1.5 * atrVal;
      const slSwing = ind.swingHigh ? parseFloat(ind.swingHigh) + 0.5 : slAtr;
      stopLoss = Math.max(slAtr, slSwing);
    }

    // Ensure Stop Loss is not too close (minimum 0.5 * ATR)
    if (stopLoss - entry < 0.5 * atrVal) {
      stopLoss = entry + 0.5 * atrVal;
    }

    // Take Profit: set strictly to meet 1:2 risk-reward
    const risk = stopLoss - entry;
    takeProfit = entry - 2.0 * risk;
  }

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  const riskRewardRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;

  if (riskRewardRatio < 2.0) {
    return noTradeSignal(`Risk-Reward validation failed: R:R ratio is ${riskRewardRatio} (minimum 2.0 required).`);
  }

  // 5. Confidence Score Calculation (combine strategy type, pattern, and ATR volatility)
  let confidenceScore = 50; // base confidence
  
  if (strategy.includes('Volatility Breakout')) {
    confidenceScore += 20; // Strategy A has high baseline reliability
    if (candle.pattern) confidenceScore += 10; // Extra confirmation pattern
    if (ind.bbWidth > 0.05) confidenceScore += 10; // High volatility breakouts
  } else if (strategy.includes('Mean Reversion')) {
    confidenceScore += 15;
    if (candle.pattern) {
      // Add pattern confidence modifier
      confidenceScore += (candle.pattern.confidence - 70); 
    }
  } else if (strategy.includes('Supertrend')) {
    confidenceScore += 20; // Supertrend + Pivot breakout has strong trend momentum
    if (ind.trend === 'UP' && direction === 'BUY') confidenceScore += 10;
    if (ind.trend === 'DOWN' && direction === 'SELL') confidenceScore += 10;
  } else if (strategy.includes('CPR')) {
    confidenceScore += 20; // CPR setups are high reliability setups
    if (rawSignal.pattern === 'Narrow CPR Breakout') confidenceScore += 10;
  }

  // Cap confidence at 98% (never 100% since no trade is guaranteed)
  const confidence = Math.min(confidenceScore, 98);

  const indicatorsState = {
    ema9: parseFloat(ind.ema9.toFixed(4)),
    bbMiddle: parseFloat(ind.bbMiddle.toFixed(4)),
    bbUpper: parseFloat(ind.bbUpper.toFixed(4)),
    bbLower: parseFloat(ind.bbLower.toFixed(4)),
    bbWidth: parseFloat(ind.bbWidth.toFixed(4)),
    atr: parseFloat(ind.atr.toFixed(4)),
    trend: ind.trend,
    support: ind.support ? parseFloat(ind.support.toFixed(4)) : null,
    resistance: ind.resistance ? parseFloat(ind.resistance.toFixed(4)) : null,
  };

  const reason = `Valid ${direction} signal triggered via ${strategy} at price ${entry}. SL: ${stopLoss.toFixed(2)}, TP: ${takeProfit.toFixed(2)}. Minimum 1:2 R:R met.`;

  logger.info(`[VALIDATOR] Signal passed all validations: ${direction} at ${entry} (R:R: ${riskRewardRatio}, Confidence: ${confidence}%)`);

  return {
    direction,
    entry: parseFloat(entry.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    takeProfit: parseFloat(takeProfit.toFixed(2)),
    riskReward: riskRewardRatio,
    confidence,
    strategyUsed: strategy,
    pattern: candle.pattern ? candle.pattern.name : 'NONE',
    indicators: indicatorsState,
    reason,
    timestamp: candle.timestamp,
  };
}
