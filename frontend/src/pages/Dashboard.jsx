import React, { useState, useEffect } from 'react';
import TVChart from '../components/TVChart';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  Sliders, 
  Bell, 
  Activity,
  AlertTriangle,
  Play
} from 'lucide-react';

export default function Dashboard({ activePage, setActivePage }) {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState('1h');
  const [ticker, setTicker] = useState('GOLD');
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [priceData, setPriceData] = useState({ current: 0, change: 0, high: 0, low: 0 });

  const BACKEND_URL = 'http://localhost:5000';

  const fetchCandlesData = async (tf) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/data/candles?timeframe=${tf}&ticker=${ticker}&limit=150`);
      const result = await response.json();
      if (result.candles && result.candles.length > 0) {
        setCandles(result.candles);
        
        // Populate stats based on latest candles
        const latest = result.candles[result.candles.length - 1];
        const prev = result.candles[result.candles.length - 2] || latest;
        const currentPrice = parseFloat(latest.close);
        const change = currentPrice - parseFloat(prev.close);
        
        setPriceData({
          current: currentPrice,
          change,
          high: Math.max(...result.candles.slice(-24).map(c => parseFloat(c.high))),
          low: Math.min(...result.candles.slice(-24).map(c => parseFloat(c.low))),
        });
      }
    } catch (e) {
      console.error('Failed to fetch candles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandlesData(timeframe);
    // Poll price data every 30 seconds
    const interval = setInterval(() => fetchCandlesData(timeframe), 30000);
    return () => clearInterval(interval);
  }, [timeframe, ticker]);

  const triggerLiveCheck = async () => {
    setPolling(true);
    setLiveResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/signals/check-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe, ticker }),
      });
      const result = await response.json();
      setLiveResult(result);
      // Refresh candles to capture any updates
      fetchCandlesData(timeframe);
    } catch (e) {
      console.error('Live sync check failed:', e);
    } finally {
      setPolling(false);
    }
  };

  // Helper stats extraction
  const latestCandle = candles[candles.length - 1] || {};
  const ind = latestCandle.indicators || {};
  
  return (
    <div className="space-y-6">
      {/* Upper Status & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{ticker === 'GOLD' ? 'Gold (XAU/USD)' : 'NIFTY 50 Index'} Live Analysis</h2>
          <p className="text-slate-400 text-sm">Real-time indicators, pattern recognition, and strategy alerts</p>
        </div>

        {/* Timeframe & Poll Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Asset Selector */}
          <div className="bg-obsidian-800 p-1 rounded-xl flex border border-obsidian-700">
            {['GOLD', 'NIFTY'].map(tk => (
              <button
                key={tk}
                onClick={() => {
                  setTicker(tk);
                  setLiveResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all duration-300 ${
                  ticker === tk 
                    ? 'bg-gold text-obsidian-950 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tk === 'GOLD' ? 'Gold Futures' : 'Nifty 50'}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="bg-obsidian-800 p-1 rounded-xl flex border border-obsidian-700">
            {['5m', '30m', '1h', '4h', '1d'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all duration-300 ${
                  timeframe === tf 
                    ? 'bg-gold text-obsidian-950 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Sync check Button */}
          <button
            onClick={triggerLiveCheck}
            disabled={polling}
            className={`bg-gradient-to-r from-gold to-gold-dark hover:brightness-110 text-obsidian-950 font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-gold/10 transition-all ${
              polling ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw size={14} className={polling ? 'animate-spin' : ''} />
            <span className="text-xs">SYNC & SCAN</span>
          </button>
        </div>
      </div>

      {/* Grid: Ticker Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gold Price */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">XAU/USD SPOT PRICE</span>
            <Activity size={16} className="text-gold" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-white">${priceData.current ? priceData.current.toFixed(2) : '---'}</h3>
            <p className={`text-xs font-semibold flex items-center space-x-1 mt-1 ${
              priceData.change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {priceData.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>
                {priceData.change >= 0 ? '+' : ''}{priceData.change ? priceData.change.toFixed(2) : '0.00'} (24h)
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Trend Direction */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">TREND BIAS</span>
            <Sliders size={16} className="text-gold" />
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-bold uppercase ${
              ind.trend === 'UP' ? 'text-emerald-400' : ind.trend === 'DOWN' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {ind.trend || 'WARMUP'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">EMA 9 / BB SMA 20 Alignment</p>
          </div>
        </div>

        {/* Card 3: Dynamic Support */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">DYNAMIC SUPPORT (SWING)</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">${ind.support ? ind.support.toFixed(2) : '---'}</h3>
            <p className="text-xs text-slate-400 mt-1">Nearest historical swing floor</p>
          </div>
        </div>

        {/* Card 4: Dynamic Resistance */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">DYNAMIC RESISTANCE (SWING)</span>
            <TrendingDown size={16} className="text-red-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">${ind.resistance ? ind.resistance.toFixed(2) : '---'}</h3>
            <p className="text-xs text-slate-400 mt-1">Nearest historical swing ceiling</p>
          </div>
        </div>
      </div>

      {/* Live Polling Signal Output (If triggered) */}
      {liveResult && (
        <div className={`p-5 rounded-2xl border ${
          liveResult.status === 'SIGNAL_TRIGGERED' 
            ? 'bg-gold/5 border-gold shadow-lg shadow-gold/5 glow-active' 
            : 'bg-slatecard border-obsidian-700'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${
                liveResult.status === 'SIGNAL_TRIGGERED' ? 'bg-gold text-obsidian-950' : 'bg-obsidian-800 text-slate-400'
              }`}>
                {liveResult.status === 'SIGNAL_TRIGGERED' ? <Bell size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div>
                <h4 className="font-bold text-white">
                  Scan Status: {liveResult.status === 'SIGNAL_TRIGGERED' ? 'VALIDATED TRADE SIGNAL DETECTED!' : 'SCAN COMPLETE - NO TRADE'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Triggered at: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-4 leading-relaxed bg-obsidian-950 p-4 rounded-xl border border-obsidian-800 font-mono">
            {liveResult.status === 'SIGNAL_TRIGGERED' 
              ? `Action: ${liveResult.signal.direction} | Entry: ${liveResult.signal.entry} | SL: ${liveResult.signal.stopLoss} | TP: ${liveResult.signal.takeProfit} | Strategy: ${liveResult.signal.strategyUsed} | Pattern: ${liveResult.signal.pattern}\nReason: ${liveResult.signal.reason}`
              : `Result: NO TRADE\nReason: ${liveResult.reason}`
            }
          </p>

          {/* If live result contains signal, display option to view signal details directly */}
          {liveResult.status === 'SIGNAL_TRIGGERED' && (
            <button 
              onClick={() => setActivePage('signals')}
              className="mt-4 text-xs font-semibold text-gold flex items-center space-x-1 hover:underline"
            >
              <span>View details and AI analysis in history</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>
      )}

      {/* Chart & Overlay Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main TV Candlestick Chart */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-obsidian-700 pb-4">
            <h3 className="font-bold text-white">Interactive Gold Chart</h3>
            <span className="text-xs font-semibold text-slate-400 bg-obsidian-800 px-3 py-1 rounded-full border border-obsidian-700">
              Gold Futures (GC=F)
            </span>
          </div>
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-slate-400 space-x-2">
              <RefreshCw className="animate-spin" size={20} />
              <span>Loading market data...</span>
            </div>
          ) : (
            <TVChart candles={candles} />
          )}
        </div>

        {/* Panel: Strategy Configurations */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 space-y-4">
          <h3 className="font-bold text-white border-b border-obsidian-700 pb-4">Running Strategy Rules</h3>
          
          <div className="space-y-4 pt-2">
            {/* Strategy 1 */}
            <div className="bg-obsidian-950 p-4 rounded-xl border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Strategy A</h4>
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  VOLATILITY BREAKOUT
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors horizontal consolidation. Triggers a breakout signal when the candle body closes outside Bollinger Bands on immediate BB Width expansion.
              </p>
            </div>

            {/* Strategy 2 */}
            <div className="bg-obsidian-950 p-4 rounded-xl border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Strategy B</h4>
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  MEAN REVERSION
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors trend biases. Triggers when price spikes beyond outer Bollinger Bands against trend, forms a Hammer, Pin Bar, or Engulfing pattern, and starts returning to EMA 9.
              </p>
            </div>

            {/* Strategy 3 */}
            <div className="bg-obsidian-950 p-4 rounded-xl border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Strategy C</h4>
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  SUPERTREND PIVOT
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors support/resistance breakout levels. Triggers when price breaks past Daily Pivot points (R1 or S1) aligned with the active Supertrend trend direction.
              </p>
            </div>

            {/* Strategy 4 */}
            <div className="bg-obsidian-950 p-4 rounded-xl border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Strategy D</h4>
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  CPR WIDTH BREAKOUT
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitors Central Pivot Range width. Triggers breakouts on narrow width sessions, or mean reversion setups targeting the CPR center on wide width sessions.
              </p>
            </div>

            {/* Validation Rules Info */}
            <div className="bg-obsidian-900/50 p-4 rounded-xl border border-obsidian-800 flex items-start space-x-2.5">
              <AlertTriangle size={16} className="text-gold shrink-0 mt-0.5" />
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-300 block">Strict Trade Validator:</span>
                Setups are rejected and output as <span className="font-mono text-gold-light">NO TRADE</span> if they breach trend slope alignment, have pattern confidence below 75%, or fall short of the mandatory 1:2 Risk-to-Reward ratio.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
