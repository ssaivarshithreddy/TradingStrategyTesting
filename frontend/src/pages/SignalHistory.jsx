import React, { useState, useEffect } from 'react';
import { 
  History, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BrainCircuit, 
  ShieldAlert, 
  Info,
  Calendar
} from 'lucide-react';

export default function SignalHistory() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState(null);

  const BACKEND_URL = 'http://localhost:5000';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/signals/history?limit=30`);
      const result = await response.json();
      if (result.signals) {
        setSignals(result.signals);
      }
    } catch (e) {
      console.error('Failed to fetch signals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* Upper Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Signal History & logs</h2>
          <p className="text-slate-400 text-sm">Archived high-confidence validated signals and quantitative commentaries</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="bg-obsidian-800 hover:bg-obsidian-750 text-slate-300 font-semibold p-2.5 rounded-xl border border-obsidian-750 transition-all flex items-center space-x-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="text-xs">REFRESH</span>
        </button>
      </div>

      {/* Main Container */}
      {loading ? (
        <div className="h-64 bg-slatecard rounded-2xl border border-obsidian-700 flex items-center justify-center text-slate-400 space-x-2">
          <RefreshCw className="animate-spin" size={18} />
          <span>Loading historical logs...</span>
        </div>
      ) : signals.length === 0 ? (
        <div className="bg-slatecard rounded-2xl border border-obsidian-700 p-12 text-center space-y-4">
          <History size={48} className="text-slate-500 mx-auto" />
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-white text-lg">No Signals Logged Yet</h3>
            <p className="text-slate-400 text-sm">
              The database signals registry is empty. Setups are archived here automatically when a validated strategy signal triggers during polling scans.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs font-semibold text-gold border border-gold/30 hover:bg-gold/10 px-4 py-2 rounded-xl transition-all"
          >
            Check Again
          </button>
        </div>
      ) : (
        <div className="bg-slatecard rounded-2xl border border-obsidian-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-obsidian-850 border-b border-obsidian-700 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Time</th>
                  <th className="p-4">Strategy</th>
                  <th className="p-4">Signal</th>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Stop Loss</th>
                  <th className="p-4">Take Profit</th>
                  <th className="p-4">Conf.</th>
                  <th className="p-4 text-center">AI Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800 text-slate-300 text-sm">
                {signals.map(sig => {
                  const isBuy = sig.direction === 'BUY';
                  return (
                    <tr key={sig.id} className="hover:bg-obsidian-800/35 transition-all">
                      <td className="p-4 font-medium text-slate-400 flex items-center space-x-2">
                        <Calendar size={14} className="text-slate-500" />
                        <span>{new Date(sig.timestamp).toLocaleString()}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-200">
                        {sig.strategy_used}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide inline-block ${
                          isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {sig.direction}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold">${parseFloat(sig.entry_price).toFixed(2)}</td>
                      <td className="p-4 font-mono text-red-400">${parseFloat(sig.stop_loss).toFixed(2)}</td>
                      <td className="p-4 font-mono text-emerald-400">${parseFloat(sig.take_profit).toFixed(2)}</td>
                      <td className="p-4 font-bold text-slate-200">{sig.confidence}%</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedSignal(sig)}
                          className="bg-gold/10 hover:bg-gold/20 text-gold font-bold px-3 py-1.5 rounded-lg border border-gold/30 text-xs transition-all flex items-center space-x-1 mx-auto"
                        >
                          <BrainCircuit size={12} />
                          <span>ANALYZE</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signal Analysis Popup Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slatecard border border-obsidian-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-obsidian-750 flex items-center justify-between bg-obsidian-900/60">
              <div className="flex items-center space-x-3">
                <div className="bg-gold/10 p-2 rounded-xl text-gold border border-gold/20">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">AI Quant Analyst Commentary</h3>
                  <p className="text-slate-400 text-xs">Trade execution logic generated by local Llama 3.1 Model</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold hover:bg-obsidian-850 px-3 py-1.5 rounded-lg transition-all"
              >
                CLOSE
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              {/* Setup Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-obsidian-900 p-4 rounded-xl border border-obsidian-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Signal</span>
                  <span className={`text-sm font-bold ${
                    selectedSignal.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                  }`}>{selectedSignal.direction}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Trigger Price</span>
                  <span className="text-sm font-mono font-bold text-slate-200">${parseFloat(selectedSignal.entry_price).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Stop / Profit</span>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    SL: ${parseFloat(selectedSignal.stop_loss).toFixed(2)} / TP: ${parseFloat(selectedSignal.take_profit).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Risk Reward</span>
                  <span className="text-sm font-bold text-gold">{selectedSignal.risk_reward} R:R</span>
                </div>
              </div>

              {/* AI Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 1: Trade Explanation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <Info size={14} className="text-blue-400" />
                    <span>Technical Rational</span>
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed bg-obsidian-900/40 p-4 rounded-xl border border-obsidian-800">
                    {selectedSignal.ai_analysis?.trade_explanation || 'No details available.'}
                  </p>
                </div>

                {/* Section 2: Risk Explanation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span>Risk & Invalidation</span>
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed bg-obsidian-900/40 p-4 rounded-xl border border-obsidian-800">
                    {selectedSignal.ai_analysis?.risk_explanation || 'No details available.'}
                  </p>
                </div>

                {/* Section 3: Confidence explanation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <BrainCircuit size={14} className="text-gold" />
                    <span>Confidence Reasoning</span>
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed bg-obsidian-900/40 p-4 rounded-xl border border-obsidian-800">
                    {selectedSignal.ai_analysis?.confidence_reasoning || 'No details available.'}
                  </p>
                </div>

                {/* Section 4: Professional Commentary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <BrainCircuit size={14} className="text-emerald-400" />
                    <span>Market Structure Commentary</span>
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed bg-obsidian-900/40 p-4 rounded-xl border border-obsidian-800">
                    {selectedSignal.ai_analysis?.professional_reasoning || 'No details available.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
