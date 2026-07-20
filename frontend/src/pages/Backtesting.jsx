import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { 
  Play, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function Backtesting() {
  const [strategy, setStrategy] = useState('Strategy B');
  const [timeframe, setTimeframe] = useState('1h');
  const [days, setDays] = useState(30);
  const [ticker, setTicker] = useState('GOLD');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const BACKEND_URL = 'http://localhost:5000';

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/backtest/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, timeframe, days: parseInt(days, 10), ticker }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error running backtest.');
      }
      setResults(data);
    } catch (e) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Render the Equity Line Chart dynamically when results change
  useEffect(() => {
    if (!chartContainerRef.current || !results || !results.balanceHistory || results.balanceHistory.length === 0) return;

    // Create Line Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
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
      },
    });

    chartRef.current = chart;

    const lineSeries = chart.addLineSeries({
      color: '#D4AF37',
      lineWidth: 2,
      title: 'Account Balance ($)',
    });

    // Sort, deduplicate, and format timestamps for the line chart series
    const seenTimes = new Set();
    const lineData = [];

    const sortedHistory = [...results.balanceHistory]
      .filter(bh => bh && bh.time)
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    sortedHistory.forEach(bh => {
      const t = Math.floor(new Date(bh.time).getTime() / 1000);
      if (isNaN(t) || seenTimes.has(t)) return;
      seenTimes.add(t);
      lineData.push({
        time: t,
        value: parseFloat(bh.balance),
      });
    });

    if (lineData.length > 0) {
      try {
        lineSeries.setData(lineData);
        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Error setting backtest chart series data:', err);
      }
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Upper Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Historical Backtesting Panel</h2>
        <p className="text-slate-400 text-sm">Simulate quantitative trading rules over historical XAU/USD data sets</p>
      </div>

      {/* Grid: Configurations & Description */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 space-y-4">
          <h3 className="font-bold text-white border-b border-obsidian-700 pb-4">Simulation Parameters</h3>
          
          <div className="space-y-4 pt-2">
            {/* Asset Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Select Asset</label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold"
              >
                <option value="GOLD">Gold Futures (GC=F)</option>
                <option value="NIFTY">Nifty 50 Index (^NSEI)</option>
              </select>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Select Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold"
              >
                <option value="Strategy A">Strategy A (Volatility Breakout)</option>
                <option value="Strategy B">Strategy B (Mean Reversion)</option>
                <option value="Strategy C">Strategy C (Supertrend Pivot Breakout)</option>
                <option value="Strategy D">Strategy D (CPR Width Breakout)</option>
              </select>
            </div>

            {/* Timeframe Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold"
              >
                <option value="5m">5 Minutes (max 30 days)</option>
                <option value="30m">30 Minutes (max 30 days)</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hour</option>
                <option value="1d">Daily</option>
              </select>
            </div>

            {/* Days lookback */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Historical Window (Days)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold to-gold-dark hover:brightness-110 text-obsidian-950 font-bold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-gold/5 transition-all mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>SIMULATING...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-obsidian-950" />
                  <span>RUN SIMULATION</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informative Rules card */}
        <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white border-b border-obsidian-700 pb-4">Engine Specs</h3>
            <div className="space-y-3 pt-4 text-sm text-slate-400 leading-relaxed">
              <p>
                *   **Simulated Portfolio**: Starts with **$100,000** initial capital.
              </p>
              <p>
                *   **Risk Profile**: Fixed risk sizing of **1.0% ($1,000)** per trade based on entry to Stop Loss distance.
              </p>
              <p>
                *   **Trade Isolation**: Simulates a single-position model. The simulator holds a trade until target/stop trigger before scanning for new strategy entries.
              </p>
              <p>
                *   **Stops & Targets**: Dynamically calculated by the validator based on local swing structures and ATR values, strictly enforcing a minimum 1:2 R:R.
              </p>
            </div>
          </div>
          <div className="bg-obsidian-900 p-4 rounded-xl border border-obsidian-800 flex items-start space-x-2 text-xs text-slate-400 mt-4">
            <Info size={14} className="text-gold shrink-0 mt-0.5" />
            <span>Note: Intraday 30m charts have smaller limits on historical Yahoo data (max 30 days). Adjust parameters to keep historical spans within provider guidelines.</span>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-semibold">
          Error: {error}
        </div>
      )}

      {/* Simulation results (If finished) */}
      {results && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* KPI 1 */}
            <div className="bg-slatecard p-4 rounded-xl border border-obsidian-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Trades</span>
              <span className="text-2xl font-bold text-white mt-1 block">{results.metrics.totalTrades}</span>
            </div>
            {/* KPI 2 */}
            <div className="bg-slatecard p-4 rounded-xl border border-obsidian-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Win Rate</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">{results.metrics.winRate}%</span>
            </div>
            {/* KPI 3 */}
            <div className="bg-slatecard p-4 rounded-xl border border-obsidian-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Loss Rate</span>
              <span className="text-2xl font-bold text-red-400 mt-1 block">{results.metrics.lossRate}%</span>
            </div>
            {/* KPI 4 */}
            <div className="bg-slatecard p-4 rounded-xl border border-obsidian-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Profit Factor</span>
              <span className="text-2xl font-bold text-gold mt-1 block">{results.metrics.profitFactor}</span>
            </div>
            {/* KPI 5 */}
            <div className="bg-slatecard p-4 rounded-xl border border-obsidian-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Max Drawdown</span>
              <span className="text-2xl font-bold text-amber-500 mt-1 block">{results.metrics.maxDrawdownPercent}%</span>
            </div>
            {/* KPI 6 */}
            <div className="bg-slatecard p-4 rounded-xl border border-obsidian-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">Avg R:R Ratio</span>
              <span className="text-2xl font-bold text-slate-200 mt-1 block">{results.metrics.averageRiskReward}</span>
            </div>
          </div>

          {/* Equity Chart & Trades Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balance Curve Chart */}
            <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 lg:col-span-2 space-y-4">
              <h4 className="font-bold text-white border-b border-obsidian-700 pb-4">Simulated Account Equity Curve</h4>
              <div ref={chartContainerRef} className="w-full h-[300px]" />
            </div>

            {/* Trades Ledger summary */}
            <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 space-y-4">
              <h4 className="font-bold text-white border-b border-obsidian-700 pb-4">Performance Log</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {results.trades.map((t, idx) => (
                  <div key={idx} className="bg-obsidian-950 p-3 rounded-lg border border-obsidian-850 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                        t.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {t.direction}
                      </span>
                      <p className="text-slate-400 font-mono">Entry: ${t.entryPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className={`font-bold ${
                        t.outcome === 'WIN' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {t.outcome === 'WIN' ? `+$${t.profitLoss.toFixed(0)}` : `-$${Math.abs(t.profitLoss).toFixed(0)}`}
                      </span>
                      <p className="text-[10px] text-slate-500">R:R {t.riskReward}</p>
                    </div>
                  </div>
                ))}
                {results.trades.length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-12">No simulated trades executed in this window.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
