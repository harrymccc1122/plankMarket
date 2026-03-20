import { useState } from 'react';
import { Terminal, Copy, Check, Play, Globe, Lock, Key } from 'lucide-react';
import { useAccount } from 'wagmi';

export function APITab() {
  const { address } = useAccount();
  const [copied, setCopied] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const testEndpoint = async (endpoint: string, method: string = 'GET', body?: any) => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ error: 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  const endpoints = [
    {
      name: 'Get Market State',
      method: 'GET',
      path: '/api/market/state',
      description: 'Returns the current BTC price, price history, and active order book.',
      example: 'fetch("/api/market/state")'
    },
    {
      name: 'Get User Orders',
      method: 'GET',
      path: `/api/orders?userId=${address || '0x...'}`,
      description: 'Returns all orders and positions for a specific user.',
      example: `fetch("/api/orders?userId=${address || '0x...'}")`
    },
    {
      name: 'Place Order',
      method: 'POST',
      path: '/api/order',
      description: 'Place a market or limit order.',
      body: {
        userId: address || '0x...',
        marketId: '1m',
        direction: 'up',
        amount: '10',
        type: 'limit',
        limitPrice: 0.55
      },
      example: 'fetch("/api/order", { method: "POST", ... })'
    },
    {
      name: 'Cancel Order',
      method: 'DELETE',
      path: '/api/order/{id}',
      description: 'Cancel an open limit order.',
      example: 'fetch("/api/order/abc-123", { method: "DELETE" })'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left Column: Documentation */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-[#151619] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">API Documentation</h2>
                <p className="text-xs text-zinc-500">Integrate Plank into your trading bots</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">v1.0 Active</span>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-8">
            {endpoints.map((ep, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono text-zinc-300">{ep.path}</code>
                  </div>
                  <button 
                    onClick={() => testEndpoint(ep.path, ep.method, ep.body)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Test
                  </button>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {ep.description}
                </p>
                <div className="relative group">
                  <pre className="bg-black/40 rounded-xl p-4 text-xs font-mono text-zinc-400 overflow-x-auto border border-white/5">
                    {ep.example}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(ep.example, `ep-${i}`)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800/50 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copied === `ep-${i}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-500 mb-1">Authentication</h3>
            <p className="text-xs text-emerald-500/60 leading-relaxed">
              Currently, the API is open for local development. In production, you'll need to sign messages with your wallet to authenticate requests.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: API Console */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-[#151619] border border-white/5 rounded-2xl flex flex-col h-full min-h-[600px]">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-zinc-500" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">API Console</h2>
            </div>
            {response && (
              <button 
                onClick={() => setResponse(null)}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 p-6 font-mono text-xs overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-3 text-zinc-500 animate-pulse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span>Executing request...</span>
              </div>
            ) : response ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-emerald-500/80">
                  <Check className="w-4 h-4" />
                  <span>200 OK</span>
                </div>
                <pre className="text-emerald-500/60 whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 text-center px-8">
                <Play className="w-8 h-8 opacity-20" />
                <p>Select an endpoint from the left to test the API in real-time.</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-black/20 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900/50 rounded-lg border border-white/5">
              <Key className="w-3.5 h-3.5 text-zinc-600" />
              <input 
                type="text" 
                readOnly 
                value={address ? `pk_${address.slice(2, 10)}...` : 'Connect wallet to see API key'}
                className="bg-transparent border-none outline-none text-[10px] font-mono text-zinc-500 w-full"
              />
              <button className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                Regen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
