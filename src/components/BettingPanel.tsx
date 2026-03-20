import { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, Wallet, Clock, Info, PlusCircle } from 'lucide-react';
import { Market, Order } from '../types';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { cn } from '../lib/utils';

export function BettingPanel({ 
  market, 
  currentPrice,
  lockInPrice,
  onBet,
  orders,
  balance,
  onOpenWallet,
}: { 
  market: Market, 
  currentPrice: number | null,
  lockInPrice: number | null,
  onBet: (direction: 'up' | 'down', amount: string, type: 'market' | 'limit', limitPrice?: number) => void,
  orders: Order[],
  balance: number,
  onOpenWallet: () => void,
}) {
  const [amount, setAmount] = useState('10');
  const [limitPrice, setLimitPrice] = useState('0.50');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [timeLeft, setTimeLeft] = useState(0);
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const durationMs = market.duration * 1000;
      const nextCycleEnd = Math.ceil(now / durationMs) * durationMs;
      setTimeLeft(Math.max(0, nextCycleEnd - now));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [market.duration]);

  const secondsLeft = (timeLeft / 1000).toFixed(1);
  const isLocked = timeLeft < 1000;

  const [isPlacing, setIsPlacing] = useState<'up' | 'down' | null>(null);

  const handleBetClick = async (direction: 'up' | 'down') => {
    setIsPlacing(direction);
    onBet(direction, amount, orderType, orderType === 'limit' ? parseFloat(limitPrice) : undefined);
    setTimeout(() => setIsPlacing(null), 500);
  };

  const orderBook = useMemo(() => {
    const now = Date.now();
    const durationMs = market.duration * 1000;
    const currentCycleEnd = Math.ceil(now / durationMs) * durationMs;

    const activeOrders = orders.filter(o => 
      o.marketId === market.id && 
      o.status === 'open' &&
      o.endTime === currentCycleEnd
    );

    const upOrders = activeOrders.filter(o => o.direction === 'up').sort((a, b) => b.price - a.price);
    const downOrders = activeOrders.filter(o => o.direction === 'down').sort((a, b) => b.price - a.price);

    return { upOrders, downOrders };
  }, [orders, market.id, market.duration]);

  const payout = orderType === 'limit' 
    ? parseFloat(amount) / parseFloat(limitPrice)
    : parseFloat(amount) * 2; // Simplified market payout for UI

  return (
    <div className="bg-[#151619] border border-white/5 rounded-xl p-6 flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Current Price
          </label>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-mono font-bold text-white">
              {currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Live</span>
            </div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 flex flex-col items-end min-w-[120px] self-start sm:self-center">
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Next Expiry
          </div>
          <div className={cn(
            "text-xl font-mono font-bold",
            parseFloat(secondsLeft) < 2 ? "text-rose-500" : "text-emerald-500"
          )}>
            {secondsLeft}s
          </div>
        </div>
      </div>

      {lockInPrice && (
        <div className="text-[10px] text-zinc-500 -mt-4 flex items-center gap-2">
          <span className="uppercase font-bold tracking-tighter text-zinc-600">Cycle Start Price</span>
          <span className="text-zinc-300 font-mono">${lockInPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {/* Order Type Tabs */}
      <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
        <button
          onClick={() => setOrderType('market')}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
            orderType === 'market' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all",
            orderType === 'limit' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Limit
        </button>
      </div>

      {/* Order Book */}
      <div className="flex flex-col gap-2 bg-black/40 rounded-xl p-4 border border-white/5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Order Book</span>
          <Info className="w-3 h-3 text-zinc-600 cursor-help" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* UP Book */}
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-emerald-500/50 font-bold uppercase mb-1">Buy UP</div>
            <div className="flex flex-col gap-1 min-h-[60px]">
              {orderBook.upOrders.length === 0 ? (
                <div className="text-[9px] text-zinc-700 italic">No orders</div>
              ) : (
                orderBook.upOrders.slice(0, 5).map(o => (
                  <div key={o.id} className="flex justify-between font-mono text-[9px]">
                    <span className="text-emerald-500">${o.price.toFixed(2)}</span>
                    <span className="text-zinc-500">{o.shares.toFixed(1)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* DOWN Book */}
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-rose-500/50 font-bold uppercase mb-1">Buy DOWN</div>
            <div className="flex flex-col gap-1 min-h-[60px]">
              {orderBook.downOrders.length === 0 ? (
                <div className="text-[9px] text-zinc-700 italic">No orders</div>
              ) : (
                orderBook.downOrders.slice(0, 5).map(o => (
                  <div key={o.id} className="flex justify-between font-mono text-[9px]">
                    <span className="text-rose-500">${o.price.toFixed(2)}</span>
                    <span className="text-zinc-500">{o.shares.toFixed(1)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-4">
        {orderType === 'limit' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Limit Price (USDC)
            </label>
            <div className="relative">
              <input 
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold uppercase">
                Per Share
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Amount (USDC)
            </label>
            <div className="text-[10px] text-zinc-500">
              Est. Shares: <span className="text-emerald-500 font-bold">{orderType === 'limit' ? (parseFloat(amount) / parseFloat(limitPrice)).toFixed(2) : '---'}</span>
            </div>
          </div>
          <div className="relative">
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
              USDC
            </div>
          </div>
        </div>
      </div>

      {!isConnected ? (
        <button
          onClick={openConnectModal}
          className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet to Trade
        </button>
      ) : balance < parseFloat(amount || '0') ? (
        <button
          onClick={onOpenWallet}
          className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Deposit USDC to Trade
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleBetClick('up')}
            disabled={!currentPrice || isLocked || isPlacing !== null}
            className="flex flex-col items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl py-6 transition-all group disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {isLocked && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">Locked</div>}
            {isPlacing === 'up' && <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-emerald-500">Processing...</div>}
            <ArrowUp className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-emerald-500 uppercase tracking-widest text-sm">Buy UP</span>
          </button>

          <button
            onClick={() => handleBetClick('down')}
            disabled={!currentPrice || isLocked || isPlacing !== null}
            className="flex flex-col items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl py-6 transition-all group disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          >
            {isLocked && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">Locked</div>}
            {isPlacing === 'down' && <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-rose-500">Processing...</div>}
            <ArrowDown className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-rose-500 uppercase tracking-widest text-sm">Buy DOWN</span>
          </button>
        </div>
      )}

      <div className="text-[10px] text-zinc-600 text-center leading-tight">
        By placing an order, you agree to the terms of the decentralized prediction market.
      </div>
    </div>
  );
}
