import { evaluateStrategyA, evaluateStrategyB, evaluateStrategyC, evaluateStrategyD } from './strategyService.js';
import { validateSignal } from './validatorService.js';
import logger from '../utils/logger.js';

/**
 * Helper to resolve timestamp from candles (supports .timestamp and .date formats)
 */
function getTimestamp(candle) {
  if (!candle) return null;
  if (candle.timestamp) return candle.timestamp;
  if (candle.date) {
    return candle.date instanceof Date ? candle.date.toISOString() : new Date(candle.date).toISOString();
  }
  return null;
}

/**
 * Runs a backtest simulation on historical candles for a specific strategy
 * @param {string} strategyName - 'Strategy A' or 'Strategy B'
 * @param {Array<Object>} candles - enriched candles
 * @param {number} startingBalance - initial account balance (default $100,000)
 * @param {number} riskPercentage - risk per trade as % of starting balance (default 1% = 0.01)
 * @returns {Object} - Compiled backtest results
 */
export function runBacktest(strategyName, candles, startingBalance = 100000, riskPercentage = 0.01) {
  if (!candles || candles.length < 30) {
    return {
      totalTrades: 0,
      winRate: 0,
      lossRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      averageRR: 0,
      trades: [],
      balanceHistory: [],
    };
  }

  const trades = [];
  let currentBalance = startingBalance;
  let peakBalance = startingBalance;
  let maxDrawdown = 0;
  
  const balanceHistory = [{ time: getTimestamp(candles[0]), balance: startingBalance }];
  const riskAmount = startingBalance * riskPercentage; // e.g. $1,000 per trade

  let i = 20; // Start after indicator warmup
  while (i < candles.length) {
    const candle = candles[i];
    
    // 1. Evaluate strategy at current index
    let rawSignal = null;
    if (strategyName === 'Strategy A' || strategyName.includes('Breakout')) {
      rawSignal = evaluateStrategyA(candles, i);
    } else if (strategyName === 'Strategy B' || strategyName.includes('Reversion')) {
      rawSignal = evaluateStrategyB(candles, i);
    } else if (strategyName === 'Strategy C' || strategyName.includes('Supertrend')) {
      rawSignal = evaluateStrategyC(candles, i);
    } else if (strategyName === 'Strategy D' || strategyName.includes('CPR')) {
      rawSignal = evaluateStrategyD(candles, i);
    }

    // 2. Validate signal
    const validatedSignal = rawSignal ? validateSignal(candles, rawSignal) : null;

    if (validatedSignal && validatedSignal.direction !== 'NO TRADE') {
      const { direction, entry, stopLoss, takeProfit, riskReward } = validatedSignal;
      
      // Found a trade! Now track subsequent candles to find exit
      let outcome = null;
      let exitCandle = null;
      let exitPrice = 0;
      let j = i + 1;

      while (j < candles.length) {
        const nextCandle = candles[j];
        const high = parseFloat(nextCandle.high);
        const low = parseFloat(nextCandle.low);

        if (direction === 'BUY') {
          // Check if SL is hit first
          if (low <= stopLoss) {
            outcome = 'LOSS';
            exitCandle = nextCandle;
            exitPrice = stopLoss;
            break;
          }
          // Check if TP is hit
          if (high >= takeProfit) {
            outcome = 'WIN';
            exitCandle = nextCandle;
            exitPrice = takeProfit;
            break;
          }
        } else if (direction === 'SELL') {
          // Check if SL is hit first
          if (high >= stopLoss) {
            outcome = 'LOSS';
            exitCandle = nextCandle;
            exitPrice = stopLoss;
            break;
          }
          // Check if TP is hit
          if (low <= takeProfit) {
            outcome = 'WIN';
            exitCandle = nextCandle;
            exitPrice = takeProfit;
            break;
          }
        }
        j++;
      }

      // If trade did not exit by end of history, close at market close price
      if (!outcome) {
        exitCandle = candles[candles.length - 1];
        exitPrice = parseFloat(exitCandle.close);
        if (direction === 'BUY') {
          outcome = exitPrice > entry ? 'WIN' : 'LOSS';
        } else {
          outcome = exitPrice < entry ? 'WIN' : 'LOSS';
        }
      }

      // Compute P&L
      let profitLoss = 0;
      if (outcome === 'WIN') {
        profitLoss = riskAmount * riskReward;
      } else {
        // Assume trade was closed exactly at SL
        profitLoss = -riskAmount;
      }

      currentBalance += profitLoss;
      
      // Update Peak Balance & Max Drawdown
      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      }
      const drawdown = ((peakBalance - currentBalance) / peakBalance) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      balanceHistory.push({
        time: getTimestamp(exitCandle),
        balance: currentBalance,
      });

      trades.push({
        direction,
        entryPrice: entry,
        stopLoss,
        takeProfit,
        exitPrice,
        outcome,
        profitLoss,
        riskReward,
        entryTime: getTimestamp(candle),
        exitTime: getTimestamp(exitCandle),
      });

      // Skip forward to the exit candle index to simulate holding a single position
      i = j;
    }
    
    i++;
  }

  // Calculate final statistics
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = totalTrades - wins;
  
  const winRate = totalTrades > 0 ? parseFloat(((wins / totalTrades) * 100).toFixed(2)) : 0;
  const lossRate = totalTrades > 0 ? parseFloat(((losses / totalTrades) * 100).toFixed(2)) : 0;

  const grossProfit = trades.reduce((sum, t) => t.profitLoss > 0 ? sum + t.profitLoss : sum, 0);
  const grossLoss = trades.reduce((sum, t) => t.profitLoss < 0 ? sum + Math.abs(t.profitLoss) : sum, 0);
  
  const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : parseFloat(grossProfit.toFixed(2));
  
  const averageRR = totalTrades > 0 ? parseFloat((trades.reduce((sum, t) => sum + t.riskReward, 0) / totalTrades).toFixed(2)) : 0;

  logger.info(`[BACKTEST COMPLETE] Strategy=${strategyName}, Trades=${totalTrades}, WinRate=${winRate}%, ProfitFactor=${profitFactor}, MaxDrawdown=${maxDrawdown.toFixed(2)}%`);

  return {
    totalTrades,
    winRate,
    lossRate,
    profitFactor,
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    averageRR,
    trades,
    balanceHistory,
  };
}
