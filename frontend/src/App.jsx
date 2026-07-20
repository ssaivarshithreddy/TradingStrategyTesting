import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SignalHistory from './pages/SignalHistory';
import Backtesting from './pages/Backtesting';
import Settings from './pages/Settings';
import TVChart from './components/TVChart';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  
  // Quick direct chart preview page wrapper
  const [chartCandles, setChartCandles] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  React.useEffect(() => {
    // Warm up chart data
    const loadData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/data/candles?timeframe=1h&limit=150');
        const result = await response.json();
        if (result.candles) {
          setChartCandles(result.candles);
        }
      } catch (e) {
        console.error('Failed to load chart page data:', e);
      } finally {
        setChartLoading(false);
      }
    };
    loadData();
  }, []);

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard activePage={activePage} setActivePage={setActivePage} />;
      case 'chart':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Full Live Chart View</h2>
              <p className="text-slate-400 text-sm">Gold Futures (GC=F) 1-Hour Chart with full technical overlays</p>
            </div>
            <div className="bg-slatecard p-5 rounded-2xl border border-obsidian-700 space-y-4">
              {chartLoading ? (
                <div className="h-[500px] flex items-center justify-center text-slate-400">
                  <span>Loading Chart...</span>
                </div>
              ) : (
                <TVChart candles={chartCandles} />
              )}
            </div>
          </div>
        );
      case 'signals':
        return <SignalHistory />;
      case 'backtest':
        return <Backtesting />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard activePage={activePage} setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="flex bg-obsidian-950 min-h-screen text-slate-100 font-sans selection:bg-gold selection:text-obsidian-950">
      {/* Sidebar navigation */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Content Pane */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
}
