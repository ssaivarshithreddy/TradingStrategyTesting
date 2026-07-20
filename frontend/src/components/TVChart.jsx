import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function TVChart({ candles }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return;

    // Create Chart Instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0B0F19' },
        textColor: '#94A3B8',
      },
      grid: {
        vertLines: { color: '#1B2330' },
        horzLines: { color: '#1B2330' },
      },
      rightPriceScale: {
        borderColor: '#1B2330',
      },
      timeScale: {
        borderColor: '#1B2330',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Add Bollinger Bands (Middle, Upper, Lower) & EMA 9 Line Series
    const ema9Series = chart.addLineSeries({
      color: '#3B82F6',
      lineWidth: 1.5,
      title: 'EMA 9',
    });

    const bbUpperSeries = chart.addLineSeries({
      color: 'rgba(212, 175, 55, 0.5)',
      lineWidth: 1,
      lineStyle: 2, // Dotted
      title: 'BB Upper',
    });

    const bbMiddleSeries = chart.addLineSeries({
      color: 'rgba(148, 163, 184, 0.3)',
      lineWidth: 1,
      title: 'BB Middle',
    });

    const bbLowerSeries = chart.addLineSeries({
      color: 'rgba(212, 175, 55, 0.5)',
      lineWidth: 1,
      lineStyle: 2, // Dotted
      title: 'BB Lower',
    });

    // Sort, deduplicate, and validate data to prevent Lightweight Charts runtime crashes
    const seenTimes = new Set();
    const chartData = [];
    const emaData = [];
    const bbUpperData = [];
    const bbMiddleData = [];
    const bbLowerData = [];
    const markers = [];

    // Sort candles chronologically ascending
    const sortedCandles = [...candles]
      .filter(c => c && c.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    sortedCandles.forEach(c => {
      const t = Math.floor(new Date(c.timestamp).getTime() / 1000);
      if (isNaN(t) || seenTimes.has(t)) return;
      seenTimes.add(t);

      // Check if OHLC data is valid numeric values
      const open = parseFloat(c.open);
      const high = parseFloat(c.high);
      const low = parseFloat(c.low);
      const close = parseFloat(c.close);
      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return;

      chartData.push({ time: t, open, high, low, close });

      const ind = c.indicators || {};
      if (ind.ema9 !== null && ind.ema9 !== undefined && !isNaN(ind.ema9)) {
        emaData.push({ time: t, value: parseFloat(ind.ema9) });
      }
      if (ind.bbUpper !== null && ind.bbUpper !== undefined && !isNaN(ind.bbUpper)) {
        bbUpperData.push({ time: t, value: parseFloat(ind.bbUpper) });
      }
      if (ind.bbMiddle !== null && ind.bbMiddle !== undefined && !isNaN(ind.bbMiddle)) {
        bbMiddleData.push({ time: t, value: parseFloat(ind.bbMiddle) });
      }
      if (ind.bbLower !== null && ind.bbLower !== undefined && !isNaN(ind.bbLower)) {
        bbLowerData.push({ time: t, value: parseFloat(ind.bbLower) });
      }

      // Add pattern markers
      if (c.pattern) {
        const isBullish = c.pattern.direction === 'BULLISH';
        markers.push({
          time: t,
          position: isBullish ? 'belowBar' : 'aboveBar',
          color: isBullish ? '#10B981' : '#EF4444',
          shape: isBullish ? 'arrowUp' : 'arrowDown',
          text: c.pattern.name,
        });
      } else if (ind.swingHigh !== null && ind.swingHigh !== undefined && !isNaN(ind.swingHigh)) {
        markers.push({
          time: t,
          position: 'aboveBar',
          color: '#F59E0B',
          shape: 'circle',
          text: 'SH',
        });
      } else if (ind.swingLow !== null && ind.swingLow !== undefined && !isNaN(ind.swingLow)) {
        markers.push({
          time: t,
          position: 'belowBar',
          color: '#EC4899',
          shape: 'circle',
          text: 'SL',
        });
      }
    });

    if (chartData.length > 0) {
      try {
        candlestickSeries.setData(chartData);
        ema9Series.setData(emaData);
        bbUpperSeries.setData(bbUpperData);
        bbMiddleSeries.setData(bbMiddleData);
        bbLowerSeries.setData(bbLowerData);
        
        if (markers.length > 0) {
          candlestickSeries.setMarkers(markers);
        }
      } catch (err) {
        console.error('Error binding data to lightweight-charts series:', err);
      }
    }

    // Auto-fit content
    chart.timeScale().fitContent();

    // Handle Responsive Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-[500px]" />
    </div>
  );
}
