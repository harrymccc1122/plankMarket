import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ExternalLink, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="flex flex-col border-b border-white/5 bg-[#050505]">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Zap className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-white">PLANK</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">BTC micro-markets</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a href={typeof window !== 'undefined' ? window.location.href : '#'} target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:text-zinc-300 transition-colors">
            <ExternalLink className="w-3 h-3" />
            <span>Open in new tab if wallet popups are blocked</span>
          </a>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
