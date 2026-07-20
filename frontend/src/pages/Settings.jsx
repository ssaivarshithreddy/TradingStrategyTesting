import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  RefreshCw, 
  Save, 
  Sliders, 
  Bell, 
  BrainCircuit, 
  CheckCircle 
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const BACKEND_URL = 'http://localhost:5000';

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`);
      const result = await response.json();
      if (result.settings) {
        setSettings(result.settings);
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (response.ok) {
        setSavedMessage('Settings successfully saved and reloaded!');
        setTimeout(() => setSavedMessage(''), 4000);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleStrategyToggle = (strategy) => {
    const list = [...settings.active_strategies];
    const index = list.indexOf(strategy);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(strategy);
    }
    setSettings({ ...settings, active_strategies: list });
  };

  return (
    <div className="space-y-6">
      {/* Upper Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-slate-400 text-sm">Configure quantitative trading parameters, AI triggers, and notification routes</p>
      </div>

      {loading ? (
        <div className="h-64 bg-slatecard rounded-2xl border border-obsidian-700 flex items-center justify-center text-slate-400 space-x-2">
          <RefreshCw className="animate-spin" size={18} />
          <span>Loading configurations...</span>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-6 max-w-3xl">
          {savedMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold flex items-center space-x-2">
              <CheckCircle size={16} />
              <span>{savedMessage}</span>
            </div>
          )}

          {/* Section 1: Active strategies */}
          <div className="bg-slatecard p-6 rounded-2xl border border-obsidian-700 space-y-4">
            <h3 className="font-bold text-white flex items-center space-x-2 border-b border-obsidian-750 pb-3">
              <Sliders size={18} className="text-gold" />
              <span>Active Trading Strategies</span>
            </h3>
            
            <div className="space-y-3 pt-2">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.active_strategies.includes('BB_BREAKOUT')}
                  onChange={() => handleStrategyToggle('BB_BREAKOUT')}
                  className="mt-1 h-4 w-4 rounded border-obsidian-700 text-gold bg-obsidian-900 focus:ring-gold"
                />
                <div>
                  <span className="text-sm font-bold text-slate-200 group-hover:text-gold transition-colors">
                    Strategy A: Volatility Breakout
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Triggers breakouts out of Bollinger Bands squeezes on immediate width expansion.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group mt-4">
                <input
                  type="checkbox"
                  checked={settings.active_strategies.includes('MEAN_REVERSION')}
                  onChange={() => handleStrategyToggle('MEAN_REVERSION')}
                  className="mt-1 h-4 w-4 rounded border-obsidian-700 text-gold bg-obsidian-900 focus:ring-gold"
                />
                <div>
                  <span className="text-sm font-bold text-slate-200 group-hover:text-gold transition-colors">
                    Strategy B: Mean Reversion Liquidity Flush
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Triggers reversals when price flushes Bollinger Bands against trend, forming Hammer/Engulfing patterns.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group mt-4">
                <input
                  type="checkbox"
                  checked={settings.active_strategies.includes('SUPERTREND_PIVOT')}
                  onChange={() => handleStrategyToggle('SUPERTREND_PIVOT')}
                  className="mt-1 h-4 w-4 rounded border-obsidian-700 text-gold bg-obsidian-900 focus:ring-gold"
                />
                <div>
                  <span className="text-sm font-bold text-slate-200 group-hover:text-gold transition-colors">
                    Strategy C: Supertrend Pivot Breakout
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Triggers when price breaks standard pivot support/resistance levels aligned with the Supertrend direction.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group mt-4">
                <input
                  type="checkbox"
                  checked={settings.active_strategies.includes('CPR_WIDTH')}
                  onChange={() => handleStrategyToggle('CPR_WIDTH')}
                  className="mt-1 h-4 w-4 rounded border-obsidian-700 text-gold bg-obsidian-900 focus:ring-gold"
                />
                <div>
                  <span className="text-sm font-bold text-slate-200 group-hover:text-gold transition-colors">
                    Strategy D: CPR Width Breakout & Mean Reversion (Strategy 2.7)
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Triggers dynamic breakouts on narrow CPR sessions, or mean reversion entries targeting the CPR center on wide sessions.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Sizing and Risk */}
          <div className="bg-slatecard p-6 rounded-2xl border border-obsidian-700 space-y-4">
            <h3 className="font-bold text-white flex items-center space-x-2 border-b border-obsidian-750 pb-3">
              <Sliders size={18} className="text-gold" />
              <span>Risk Management Validation Limits</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Minimum Risk Reward Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="4.0"
                  value={settings.risk_reward_min || 2.0}
                  onChange={(e) => setSettings({ ...settings, risk_reward_min: parseFloat(e.target.value) })}
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Trade Risk Sizing (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="5.0"
                  value={settings.risk_percentage || 1.0}
                  onChange={(e) => setSettings({ ...settings, risk_percentage: parseFloat(e.target.value) })}
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: WhatsApp Alert routing */}
          <div className="bg-slatecard p-6 rounded-2xl border border-obsidian-700 space-y-4">
            <h3 className="font-bold text-white flex items-center space-x-2 border-b border-obsidian-750 pb-3">
              <Bell size={18} className="text-gold" />
              <span>WhatsApp Alerts Routing</span>
            </h3>

            <div className="space-y-4 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications_enabled}
                  onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-obsidian-700 text-gold bg-obsidian-900 focus:ring-gold"
                />
                <span className="text-sm font-bold text-slate-200">Enable Automated Alerts Dispatch</span>
              </label>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Recipient Phone Number (with Country Code)</label>
                <input
                  type="text"
                  placeholder="e.g. 15550199"
                  value={settings.recipient_phone || ''}
                  onChange={(e) => setSettings({ ...settings, recipient_phone: e.target.value })}
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Ollama Local AI */}
          <div className="bg-slatecard p-6 rounded-2xl border border-obsidian-700 space-y-4">
            <h3 className="font-bold text-white flex items-center space-x-2 border-b border-obsidian-750 pb-3">
              <BrainCircuit size={18} className="text-gold" />
              <span>Ollama AI Configs</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Ollama Server Host</label>
                <input
                  type="text"
                  value={settings.ollama_host || 'http://localhost:11434'}
                  onChange={(e) => setSettings({ ...settings, ollama_host: e.target.value })}
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Target Model</label>
                <input
                  type="text"
                  value={settings.ollama_model || 'llama3.1'}
                  onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Save Action */}
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-gold to-gold-dark hover:brightness-110 text-obsidian-950 font-bold px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg shadow-gold/10 transition-all"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            <span>SAVE CONFIGURATIONS</span>
          </button>
        </form>
      )}
    </div>
  );
}
