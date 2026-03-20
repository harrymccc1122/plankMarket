import { useCallback, useEffect, useState } from 'react';
import { MarketStateResponse } from '../types';

const EMPTY_STATE: MarketStateResponse = {
  price: null,
  priceUpdatedAt: null,
  priceSource: 'fallback',
  history: [],
  cycleStartPrices: {},
  orders: [],
  predictions: [],
};

export function useBTCPrice() {
  const [state, setState] = useState<MarketStateResponse>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/market/state', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch market state');
      }
      setState(data);
      setError(null);
    } catch (fetchError) {
      console.error('Error fetching market state:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch market state');
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...state, error, refresh };
}
