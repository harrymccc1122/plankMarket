import { MARKETS, MarketStateResponse, Order, Prediction, PriceData } from '../types';

type StoredMarketState = MarketStateResponse & { version: number };

type PlaceOrderInput = {
  userId: string;
  marketId: string;
  direction: 'up' | 'down';
  amount: number;
  type: 'market' | 'limit';
  limitPrice?: number;
};

const STATE_KEY = 'plank-market-state';
const PRICE_URL = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';
const PRICE_TTL_MS = 2_000;
const HISTORY_LIMIT = 180;
const MEMORY_KEY = '__PLANK_MARKET_STATE__';

function getMemoryState(): StoredMarketState {
  const globalState = globalThis as typeof globalThis & { [MEMORY_KEY]?: StoredMarketState };
  if (!globalState[MEMORY_KEY]) {
    globalState[MEMORY_KEY] = createDefaultState();
  }
  return globalState[MEMORY_KEY]!;
}

function createDefaultState(): StoredMarketState {
  return {
    version: 1,
    price: null,
    priceUpdatedAt: null,
    priceSource: 'fallback',
    history: [],
    cycleStartPrices: {},
    orders: [],
    predictions: [],
  };
}

async function readState(): Promise<StoredMarketState> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return getMemoryState();
  }

  const response = await fetch(`${kvUrl}/get/${STATE_KEY}`, {
    headers: { Authorization: `Bearer ${kvToken}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to read persisted state: ${response.status}`);
  }

  const payload = await response.json() as { result?: string | null };
  if (!payload.result) {
    return createDefaultState();
  }

  return JSON.parse(payload.result) as StoredMarketState;
}

async function writeState(state: StoredMarketState): Promise<void> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    const globalState = globalThis as typeof globalThis & { [MEMORY_KEY]?: StoredMarketState };
    globalState[MEMORY_KEY] = state;
    return;
  }

  const response = await fetch(`${kvUrl}/set/${STATE_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: JSON.stringify(state) }),
  });

  if (!response.ok) {
    throw new Error(`Failed to write persisted state: ${response.status}`);
  }
}

async function fetchLatestPrice(previousPrice: number | null): Promise<{ price: number, source: 'exchange' | 'fallback' }> {
  try {
    const response = await fetch(PRICE_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Coinbase price request failed: ${response.status}`);
  }

    const payload = await response.json() as { data?: { amount?: string } };
    const amount = Number(payload.data?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Received invalid BTC price from Coinbase');
    }

    return { price: amount, source: 'exchange' };
  } catch {
    const basePrice = previousPrice && Number.isFinite(previousPrice) ? previousPrice : 85000;
    const drift = (Math.random() - 0.5) * Math.max(basePrice * 0.0008, 15);
    return { price: Number((basePrice + drift).toFixed(2)), source: 'fallback' };
  }
}

function computeCycleStartPrice(history: PriceData[], cycleStartTime: number, fallbackPrice: number): number {
  const match = history.find((entry) => entry.time >= cycleStartTime);
  return match?.price ?? fallbackPrice;
}

function normalizeState(state: StoredMarketState, now: number): StoredMarketState {
  state.orders = state.orders.map((order) => {
    if ((order.status === 'open' || order.status === 'partial') && now >= order.endTime) {
      return { ...order, status: 'cancelled', remainingAmount: 0 };
    }
    return order;
  });

  state.predictions = state.predictions.map((prediction) => {
    if (prediction.status !== 'pending' || now < prediction.endTime || state.price == null) {
      return prediction;
    }

    const won = prediction.direction === 'up'
      ? state.price > prediction.startPrice
      : state.price < prediction.startPrice;

    return {
      ...prediction,
      status: won ? 'won' : 'lost',
      endPrice: state.price,
      settledAt: now,
    };
  });

  for (const market of MARKETS) {
    if (state.price == null) continue;
    const durationMs = market.duration * 1000;
    const cycleStartTime = Math.floor(now / durationMs) * durationMs;
    state.cycleStartPrices[market.id] = computeCycleStartPrice(state.history, cycleStartTime, state.price);
  }

  return state;
}

async function ensureFreshState(forceRefresh = false): Promise<StoredMarketState> {
  const state = normalizeState(await readState(), Date.now());
  const now = Date.now();
  const shouldRefresh = forceRefresh || state.priceUpdatedAt == null || now - state.priceUpdatedAt >= PRICE_TTL_MS;

  if (!shouldRefresh) {
    return state;
  }

  const latestQuote = await fetchLatestPrice(state.price);
  state.price = latestQuote.price;
  state.priceUpdatedAt = now;
  state.priceSource = latestQuote.source;

  const previousPoint = state.history[state.history.length - 1];
  if (!previousPoint || now - previousPoint.time >= 1000) {
    state.history.push({ time: now, price: latestQuote.price });
  } else {
    previousPoint.price = latestQuote.price;
    previousPoint.time = now;
  }

  if (state.history.length > HISTORY_LIMIT) {
    state.history = state.history.slice(-HISTORY_LIMIT);
  }

  normalizeState(state, now);
  await writeState(state);
  return state;
}

function serializeState(state: StoredMarketState): MarketStateResponse {
  return {
    price: state.price,
    priceUpdatedAt: state.priceUpdatedAt,
    history: state.history,
    cycleStartPrices: state.cycleStartPrices,
    orders: state.orders.filter((order) => order.status === 'open' || order.status === 'partial'),
    predictions: state.predictions,
  };
}

export async function getMarketState(): Promise<MarketStateResponse> {
  return serializeState(await ensureFreshState());
}

export async function getUserActivity(userId: string) {
  const state = await ensureFreshState();
  return {
    orders: state.orders.filter((order) => order.userId === userId),
    predictions: state.predictions.filter((prediction) => prediction.userId === userId),
  };
}

export async function placeOrder(input: PlaceOrderInput) {
  const state = await ensureFreshState(true);
  const market = MARKETS.find((entry) => entry.id === input.marketId);
  if (!market) {
    throw new Error('Invalid market');
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const now = Date.now();
  const durationMs = market.duration * 1000;
  const endTime = Math.ceil(now / durationMs) * durationMs;
  const startPrice = state.cycleStartPrices[input.marketId] ?? state.price;

  if (state.price == null || startPrice == null) {
    throw new Error('Live price is unavailable');
  }

  if (input.type === 'limit') {
    if (!Number.isFinite(input.limitPrice) || input.limitPrice! <= 0.01 || input.limitPrice! >= 0.99) {
      throw new Error('Limit price must be between 0.01 and 0.99');
    }

    const limitOrder: Order = {
      id: crypto.randomUUID(),
      marketId: input.marketId,
      userId: input.userId,
      direction: input.direction,
      price: Number(input.limitPrice!.toFixed(2)),
      amount: Number(input.amount.toFixed(2)),
      shares: Number((input.amount / input.limitPrice!).toFixed(6)),
      remainingAmount: Number(input.amount.toFixed(2)),
      status: 'open',
      timestamp: now,
      endTime,
    };

    state.orders.push(limitOrder);
    await writeState(state);
    return { order: limitOrder };
  }

  const oppositeDirection = input.direction === 'up' ? 'down' : 'up';
  const matchingOrders = state.orders
    .filter((order) =>
      (order.status === 'open' || order.status === 'partial') &&
      order.marketId === input.marketId &&
      order.direction === oppositeDirection &&
      order.endTime === endTime,
    )
    .sort((left, right) => right.price - left.price);

  let remainingAmount = input.amount;
  let filledAmount = 0;
  let totalShares = 0;
  let weightedPrice = 0;

  for (const makerOrder of matchingOrders) {
    if (remainingAmount <= 0) break;

    const takerPrice = Number((1 - makerOrder.price).toFixed(2));
    const fillAmount = Math.min(remainingAmount, makerOrder.remainingAmount);
    const fillShares = fillAmount / takerPrice;

    makerOrder.remainingAmount = Number((makerOrder.remainingAmount - fillAmount).toFixed(2));
    makerOrder.status = makerOrder.remainingAmount <= 0 ? 'filled' : 'partial';

    remainingAmount = Number((remainingAmount - fillAmount).toFixed(2));
    filledAmount = Number((filledAmount + fillAmount).toFixed(2));
    totalShares += fillShares;
    weightedPrice += fillAmount * takerPrice;
  }

  if (filledAmount <= 0) {
    throw new Error('No matching liquidity available for this market order');
  }

  const prediction: Prediction = {
    id: crypto.randomUUID(),
    userId: input.userId,
    marketId: input.marketId,
    startTime: now,
    endTime,
    startPrice,
    direction: input.direction,
    amount: filledAmount.toFixed(2),
    shares: Number(totalShares.toFixed(6)),
    status: 'pending',
    entryPrice: Number((weightedPrice / filledAmount).toFixed(4)),
  };

  state.predictions.push(prediction);
  await writeState(state);

  return {
    prediction,
    filledAmount,
    unfilledAmount: Number(remainingAmount.toFixed(2)),
  };
}

export async function cancelOrder(orderId: string) {
  const state = await ensureFreshState();
  const order = state.orders.find((entry) => entry.id === orderId && (entry.status === 'open' || entry.status === 'partial'));
  if (!order) {
    throw new Error('Order not found or already closed');
  }

  order.status = 'cancelled';
  order.remainingAmount = 0;
  await writeState(state);
  return { success: true, order };
}
