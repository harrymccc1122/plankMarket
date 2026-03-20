import { MARKETS, Order, Prediction } from '../types';
import { expireOrders, getLiveMarketState, settlePredictions } from './marketData';
import { creditBalance } from './balanceStore';

type Store = {
  orders: Order[];
  predictions: Prediction[];
  settledIds: Set<string>;
};

declare global {
  var __plankStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__plankStore) {
    globalThis.__plankStore = { orders: [], predictions: [], settledIds: new Set() };
  }
  if (!globalThis.__plankStore.settledIds) {
    globalThis.__plankStore.settledIds = new Set();
  }
  return globalThis.__plankStore;
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function creditSettledPredictions(predictions: Prediction[], store: Store) {
  for (const p of predictions) {
    if ((p.status === 'won' || p.status === 'lost') && !store.settledIds.has(p.id)) {
      store.settledIds.add(p.id);
      if (p.status === 'won' && p.shares) {
        creditBalance(p.userId, p.shares);
        console.log(`[TradeStore] Prediction ${p.id} WON: credited ${p.shares.toFixed(4)} USDC to ${p.userId}`);
      }
    }
  }
}

export async function getMarketSnapshot() {
  const store = getStore();
  const marketState = await getLiveMarketState();
  const now = Date.now();

  store.orders = expireOrders(store.orders, now);
  store.predictions = settlePredictions(store.predictions, marketState.price, now);

  creditSettledPredictions(store.predictions, store);

  return {
    ...marketState,
    orders: store.orders.filter((order) => order.status === 'open'),
    predictions: store.predictions,
  };
}

export async function getUserOrders(userId: string) {
  await getMarketSnapshot();
  const store = getStore();
  return {
    orders: store.orders.filter((order) => order.userId === userId),
    predictions: store.predictions.filter((prediction) => prediction.userId === userId),
  };
}

export async function createOrder(input: {
  userId: string;
  marketId: string;
  direction: 'up' | 'down';
  amount: number;
  type: 'market' | 'limit';
  limitPrice?: number;
}) {
  const store = getStore();
  const snapshot = await getMarketSnapshot();
  const market = MARKETS.find((entry) => entry.id === input.marketId);

  if (!market) {
    throw new Error('Invalid market');
  }

  if (!snapshot.price || !snapshot.cycleStartPrices[input.marketId]) {
    throw new Error('Live price unavailable');
  }

  const now = Date.now();
  const durationMs = market.duration * 1000;
  const endTime = Math.ceil(now / durationMs) * durationMs;

  if (input.type === 'limit') {
    if (typeof input.limitPrice !== 'number' || input.limitPrice <= 0 || input.limitPrice >= 1) {
      throw new Error('limitPrice must be between 0 and 1');
    }

    const order: Order = {
      id: makeId('ord'),
      marketId: input.marketId,
      userId: input.userId,
      direction: input.direction,
      price: input.limitPrice,
      amount: input.amount,
      shares: input.amount / input.limitPrice,
      status: 'open',
      timestamp: now,
      endTime,
    };

    store.orders.push(order);
    return { order };
  }

  const basis = snapshot.price >= snapshot.cycleStartPrices[input.marketId] ? 0.56 : 0.44;
  const entryPrice = input.direction === 'up' ? basis : 1 - basis;
  const prediction: Prediction = {
    id: makeId('pred'),
    userId: input.userId,
    marketId: input.marketId,
    startTime: now,
    endTime,
    startPrice: snapshot.cycleStartPrices[input.marketId],
    direction: input.direction,
    amount: input.amount.toFixed(2),
    status: 'pending',
    entryPrice,
    shares: input.amount / entryPrice,
  };

  store.predictions.push(prediction);
  return { prediction, filled: input.amount };
}

export async function cancelOrder(id: string) {
  const store = getStore();
  const order = store.orders.find((entry) => entry.id === id && entry.status === 'open');

  if (!order) {
    throw new Error('Order not found or already closed');
  }

  order.status = 'cancelled';
  creditBalance(order.userId, order.amount);
  console.log(`[TradeStore] Order ${id} cancelled: refunded ${order.amount} USDC to ${order.userId}`);
  return { success: true, order };
}
