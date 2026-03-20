export interface PriceData {
  time: number;
  price: number;
}

export interface Market {
  id: string;
  name: string;
  duration: number; // in seconds
}

export interface Order {
  id: string;
  marketId: string;
  userId: string;
  direction: 'up' | 'down';
  price: number; // 0 to 1 USDC per share
  amount: number; // total USDC to spend
  shares: number; // amount / price
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
  endTime: number;
}

export interface OrderBookEntry {
  price: number;
  shares: number;
  total: number;
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
  status: 'pending' | 'won' | 'lost';
  endPrice?: number;
  entryPrice?: number; // Price per share (0-1)
  shares?: number;
}


export const MARKETS: Market[] = [
  { id: '5s', name: '5 Seconds', duration: 5 },
  { id: '30s', name: '30 Seconds', duration: 30 },
  { id: '1m', name: '1 Minute', duration: 60 },
  { id: '5m', name: '5 Minutes', duration: 300 },
];
