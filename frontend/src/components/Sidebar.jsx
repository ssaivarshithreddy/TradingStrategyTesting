import React from 'react';
import { 
  LayoutDashboard, 
  LineChart, 
  Activity, 
  History, 
  Play, 
  Settings as SettingsIcon, 
  ShieldAlert 
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'chart', name: 'Live Chart', icon: LineChart },
    { id: 'signals', name: 'Signal History', icon: History },
    { id: 'backtest', name: 'Backtesting', icon: Play },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-obsidian-900 border-r border-obsidian-700 min-h-screen flex flex-col justify-between">
      <div>
        {/* Header/Logo */}
        <div className="p-6 border-b border-obsidian-700 flex items-center space-x-3">
          <div className="bg-gold p-2 rounded-lg text-obsidian-950">
            <ShieldAlert size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-gold">GOLD INTEL</h1>
            <p className="text-xs text-slate-400">XAU/USD Intelligence</p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="mt-8 px-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive 
                    ? 'bg-gradient-to-r from-gold/15 to-transparent border-l-4 border-gold text-gold shadow-lg shadow-gold/5' 
                    : 'text-slate-400 hover:bg-obsidian-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-gold' : 'text-slate-400'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-obsidian-700">
        <div className="bg-obsidian-800 p-4 rounded-xl flex items-center justify-between border border-obsidian-700">
          <div>
            <p className="text-xs text-slate-400">System Mode</p>
            <p className="text-sm font-semibold text-emerald-400 flex items-center space-x-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>REST Fallback</span>
            </p>
          </div>
          <div className="text-xs font-mono text-gold-light border border-gold/30 px-2 py-1 rounded bg-gold/5">
            v1.0.0
          </div>
        </div>
      </div>
    </aside>
  );
}
