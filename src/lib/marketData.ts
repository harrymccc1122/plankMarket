import { MARKETS, Order, Prediction, PriceData } from '../types';

const BINANCE_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1s&limit=60';

type MarketState = {
  price: number | null;
  history: PriceData[];
  cycleStartPrices: Record<string, number>;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getLiveMarketState(now = Date.now()): Promise<MarketState> {
  const [ticker, klines] = await Promise.all([
    fetchJson<{ price: string }>(BINANCE_PRICE_URL),
    fetchJson<Array<[number, string, string, string, string, string, number, string, number, string, string, string]>>(BINANCE_KLINES_URL),
  ]);

  const livePrice = Number(ticker.price);
  const history = klines
    .map((entry) => ({
      time: Number(entry[0]),
      price: Number(entry[4]),
    }))
    .filter((entry) => Number.isFinite(entry.price));

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
