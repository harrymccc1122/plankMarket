import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, ArrowDownToLine, ArrowUpFromLine, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { cn } from '../lib/utils';

type Tab = 'deposit' | 'withdraw';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onBalanceChange: () => void;
}

export function WalletModal({ isOpen, onClose, balance, onBalanceChange }: WalletModalProps) {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>('deposit');
  const [depositAddress, setDepositAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawTx, setWithdrawTx] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [loadingDeposit, setLoadingDeposit] = useState(false);

  const fetchDepositAddress = useCallback(async () => {
    if (!address) return;
    setLoadingDeposit(true);
    try {
      const res = await fetch(`/api/deposit-address?userId=${address}`);
      const data = await res.json();
      setDepositAddress(data.depositAddress || '');
    } catch {
      setDepositAddress('');
    } finally {
      setLoadingDeposit(false);
    }
  }, [address]);

  useEffect(() => {
    if (isOpen && address) {
      fetchDepositAddress();
      if (address) {
        setWithdrawTo(address);
      }
    }
  }, [isOpen, address, fetchDepositAddress]);

  useEffect(() => {
    if (!isOpen) {
      setWithdrawTx(null);
      setWithdrawError(null);
      setWithdrawAmount('');
    }
  }, [isOpen]);

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    if (!address || !withdrawAmount || !withdrawTo) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (amt > balance) {
      setWithdrawError('Amount exceeds your balance');
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawTx(null);

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: address, toAddress: withdrawTo, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');
      setWithdrawTx(data.txHash);
      onBalanceChange();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#111214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Wallet</h2>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance */}
        <div className="px-6 py-6 flex flex-col items-center gap-1 border-b border-white/5">
          <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">USDC Balance</div>
          <div className="text-4xl font-mono font-bold text-white">{balance.toFixed(2)}</div>
          <div className="text-sm text-zinc-500">on Polygon</div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setTab('deposit')}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
              tab === 'deposit' ? "text-white border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Deposit
          </button>
          <button
            onClick={() => setTab('withdraw')}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
              tab === 'withdraw' ? "text-white border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tab === 'deposit' ? (
            <div className="flex flex-col gap-5">
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                <p className="text-xs text-emerald-400 leading-relaxed">
                  Send <span className="font-bold">USDC</span> on the <span className="font-bold">Polygon</span> network to the address below. Your balance will update automatically after the transaction is confirmed.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Deposit Address (Polygon)
                </label>
                {loadingDeposit ? (
                  <div className="h-12 bg-black/40 border border-white/10 rounded-xl animate-pulse" />
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-zinc-300 overflow-hidden text-ellipsis">
                      {depositAddress || 'Unavailable'}
                    </div>
                    <button
                      onClick={copyAddress}
                      className="px-4 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copy"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs text-zinc-500">
                <div className="bg-black/30 rounded-xl p-3">
                  <div className="font-bold text-white mb-1">Token</div>
                  <div>USDC</div>
                </div>
                <div className="bg-black/30 rounded-xl p-3">
                  <div className="font-bold text-white mb-1">Network</div>
                  <div>Polygon</div>
                </div>
                <div className="bg-black/30 rounded-xl p-3">
                  <div className="font-bold text-white mb-1">Min</div>
                  <div>Any</div>
                </div>
              </div>

              <button
                onClick={() => { fetchDepositAddress(); onBalanceChange(); }}
                className="flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh balance
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {withdrawTx ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-white mb-1">Withdrawal Submitted</div>
                    <div className="text-xs text-zinc-500">Your USDC is on its way</div>
                  </div>
                  <a
                    href={`https://polygonscan.com/tx/${withdrawTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    View on Polygonscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => { setWithdrawTx(null); setWithdrawAmount(''); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Make another withdrawal
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount (USDC)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors pr-24"
                      />
                      <button
                        onClick={() => setWithdrawAmount(balance.toFixed(2))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded-lg"
                      >
                        Max
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-600">Available: {balance.toFixed(2)} USDC</div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">To Address (Polygon)</label>
                    <input
                      type="text"
                      value={withdrawTo}
                      onChange={e => setWithdrawTo(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {withdrawError && (
                    <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {withdrawError}
                    </div>
                  )}

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || !withdrawTo || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {withdrawing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4" />
                        Withdraw USDC
                      </>
                    )}
                  </button>

                  <div className="text-[10px] text-zinc-600 text-center">
                    Gas fees on Polygon are paid by Plank. Min withdrawal: 1 USDC.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
