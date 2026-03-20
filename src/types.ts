export interface PriceData {
  time: number;
  price: number;
}

export interface Market {
  id: string;
  name: string;
  duration: number;
}

export interface Order {
  id: string;
  marketId: string;
  userId: string;
  direction: 'up' | 'down';
  price: number;
  amount: number;
  shares: number;
  remainingAmount: number;
  status: 'open' | 'filled' | 'cancelled' | 'partial';
  timestamp: number;
  endTime: number;
}

export interface Prediction {
  id: string;
  userId: string;
  marketId: string;
  startTime: number;
  endTime: number;
  startPrice: number;
  direction: 'up' | 'down';
  amount: string;
  shares: number;
  status: 'pending' | 'won' | 'lost';
  endPrice?: number;
  entryPrice?: number;
  settledAt?: number;
}

export interface MarketStateResponse {
  price: number | null;
  priceUpdatedAt: number | null;
  priceSource?: 'exchange' | 'fallback';
  history: PriceData[];
  cycleStartPrices: Record<string, number>;
  orders: Order[];
  predictions: Prediction[];
}

export const MARKETS: Market[] = [
  { id: '5s', name: '5 Seconds', duration: 5 },
  { id: '30s', name: '30 Seconds', duration: 30 },
  { id: '1m', name: '1 Minute', duration: 60 },
  { id: '5m', name: '5 Minutes', duration: 300 },
];
