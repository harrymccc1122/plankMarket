import { useState, useCallback } from 'react';
import { Web3Config } from './components/Web3Config';
import { Header } from './components/Header';
import { MarketSelector } from './components/MarketSelector';
import { PriceChart } from './components/PriceChart';
import { BettingPanel } from './components/BettingPanel';
import { PredictionsList } from './components/PredictionsList';
import { APITab } from './components/APITab';
import { useBTCPrice } from './hooks/useBTCPrice';
import { Market, MARKETS } from './types';
import { useAccount } from 'wagmi';

function AppContent() {
  const { price, history, cycleStartPrices, orders, predictions } = useBTCPrice();
  const { address } = useAccount();
  const [selectedMarket, setSelectedMarket] = useState<Market>(MARKETS[0]);
  const [activeTab, setActiveTab] = useState<'trade' | 'api'>('trade');

  const handleBet = useCallback(async (direction: 'up' | 'down', amount: string, type: 'market' | 'limit', limitPrice?: number) => {
    if (!address) return;

    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: address,
          marketId: selectedMarket.id,
          direction,
          amount,
          type,
          limitPrice
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order');
    }
  }, [address, selectedMarket.id]);

  const cycleStartPrice = cycleStartPrices[selectedMarket.id] || null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-8 border-b border-white/5 mb-8">
          <button 
            onClick={() => setActiveTab('trade')}
            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'trade' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Trade
            {activeTab === 'trade' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'api' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            API
            {activeTab === 'api' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
          </button>
        </div>

        {activeTab === 'trade' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Chart and Markets */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">BTC / USD</h2>
                <MarketSelector 
                  selectedMarket={selectedMarket} 
                  onSelect={setSelectedMarket} 
                />
              </div>

              <PriceChart 
                data={history} 
                activePredictions={predictions} 
                cycleStartPrice={cycleStartPrice}
              />

              <div className="hidden lg:block">
                <PredictionsList predictions={predictions} orders={orders} userId={address} />
              </div>
            </div>

            {/* Right Column: Betting Panel */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <BettingPanel 
                market={selectedMarket} 
                currentPrice={price}
                lockInPrice={cycleStartPrice}
                onBet={handleBet}
                orders={orders}
              />
              
              <div className="lg:hidden">
                <PredictionsList predictions={predictions} orders={orders} userId={address} />
              </div>

              {/* Stats / Info */}
              <div className="bg-[#151619] border border-white/5 rounded-xl p-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                  Market Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500">24h Volume</div>
                    <div className="text-lg font-mono font-bold">$1.2M</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Active Users</div>
                    <div className="text-lg font-mono font-bold">4,281</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <APITab />
        )}
      </main>

      {/* Footer / Disclaimer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-xs text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Plank is a decentralized prediction market. Trading involves significant risk. 
          Ensure you understand the mechanics of short-window markets before participating.
          Data provided by CoinAPI.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Web3Config>
      <AppContent />
    </Web3Config>
  );
}
