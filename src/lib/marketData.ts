import { MARKETS, Order, Prediction, PriceData } from '../types';

const COINAPI_BASE = 'https://rest.coinapi.io/v1';
const CACHE_TTL_MS = 9_000;
const MAX_HISTORY_POINTS = 360; // 6 minutes of 1-sec data

type MarketState = {
  price: number | null;
  history: PriceData[];
  cycleStartPrices: Record<string, number>;
};

declare global {
  var __plankPriceHistory: PriceData[] | undefined;
  var __plankMarketCache: { state: MarketState; at: number } | undefined;
}

function getPriceHistory(): PriceData[] {
  if (!globalThis.__plankPriceHistory) globalThis.__plankPriceHistory = [];
  return globalThis.__plankPriceHistory;
}

async function fetchJson<T>(url: string): Promise<T> {
  const apiKey = process.env.COINAPI_KEY;
  if (!apiKey) throw new Error('COINAPI_KEY is not configured');

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'X-CoinAPI-Key': apiKey },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function fetchExchangeRate(): Promise<number> {
  const data = await fetchJson<{ rate: number }>(`${COINAPI_BASE}/exchangerate/BTC/USD`);
  return Number(data.rate);
}

async function fetchOHLCVHistory(): Promise<PriceData[]> {
  type OHLCVEntry = { time_period_start: string; price_close: number };
  const ohlcv = await fetchJson<OHLCVEntry[]>(
    `${COINAPI_BASE}/ohlcv/BITSTAMP_SPOT_BTC_USD/latest?period_id=1SEC&limit=60`,
  );
  return ohlcv
    .map(e => ({ time: new Date(e.time_period_start).getTime(), price: Number(e.price_close) }))
    .filter(e => Number.isFinite(e.price) && e.time > 0)
    .sort((a, b) => a.time - b.time);
}

function buildMarketState(livePrice: number, now: number): MarketState {
  const history = getPriceHistory();

  const cutoff = now - 60_000;
  const recentHistory = history.filter(p => p.time >= cutoff);

  const cycleStartPrices = Object.fromEntries(
    MARKETS.map(market => {
      const durationMs = market.duration * 1000;
      const cycleStart = Math.floor(now / durationMs) * durationMs;
      const startPoint = recentHistory.find(p => p.time >= cycleStart) ?? recentHistory[0];
      return [market.id, startPoint?.price ?? livePrice];
    }),
  );

  return { price: livePrice, history: recentHistory, cycleStartPrices };
}

export async function getLiveMarketState(now = Date.now()): Promise<MarketState> {
  // Return cached result if still fresh — all callers share this cache
  const cache = globalThis.__plankMarketCache;
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.state;
  }

  const history = getPriceHistory();

  let livePrice: number;

  if (history.length === 0) {
    // First call: fetch both to seed history (2 credits, happens once)
    console.log('[MarketData] Initial load — fetching exchange rate + OHLCV history');
    const [rate, seedHistory] = await Promise.all([fetchExchangeRate(), fetchOHLCVHistory()]);
    livePrice = rate;
    history.push(...seedHistory);
  } else {
    // Subsequent calls: exchange rate only (1 credit per interval)
    livePrice = await fetchExchangeRate();
    history.push({ time: now, price: livePrice });

    // Trim to rolling window
    const cutoff = now - MAX_HISTORY_POINTS * 1_000;
    const trimIdx = history.findIndex(p => p.time > cutoff);
    if (trimIdx > 0) history.splice(0, trimIdx);
    if (history.length > MAX_HISTORY_POINTS) history.splice(0, history.length - MAX_HISTORY_POINTS);
  }

  const state = buildMarketState(livePrice, now);
  globalThis.__plankMarketCache = { state, at: now };
  return state;
}

export function settlePredictions(predictions: Prediction[], latestPrice: number | null, now = Date.now()): Prediction[] {
  if (!latestPrice) return predictions;

  return predictions.map(prediction => {
    if (prediction.status !== 'pending' || now < prediction.endTime) return prediction;

    const won = prediction.direction === 'up'
      ? latestPrice > prediction.startPrice
      : latestPrice < prediction.startPrice;

    return { ...prediction, status: won ? 'won' : 'lost', endPrice: latestPrice };
  });
}

export function expireOrders(orders: Order[], now = Date.now()): Order[] {
  return orders.map(order => {
    if (order.status === 'open' && now >= order.endTime) {
      return { ...order, status: 'cancelled' as const };
    }
    return order;
  });
}
