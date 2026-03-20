import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { APITab } from './components/APITab';
import { BettingPanel } from './components/BettingPanel';
import { Header } from './components/Header';
import { MarketSelector } from './components/MarketSelector';
import { PredictionsList } from './components/PredictionsList';
import { PriceChart } from './components/PriceChart';
import { Web3Config } from './components/Web3Config';
import { useBTCPrice } from './hooks/useBTCPrice';
import { Market, MARKETS } from './types';

function AppContent() {
  const { price, priceUpdatedAt, priceSource, history, cycleStartPrices, orders, predictions, error, refresh } = useBTCPrice();
  const { address } = useAccount();
  const [selectedMarket, setSelectedMarket] = useState<Market>(MARKETS[0]);
  const [activeTab, setActiveTab] = useState<'trade' | 'api'>('trade');

  const handleBet = useCallback(async (direction: 'up' | 'down', amount: string, type: 'market' | 'limit', limitPrice?: number) => {
    if (!address) return { ok: false, message: 'Connect a wallet first.' };

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
          limitPrice,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to place order');
      }

      await refresh();
      return {
        ok: true,
        message: payload.order ? 'Limit order posted to the book.' : `Trade filled for ${payload.filledAmount} USDC.`,
      };
    } catch (tradeError) {
      console.error('Error placing order:', tradeError);
      return {
        ok: false,
        message: tradeError instanceof Error ? tradeError.message : 'Failed to place order',
      };
    }
  }, [address, selectedMarket.id, refresh]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    const response = await fetch(`/api/order?id=${encodeURIComponent(orderId)}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to cancel order');
    }
    await refresh();
  }, [refresh]);

  const cycleStartPrice = cycleStartPrices[selectedMarket.id] || null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
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
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">BTC / USD</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {priceUpdatedAt
                      ? `Last backend price refresh: ${new Date(priceUpdatedAt).toLocaleTimeString()} (${priceSource === 'exchange' ? 'exchange feed' : 'fallback simulation'})`
                      : 'Waiting for the first live BTC quote.'}
                  </p>
                </div>
                <MarketSelector selectedMarket={selectedMarket} onSelect={setSelectedMarket} />
              </div>

              {error && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  Market feed warning: {error}
                </div>
              )}

              <PriceChart data={history} activePredictions={predictions.filter((p) => p.marketId === selectedMarket.id)} cycleStartPrice={cycleStartPrice} />

              <div className="hidden lg:block">
                <PredictionsList predictions={predictions} orders={orders} userId={address} onCancelOrder={handleCancelOrder} />
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <BettingPanel
                market={selectedMarket}
                currentPrice={price}
                lockInPrice={cycleStartPrice}
                onBet={handleBet}
                orders={orders}
              />

              <div className="lg:hidden">
                <PredictionsList predictions={predictions} orders={orders} userId={address} onCancelOrder={handleCancelOrder} />
              </div>

              <div className="bg-[#151619] border border-white/5 rounded-xl p-6">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Market Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500">Open Orders</div>
                    <div className="text-lg font-mono font-bold">{orders.filter((order) => order.marketId === selectedMarket.id).length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Live Positions</div>
                    <div className="text-lg font-mono font-bold">{predictions.filter((prediction) => prediction.marketId === selectedMarket.id && prediction.status === 'pending').length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <APITab />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-xs text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          Plank is a short-duration BTC prediction market interface. Trades are routed through the backend order book,
          settle automatically at expiry, and use Coinbase spot pricing for live market data.
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
