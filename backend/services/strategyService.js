import logger from '../utils/logger.js';

/**
 * Checks if Bollinger Bands are in a contracted/consolidated state
 * @param {Array<Object>} candles 
 * @param {number} index 
 * @returns {boolean}
 */
function isBBContracted(candles, index) {
  if (index < 25) return false;
  
  // Get BB widths for the past 20 candles up to index - 1
  const rawHistory = candles.slice(index - 21, index).map(c => c.indicators.bbWidth);
  const history = rawHistory.filter(w => w !== null);
  
  if (history.length === 0) return false;
  
  const currentWidth = candles[index - 1].indicators.bbWidth;
  if (currentWidth === null) return false;
  
  // Calculate average width of the lookback period
  const avgWidth = history.reduce((sum, w) => sum + w, 0) / history.length;
  
  // Contraction: current width is lower than historical average width
  const isContracted = currentWidth < avgWidth * 0.95;

  // Flatness: check if width variation over last 5 candles is very narrow
  const lastFiveWidths = rawHistory.slice(-5).filter(w => w !== null);
  if (lastFiveWidths.length < 5) return false; // Ensure we have 5 valid flat candles
  
  const maxW = Math.max(...lastFiveWidths);
  const minW = Math.min(...lastFiveWidths);
  const isFlat = (maxW - minW) < avgWidth * 0.15; // Max 15% variation in width

  return isContracted && isFlat;
}

/**
 * Strategy A: Volatility Breakout
 * @param {Array<Object>} candles 
 * @param {number} index 
 * @returns {Object|null} - Signal payload or null
 */
export function evaluateStrategyA(candles, index) {
  if (index < 20) return null;

  const current = candles[index];
  const prev = candles[index - 1];

  const open = parseFloat(current.open);
  const close = parseFloat(current.close);
  
  const bbUpper = current.indicators.bbUpper;
  const bbLower = current.indicators.bbLower;
  const bbWidth = current.indicators.bbWidth;
  const prevBbWidth = prev.indicators.bbWidth;

  if (!bbUpper || !bbLower || !bbWidth || !prevBbWidth) return null;

  // 1. Check if prior state was consolidation (BB contracted & flat)
  const consolidated = isBBContracted(candles, index);
  if (!consolidated) return null;

  // 2. Check if complete candle BODY closes outside Bollinger Bands
  const bodyMax = Math.max(open, close);
  const bodyMin = Math.min(open, close);
  
  let direction = null;
  if (bodyMin > bbUpper) {
    direction = 'BUY';
  } else if (bodyMax < bbLower) {
    direction = 'SELL';
  }

  if (!direction) return null;

  // 3. AND BB Width immediately expands
  const isExpanding = bbWidth > prevBbWidth * 1.05; // at least 5% expansion

  if (isExpanding) {
    return {
      strategy: 'Strategy A (Volatility Breakout)',
      direction,
      entry: close,
      triggerIndex: index,
      timestamp: current.timestamp,
    };
  }

  return null;
}

/**
 * Strategy B: Mean Reversion Liquidity Flush
 * @param {Array<Object>} candles 
 * @param {number} index 
 * @returns {Object|null} - Signal payload or null
 */
export function evaluateStrategyB(candles, index) {
  if (index < 20) return null;

  const current = candles[index];
  const trend = current.indicators.trend; // 'UP', 'DOWN', or 'RANGE'
  
  // 1. Clear market trend must exist
  if (trend !== 'UP' && trend !== 'DOWN') return null;

  const open = parseFloat(current.open);
  const close = parseFloat(current.close);
  const high = parseFloat(current.high);
  const low = parseFloat(current.low);
  
  const bbUpper = current.indicators.bbUpper;
  const bbLower = current.indicators.bbLower;
  const ema9 = current.indicators.ema9;

  if (!bbUpper || !bbLower || !ema9) return null;

  // 2 & 3. Price spikes beyond outer Bollinger Band AGAINST trend, and immediately forms a reversal pattern
  // Also, check if price begins returning toward EMA 9
  let direction = null;
  const pattern = current.pattern;

  if (trend === 'UP') {
    // Uptrend: flush of long liquidity occurs below Lower Bollinger Band
    const spikeBelow = low < bbLower;
    const isBullishReversal = pattern && pattern.direction === 'BULLISH';
    
    // Returning to EMA: Close is higher than open (reversal confirmed) and close is above bbLower, and below EMA 9
    const returningToEma = close > open && close > bbLower && close < ema9;

    if (spikeBelow && isBullishReversal && returningToEma) {
      direction = 'BUY';
    }
  } else if (trend === 'DOWN') {
    // Downtrend: flush of short liquidity occurs above Upper Bollinger Band
    const spikeAbove = high > bbUpper;
    const isBearishReversal = pattern && pattern.direction === 'BEARISH';
    
    // Returning to EMA: Close is lower than open, close is below bbUpper, and above EMA 9
    const returningToEma = close < open && close < bbUpper && close > ema9;

    if (spikeAbove && isBearishReversal && returningToEma) {
      direction = 'SELL';
    }
  }

  if (direction) {
    return {
      strategy: 'Strategy B (Mean Reversion)',
      direction,
      entry: close,
      pattern: pattern.name,
      patternConfidence: pattern.confidence,
      triggerIndex: index,
      timestamp: current.timestamp,
    };
  }

  return null;
}

/**
 * Strategy C: Supertrend Pivot Breakout
 * @param {Array<Object>} candles 
 * @param {number} index 
 * @returns {Object|null} - Signal payload or null
 */
export function evaluateStrategyC(candles, index) {
  if (index < 20) return null;

  const current = candles[index];
  const prev = candles[index - 1];

  const open = parseFloat(current.open);
  const close = parseFloat(current.close);
  const prevClose = parseFloat(prev.close);

  const st = current.indicators.supertrend;
  const pivots = current.indicators.pivotPoints;

  if (!st || !pivots) return null;

  const isSupertrendBullish = st.direction === 'UP';
  const isSupertrendBearish = st.direction === 'DOWN';

  const isR1Breakout = prevClose <= pivots.r1 && close > pivots.r1;
  const isS1Breakdown = prevClose >= pivots.s1 && close < pivots.s1;

  let direction = null;
  if (isR1Breakout && isSupertrendBullish && close > open) {
    direction = 'BUY';
  } else if (isS1Breakdown && isSupertrendBearish && close < open) {
    direction = 'SELL';
  }

  if (direction) {
    return {
      strategy: 'Strategy C (Supertrend Pivot Breakout)',
      direction,
      entry: close,
      triggerIndex: index,
      timestamp: current.timestamp,
    };
  }

  return null;
}

/**
 * Strategy D: CPR Width-Conditional Trend Play (Strategy 2.7)
 * @param {Array<Object>} candles 
 * @param {number} index 
 * @returns {Object|null} - Signal payload or null
 */
export function evaluateStrategyD(candles, index) {
  if (index < 20) return null;

  const current = candles[index];
  const prev = candles[index - 1];

  const open = parseFloat(current.open);
  const close = parseFloat(current.close);
  const low = parseFloat(current.low);
  const prevClose = parseFloat(prev.close);
  const prevLow = parseFloat(prev.low);

  const pivots = current.indicators.pivotPoints;
  if (!pivots) return null;

  const { r1, s1, cprWidth, historicalAverageCprWidth } = pivots;

  // Check if historicalAverageCprWidth exists and is positive
  if (!historicalAverageCprWidth || historicalAverageCprWidth <= 0) return null;

  const isNarrowDay = cprWidth < historicalAverageCprWidth;

  if (isNarrowDay) {
    // Playbook A: Narrow CPR breakout confirmation chase
    const isR1Breakout = prevClose <= r1 && close > r1;
    if (isR1Breakout && close > open) {
      return {
        strategy: 'Strategy D (CPR Width Breakout)',
        direction: 'BUY',
        entry: close,
        stopLoss: prevLow,
        pattern: 'Narrow CPR Breakout',
        triggerIndex: index,
        timestamp: current.timestamp,
      };
    }
  } else {
    // Playbook B: Wide CPR Mean Reversion Setup
    const testedS1AndPivoted = open <= s1 && close > s1 && close > open;
    if (testedS1AndPivoted) {
      return {
        strategy: 'Strategy D (CPR Width Breakout)',
        direction: 'BUY',
        entry: close,
        stopLoss: low,
        pattern: 'Wide CPR Mean Reversion',
        triggerIndex: index,
        timestamp: current.timestamp,
      };
    }
  }

  return null;
}

/**
 * Scans the candles and executes Strategy A, B, C and D checks
 * @param {Array<Object>} candles 
 * @returns {Array<Object>} - array of triggered strategy results
 */
export function scanStrategies(candles) {
  const triggered = [];
  
  for (let i = 20; i < candles.length; i++) {
    const sigA = evaluateStrategyA(candles, i);
    if (sigA) triggered.push(sigA);

    const sigB = evaluateStrategyB(candles, i);
    if (sigB) triggered.push(sigB);

    const sigC = evaluateStrategyC(candles, i);
    if (sigC) triggered.push(sigC);

    const sigD = evaluateStrategyD(candles, i);
    if (sigD) triggered.push(sigD);
  }

  return triggered;
}
