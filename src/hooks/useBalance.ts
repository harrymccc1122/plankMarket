import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export function useBalance() {
  const { address } = useAccount();
  const [balance, setBalance] = useState<number>(0);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(0);
      return;
    }
    try {
      const res = await fetch(`/api/balance?userId=${address}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch { /* ignore */ }
  }, [address]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, refetch: fetchBalance };
}
