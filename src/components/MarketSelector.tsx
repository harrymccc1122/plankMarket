import { Market, MARKETS } from '../types';
import { cn } from '../lib/utils';

export function MarketSelector({ 
  selectedMarket, 
  onSelect 
}: { 
  selectedMarket: Market, 
  onSelect: (m: Market) => void 
}) {
  return (
    <div className="flex gap-2 p-1 bg-[#151619] rounded-lg border border-white/5">
      {MARKETS.map((market) => (
        <button
          key={market.id}
          onClick={() => onSelect(market)}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            selectedMarket.id === market.id 
              ? "bg-emerald-500 text-black" 
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          {market.name}
        </button>
      ))}
    </div>
  );
}
