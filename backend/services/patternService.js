import logger from '../utils/logger.js';

/**
 * Detects candlestick patterns at a specific index in a candle series
 * @param {Array<Object>} candles - enriched candles
 * @param {number} index - target candle index to evaluate
 * @returns {Object|null} - Pattern object or null if no pattern detected
 */
export function detectPatternAtIndex(candles, index) {
  if (index < 1 || index >= candles.length) return null;

  const current = candles[index];
  const prev = candles[index - 1];

  const o = parseFloat(current.open);
  const h = parseFloat(current.high);
  const l = parseFloat(current.low);
  const c = parseFloat(current.close);
  const range = h - l;
  const body = Math.abs(c - o);

  const prevO = parseFloat(prev.open);
  const prevC = parseFloat(prev.close);
  const prevBody = Math.abs(prevC - prevO);

  if (range <= 0) return null;

  const upperWick = h - Math.max(o, c);
  const lowerWick = Math.min(o, c) - l;

  const timestamp = current.timestamp;

  // 1. DOJI
  // Open and Close are virtually identical
  if (body <= range * 0.1) {
    // Check if it's not a Pin Bar (which has long wicks on one side)
    const isPin = lowerWick >= range * 0.6 || upperWick >= range * 0.6;
    if (!isPin) {
      return {
        name: 'Doji',
        direction: 'NEUTRAL',
        strength: 'MEDIUM',
        confidence: 70,
        timestamp,
      };
    }
  }

  // 2. BULLISH PIN BAR / HAMMER
  // Lower wick is very long, body is in the upper part of the range
  if (lowerWick >= range * 0.6 && body <= range * 0.3 && upperWick <= range * 0.2) {
    const isBullishCandle = c > o;
    const strength = lowerWick >= range * 0.75 ? 'HIGH' : 'MEDIUM';
    const confidence = isBullishCandle ? 85 : 75;
    return {
      name: isBullishCandle ? 'Hammer' : 'Pin Bar',
      direction: 'BULLISH',
      strength,
      confidence,
      timestamp,
    };
  }

  // 3. BEARISH PIN BAR / SHOOTING STAR
  // Upper wick is very long, body is in the lower part of the range
  if (upperWick >= range * 0.6 && body <= range * 0.3 && lowerWick <= range * 0.2) {
    const isBearishCandle = c < o;
    const strength = upperWick >= range * 0.75 ? 'HIGH' : 'MEDIUM';
    const confidence = isBearishCandle ? 85 : 75;
    return {
      name: isBearishCandle ? 'Shooting Star' : 'Pin Bar',
      direction: 'BEARISH',
      strength,
      confidence,
      timestamp,
    };
  }

  // 4. BULLISH ENGULFING
  // Prev candle is bearish, current is bullish, current body engulfs prev body
  if (prevC < prevO && c > o) {
    if (o <= prevC && c >= prevO) {
      const volIncrease = current.volume && prev.volume ? current.volume > prev.volume : false;
      const strength = (c - o) > 2 * prevBody && volIncrease ? 'HIGH' : 'MEDIUM';
      return {
        name: 'Bullish Engulfing',
        direction: 'BULLISH',
        strength,
        confidence: 90,
        timestamp,
      };
    }
  }

  // 5. BEARISH ENGULFING
  // Prev candle is bullish, current is bearish, current body engulfs prev body
  if (prevC > prevO && c < o) {
    if (o >= prevC && c <= prevO) {
      const volIncrease = current.volume && prev.volume ? current.volume > prev.volume : false;
      const strength = (o - c) > 2 * prevBody && volIncrease ? 'HIGH' : 'MEDIUM';
      return {
        name: 'Bearish Engulfing',
        direction: 'BEARISH',
        strength,
        confidence: 90,
        timestamp,
      };
    }
  }

  return null;
}

/**
 * Scans the entire candles series and appends detected patterns to indicators.pattern
 * @param {Array<Object>} candles 
 * @returns {Array<Object>}
 */
export function enrichWithPatterns(candles) {
  if (!candles || candles.length === 0) return [];
  
  for (let i = 1; i < candles.length; i++) {
    candles[i].pattern = detectPatternAtIndex(candles, i);
  }
  
  // First candle has no previous, set pattern to null
  if (candles.length > 0) {
    candles[0].pattern = null;
  }
  
  return candles;
}
