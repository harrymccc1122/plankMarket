import { useState, useEffect } from 'react';
import { PriceData, Prediction, Order } from '../types';

export function useBTCPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<PriceData[]>([]);
  const [cycleStartPrices, setCycleStartPrices] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/market/state');
        if (!response.ok) throw new Error('Failed to fetch market state');
        const data = await response.json();
        setPrice(data.price);
        setHistory(data.history);
        setCycleStartPrices(data.cycleStartPrices);
        setOrders(data.orders);
        setPredictions(data.predictions);
        setError(null);
      } catch (error) {
        console.error('Error fetching market state:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch market state');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300);
    return () => clearInterval(interval);
  }, []);

  return { price, history, cycleStartPrices, orders, predictions, error };
}
