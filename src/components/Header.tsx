import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Radio, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';

interface HeaderProps {
  marketError?: string | null;
  balance: number;
  onOpenWallet: () => void;
}

export function Header({ marketError, balance, onOpenWallet }: HeaderProps) {
  const { isConnected } = useAccount();

  return (
    <header className="flex flex-col border-b border-white/5 bg-[#050505]">
      {marketError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-center gap-2 text-amber-500 text-xs font-medium">
          <Radio className="w-3 h-3" />
          <span>Live market data is temporarily unavailable: {marketError}</span>
        </div>
      )}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Radio className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">PLANK</h1>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
            >
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="font-mono font-bold text-white text-sm">{balance.toFixed(2)}</span>
              <span className="text-[10px] text-zinc-500 font-bold">USDC</span>
            </button>
          )}
          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
