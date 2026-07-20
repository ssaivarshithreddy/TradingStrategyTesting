function calculateSupertrend(candles, period = 7, multiplier = 3) {
  const result = [];
  if (candles.length < period) return result;

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

const mockCandles = [
  { open: 2000, high: 2010, low: 1995, close: 2005 },
  { open: 2005, high: 2015, low: 2000, close: 2012 },
  { open: 2012, high: 2020, low: 2005, close: 2018 },
  { open: 2018, high: 2022, low: 2012, close: 2015 },
  { open: 2015, high: 2025, low: 2010, close: 2022 },
  { open: 2022, high: 2030, low: 2018, close: 2028 },
  { open: 2028, high: 2035, low: 2020, close: 2032 }
];

const results = calculateSupertrend(mockCandles, 3, 2);
console.log('Supertrend calculated values:');
results.forEach((r, idx) => {
  console.log(`Candle #${idx+1}: Close=${mockCandles[idx].close} | Supertrend=${r ? `${r.value.toFixed(2)} (${r.direction})` : 'NULL'}`);
});
