import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Zap, AlertCircle, ExternalLink } from 'lucide-react';

export function Header() {
  const hasApiKey = !!import.meta.env.VITE_COINAPI_API_KEY;

  return (
    <header className="flex flex-col border-b border-white/5 bg-[#050505]">
      {!hasApiKey && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-center gap-2 text-amber-500 text-xs font-medium">
          <AlertCircle className="w-3 h-3" />
          <span>Missing VITE_COINAPI_API_KEY in Secrets. Price feed will not work.</span>
        </div>
      )}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Zap className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">PLANK</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <ExternalLink className="w-3 h-3" />
            <span>Wallet issues? Open in new tab</span>
          </div>
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
