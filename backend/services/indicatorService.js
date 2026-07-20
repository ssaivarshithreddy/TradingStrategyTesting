import logger from '../utils/logger.js';

/**
 * Calculates Simple Moving Average (SMA)
 * @param {Array<number>} values 
 * @param {number} period 
 * @returns {Array<number|null>}
 */
export function calculateSMA(values, period) {
  const sma = new Array(values.length).fill(null);
  if (values.length < period) return sma;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  sma[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    sum = sum - values[i - period] + values[i];
    sma[i] = sum / period;
  }
  return sma;
}

/**
 * Calculates Exponential Moving Average (EMA)
 * @param {Array<number>} values 
 * @param {number} period 
 * @returns {Array<number|null>}
 */
export function calculateEMA(values, period) {
  const ema = new Array(values.length).fill(null);
  if (values.length < period) return ema;

  // Initialize first EMA with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let currentEma = sum / period;
  ema[period - 1] = currentEma;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    currentEma = (values[i] - currentEma) * multiplier + currentEma;
    ema[i] = currentEma;
  }
  return ema;
}

/**
 * Calculates Bollinger Bands (Middle, Upper, Lower, Width)
 * @param {Array<number>} values 
 * @param {number} period 
 * @param {number} stdDevMultiplier 
 * @returns {Object}
 */
export function calculateBollingerBands(values, period = 20, stdDevMultiplier = 2) {
  const middle = calculateSMA(values, period);
  const upper = new Array(values.length).fill(null);
  const lower = new Array(values.length).fill(null);
  const width = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = middle[i];
    
    // Calculate Standard Deviation
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
    width[i] = mean !== 0 ? (upper[i] - lower[i]) / mean : 0;
  }

  return { middle, upper, lower, width };
}

/**
 * Calculates Average True Range (ATR)
 * Uses Wilder's smoothing technique
 * @param {Array<Object>} candles - { high, low, close }
 * @param {number} period 
 * @returns {Array<number|null>}
 */
export function calculateATR(candles, period = 14) {
  const atr = new Array(candles.length).fill(null);
  if (candles.length <= period) return atr;

  const tr = new Array(candles.length).fill(null);
  tr[0] = candles[0].high - candles[0].low;

  // Compute TR for all candles
  for (let i = 1; i < candles.length; i++) {
    const hL = candles[i].high - candles[i].low;
    const hCp = Math.abs(candles[i].high - candles[i - 1].close);
    const lCp = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hL, hCp, lCp);
  }

  // First ATR is SMA of True Ranges
  let sumTr = 0;
  for (let i = 1; i <= period; i++) {
    sumTr += tr[i];
  }
  let currentAtr = sumTr / period;
  atr[period] = currentAtr;

  // Subsequent ATR values use Wilder's Smoothing Formula
  for (let i = period + 1; i < candles.length; i++) {
    currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
    atr[i] = currentAtr;
  }

  return atr;
}

/**
 * Identifies Swing Highs and Swing Lows
 * @param {Array<Object>} candles 
 * @param {number} strength - lookback and lookforward count (N)
 * @returns {Object} { swingHighs, swingLows }
 */
export function calculateSwings(candles, strength = 3) {
  const swingHighs = new Array(candles.length).fill(null);
  const swingLows = new Array(candles.length).fill(null);

  for (let i = strength; i < candles.length - strength; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= strength; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high > currentHigh) {
        isHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low < currentLow) {
        isLow = false;
      }
    }

    if (isHigh) swingHighs[i] = currentHigh;
    if (isLow) swingLows[i] = currentLow;
  }

  return { swingHighs, swingLows };
}

/**
 * Enriches candle objects with calculated indicators
 * @param {Array<Object>} candles 
 * @returns {Array<Object>}
 */
export function enrichWithIndicators(candles) {
  if (!candles || candles.length === 0) return [];
  
  // Ensure sorted by timestamp ascending
  const sorted = [...candles].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const closes = sorted.map(c => parseFloat(c.close));
  const highs = sorted.map(c => parseFloat(c.high));
  const lows = sorted.map(c => parseFloat(c.low));

  // 1. Calculate EMA 9
  const ema9 = calculateEMA(closes, 9);

  // 2. Calculate Bollinger Bands (20, 2)
  const bb = calculateBollingerBands(closes, 20, 2);

  // 3. Calculate ATR (14)
  const atr = calculateATR(sorted, 14);

  // 4. Calculate Swings
  const swings = calculateSwings(sorted, 3);

  // 5. Calculate Supertrend (7, 3)
  const supertrend = calculateSupertrend(sorted, 7, 3);

  // 6. Populate values onto each candle
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].indicators = {
      ema9: ema9[i],
      bbMiddle: bb.middle[i],
      bbUpper: bb.upper[i],
      bbLower: bb.lower[i],
      bbWidth: bb.width[i],
      atr: atr[i],
      swingHigh: swings.swingHighs[i],
      swingLow: swings.swingLows[i],
      supertrend: supertrend[i],
      pivotPoints: null,
      trend: null,
      support: null,
      resistance: null,
    };

    // Calculate daily pivots and Central Pivot Range (CPR)
    const ohlc = getPreviousDayOHLC(sorted, i);
    if (ohlc) {
      const P = (ohlc.high + ohlc.low + ohlc.close) / 3;
      const r1 = (P * 2) - ohlc.low;
      const s1 = (P * 2) - ohlc.high;
      const TC = (ohlc.high + ohlc.low) / 2;
      const BC = (P * 2) - TC;
      const cprTop = Math.max(TC, BC);
      const cprBot = Math.min(TC, BC);
      const cprWidth = cprTop - cprBot;

      sorted[i].indicators.pivotPoints = {
        pivot: P,
        r1,
        s1,
        cprTop,
        cprBot,
        cprWidth,
        historicalAverageCprWidth: 0
      };
    } else {
      // Default fallback to close price
      const close = parseFloat(sorted[i].close);
      sorted[i].indicators.pivotPoints = {
        pivot: close,
        r1: close,
        s1: close,
        cprTop: close,
        cprBot: close,
        cprWidth: 0,
        historicalAverageCprWidth: 0
      };
    }

    // Calculate historical average CPR width over the last 14 candles
    let cprWidthSum = 0;
    let cprWidthCount = 0;
    const period = 14;
    for (let j = Math.max(0, i - period + 1); j <= i; j++) {
      if (sorted[j].indicators && sorted[j].indicators.pivotPoints) {
        cprWidthSum += sorted[j].indicators.pivotPoints.cprWidth;
        cprWidthCount++;
      }
    }
    sorted[i].indicators.pivotPoints.historicalAverageCprWidth = cprWidthCount > 0 ? cprWidthSum / cprWidthCount : 0;

    // Calculate Trend Direction (based on Close position to SMA 20/EMA 9)
    if (bb.middle[i] && ema9[i]) {
      const emaOverSma = ema9[i] > bb.middle[i];
      const closeOverSma = closes[i] > bb.middle[i];
      if (emaOverSma && closeOverSma) {
        sorted[i].indicators.trend = 'UP';
      } else if (!emaOverSma && !closeOverSma) {
        sorted[i].indicators.trend = 'DOWN';
      } else {
        sorted[i].indicators.trend = 'RANGE';
      }
    } else {
      sorted[i].indicators.trend = 'UNKNOWN';
    }

    // Dynamic Support and Resistance lookup (nearest historical swings up to current index i)
    if (i > 10) {
      let lastSupport = null;
      let lastResistance = null;

      // Scan backwards from index i to find the most recent swing points
      for (let j = i - 1; j >= 0; j--) {
        if (swings.swingLows[j] !== null && lastSupport === null) {
          lastSupport = swings.swingLows[j];
        }
        if (swings.swingHighs[j] !== null && lastResistance === null) {
          lastResistance = swings.swingHighs[j];
        }
        if (lastSupport !== null && lastResistance !== null) break;
      }

      sorted[i].indicators.support = lastSupport;
      sorted[i].indicators.resistance = lastResistance;
    }
  }

  return sorted;
}

/**
 * Helper to calculate Supertrend (7, 3) over candles list
 */
function calculateSupertrend(candles, period = 7, multiplier = 3) {
  const result = [];
  if (candles.length < period) return new Array(candles.length).fill(null);

  const trs = [];
  for (let i = 0; i < candles.length; i++) {
    const high = parseFloat(candles[i].high);
    const low = parseFloat(candles[i].low);
    
    if (i === 0) {
      trs.push(high - low);
    } else {
      const prevClose = parseFloat(candles[i - 1].close);
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
  }

  // Calculate ATR
  const atrs = new Array(candles.length).fill(0);
  let firstTrSum = 0;
  for (let i = 0; i < period; i++) {
    firstTrSum += trs[i];
  }
  atrs[period - 1] = firstTrSum / period;

  for (let i = period; i < candles.length; i++) {
    atrs[i] = (atrs[i - 1] * (period - 1) + trs[i]) / period;
  }

  const basicUpper = [];
  const basicLower = [];
  const finalUpper = new Array(candles.length).fill(0);
  const finalLower = new Array(candles.length).fill(0);
  const supertrend = new Array(candles.length).fill(0);
  const direction = new Array(candles.length).fill('');

  for (let i = 0; i < candles.length; i++) {
    const high = parseFloat(candles[i].high);
    const low = parseFloat(candles[i].low);
    const close = parseFloat(candles[i].close);
    
    const hl2 = (high + low) / 2;
    const atr = atrs[i];

    basicUpper.push(hl2 + multiplier * atr);
    basicLower.push(hl2 - multiplier * atr);

    if (i < period - 1) {
      continue;
    }

    if (i === period - 1) {
      finalUpper[i] = basicUpper[i];
      finalLower[i] = basicLower[i];
      supertrend[i] = close >= finalLower[i] ? finalLower[i] : finalUpper[i];
      direction[i] = close >= finalLower[i] ? 'UP' : 'DOWN';
      result.push({ value: supertrend[i], direction: direction[i] });
      continue;
    }

    const prevClose = parseFloat(candles[i - 1].close);

    // Final Upper Band
    if (basicUpper[i] < finalUpper[i - 1] || prevClose > finalUpper[i - 1]) {
      finalUpper[i] = basicUpper[i];
    } else {
      finalUpper[i] = finalUpper[i - 1];
    }

    // Final Lower Band
    if (basicLower[i] > finalLower[i - 1] || prevClose < finalLower[i - 1]) {
      finalLower[i] = basicLower[i];
    } else {
      finalLower[i] = finalLower[i - 1];
    }

    // Supertrend logic
    if (supertrend[i - 1] === finalUpper[i - 1]) {
      supertrend[i] = close <= finalUpper[i] ? finalUpper[i] : finalLower[i];
      direction[i] = close <= finalUpper[i] ? 'DOWN' : 'UP';
    } else {
      supertrend[i] = close >= finalLower[i] ? finalLower[i] : finalUpper[i];
      direction[i] = close >= finalLower[i] ? 'UP' : 'DOWN';
    }

    result.push({ value: supertrend[i], direction: direction[i] });
  }

  const paddedResult = new Array(period - 1).fill(null).concat(result);
  return paddedResult;
}

/**
 * Helper to compute previous day's OHLC
 */
function getPreviousDayOHLC(candles, currentIndex) {
  const currentCandle = candles[currentIndex];
  const currentTimestamp = currentCandle.timestamp || currentCandle.date;
  if (!currentTimestamp) return null;
  
  const currentDateStr = new Date(currentTimestamp).toISOString().split('T')[0];

  let prevHigh = -Infinity;
  let prevLow = Infinity;
  let prevClose = null;
  
  let foundPrevDay = false;
  let prevDateStr = null;
  
  for (let j = currentIndex - 1; j >= 0; j--) {
    const c = candles[j];
    const timestamp = c.timestamp || c.date;
    if (!timestamp) continue;
    
    const dateStr = new Date(timestamp).toISOString().split('T')[0];
    
    if (dateStr !== currentDateStr) {
      if (!foundPrevDay) {
        foundPrevDay = true;
        prevDateStr = dateStr;
        prevClose = parseFloat(c.close);
      }
      
      if (dateStr === prevDateStr) {
        prevHigh = Math.max(prevHigh, parseFloat(c.high));
        prevLow = Math.min(prevLow, parseFloat(c.low));
      } else {
        break;
      }
    }
  }
  
  if (prevHigh === -Infinity || prevLow === Infinity || prevClose === null) {
    if (currentIndex > 0) {
      const prevCandle = candles[currentIndex - 1];
      return {
        high: parseFloat(prevCandle.high),
        low: parseFloat(prevCandle.low),
        close: parseFloat(prevCandle.close),
      };
    }
    return null;
  }
  
  return { high: prevHigh, low: prevLow, close: prevClose };
}
