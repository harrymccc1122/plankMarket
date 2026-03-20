import { MARKETS, Order, Prediction, PriceData } from '../types';

const COINAPI_BASE = 'https://rest.coinapi.io/v1';

type MarketState = {
  price: number | null;
  history: PriceData[];
  cycleStartPrices: Record<string, number>;
};

async function fetchJson<T>(url: string): Promise<T> {
  const apiKey = process.env.COINAPI_KEY;
  if (!apiKey) {
    throw new Error('COINAPI_KEY is not configured');
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-CoinAPI-Key': apiKey,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getLiveMarketState(now = Date.now()): Promise<MarketState> {
  type ExchangeRate = { rate: number; time: string };
  type OHLCVEntry = {
    time_period_start: string;
    time_period_end: string;
    price_close: number;
    price_open: number;
  };

  const [rate, ohlcv] = await Promise.all([
    fetchJson<ExchangeRate>(`${COINAPI_BASE}/exchangerate/BTC/USD`),
    fetchJson<OHLCVEntry[]>(`${COINAPI_BASE}/ohlcv/BITSTAMP_SPOT_BTC_USD/latest?period_id=1SEC&limit=60`),
  ]);

  const livePrice = Number(rate.rate);

  const history: PriceData[] = ohlcv
    .map((entry) => ({
      time: new Date(entry.time_period_start).getTime(),
      price: Number(entry.price_close),
    }))
    .filter((entry) => Number.isFinite(entry.price) && entry.time > 0)
    .sort((a, b) => a.time - b.time);

  const latestPrice = Number.isFinite(livePrice)
    ? livePrice
    : history.length > 0
      ? history[history.length - 1].price
      : null;

  const cycleStartPrices = Object.fromEntries(
    MARKETS.map((market) => {
      const durationMs = market.duration * 1000;
      const cycleStart = Math.floor(now / durationMs) * durationMs;
      const startPoint = history.find((point) => point.time >= cycleStart) ?? history[0];
      return [market.id, startPoint?.price ?? latestPrice ?? 0];
    }),
  );

  return {
    price: latestPrice,
    history,
    cycleStartPrices,
  };
}

export function settlePredictions(predictions: Prediction[], latestPrice: number | null, now = Date.now()): Prediction[] {
  if (!latestPrice) return predictions;

  return predictions.map((prediction) => {
    if (prediction.status !== 'pending' || now < prediction.endTime) {
      return prediction;
    }

    const won = prediction.direction === 'up'
      ? latestPrice > prediction.startPrice
      : latestPrice < prediction.startPrice;

    return {
      ...prediction,
      status: won ? 'won' : 'lost',
      endPrice: latestPrice,
    };
  });
}

export function expireOrders(orders: Order[], now = Date.now()): Order[] {
  return orders.map((order) => {
    if (order.status === 'open' && now >= order.endTime) {
      return { ...order, status: 'cancelled' as const };
    }
    return order;
  });
}
