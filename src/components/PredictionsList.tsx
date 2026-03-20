import { useEffect, useState } from 'react';
import { Prediction, Order } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

function Countdown({ endTime }: { endTime: number }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      <span className="text-emerald-500 font-mono font-bold text-sm">
        {timeLeft}s
      </span>
    </div>
  );
}

export function PredictionsList({ predictions, orders = [], userId }: { predictions: Prediction[], orders?: Order[], userId?: string }) {
  const openOrders = orders.filter(o => o.status === 'open' && (!userId || o.userId === userId));
  const userPredictions = predictions.filter(p => !userId || p.userId === userId);

  if (userPredictions.length === 0 && openOrders.length === 0) {
    return (
      <div className="bg-[#151619] border border-white/5 rounded-xl p-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
        <p className="font-medium">No active activity</p>
        <p className="text-sm">Place a market or limit order to see it here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Open Orders */}
      {openOrders.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
            Your Open Orders
            <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px]">{openOrders.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {openOrders.map((o) => (
              <div 
                key={o.id}
                className="bg-[#151619] border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors opacity-70"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                    o.direction === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {o.direction === 'up' ? '↑' : '↓'}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm leading-tight">
                      {o.direction === 'up' ? 'BUY UP' : 'BUY DOWN'}
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                      <span>{o.amount} USDC</span>
                      <span className="text-zinc-700">•</span>
                      <span>Price: <span className="text-zinc-300 font-mono">${o.price.toFixed(2)}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                    Limit Order
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/order/${o.id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Failed to cancel order');
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="text-[9px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions (Positions) */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
          Your Positions
          <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px]">{userPredictions.length}</span>
        </h3>
        <div className="flex flex-col gap-2">
          {userPredictions.map((p) => (
            <div 
              key={p.id}
              className="bg-[#151619] border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold",
                  p.direction === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {p.direction === 'up' ? '↑' : '↓'}
                </div>
                <div>
                  <div className="text-white font-bold text-lg leading-tight">
                    {p.direction === 'up' ? 'UP' : 'DOWN'}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span>{p.amount} USDC</span>
                    <span className="text-zinc-700">•</span>
                    <span>Avg: <span className="text-zinc-300 font-mono">${p.entryPrice?.toFixed(2) || '0.50'}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {p.status === 'pending' ? (
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Time Left</div>
                    <Countdown endTime={p.endTime} />
                  </div>
                ) : (
                  <div className={cn(
                    "font-black uppercase tracking-widest text-sm px-3 py-1 rounded-full",
                    p.status === 'won' ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                  )}>
                    {p.status}
                  </div>
                )}
                <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-tighter">
                  {formatDistanceToNow(p.startTime)} ago
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
