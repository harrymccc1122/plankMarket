import { MARKETS, Order, Prediction } from '../types';
import { expireOrders, getLiveMarketState, settlePredictions } from './marketData';
import { creditBalance } from './balanceStore';
import { readDatabase, updateDatabase } from './localDatabase';

type Store = {
  orders: Order[];
  predictions: Prediction[];
  settledIds: string[];
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getStore(): Promise<Store> {
  const database = await readDatabase();
  const value = database.tradeStore;
  return {
    orders: Array.isArray(value?.orders) ? value.orders : [],
    predictions: Array.isArray(value?.predictions) ? value.predictions : [],
    settledIds: Array.isArray(value?.settledIds) ? value.settledIds : [],
  };
}

async function saveStore(store: Store): Promise<void> {
  await updateDatabase((database) => {
    database.tradeStore = store;
  });
}

async function creditSettledPredictions(predictions: Prediction[], store: Store) {
  const settledIds = new Set(store.settledIds);

  for (const p of predictions) {
    if ((p.status === 'won' || p.status === 'lost') && !settledIds.has(p.id)) {
      settledIds.add(p.id);
      if (p.status === 'won' && p.shares) {
        await creditBalance(p.userId, p.shares);
        console.log(`[TradeStore] Prediction ${p.id} WON: credited ${p.shares.toFixed(4)} USDC to ${p.userId}`);
      }
    }
  }

  store.settledIds = Array.from(settledIds);
}

export async function getMarketSnapshot() {
  const store = await getStore();
  const marketState = await getLiveMarketState();
  const now = Date.now();

  store.orders = expireOrders(store.orders, now);
  store.predictions = settlePredictions(store.predictions, marketState.price, now);

  await creditSettledPredictions(store.predictions, store);
  await saveStore(store);

  return {
    ...marketState,
    orders: store.orders.filter((order) => order.status === 'open'),
    predictions: store.predictions,
  };
}

export async function getUserOrders(userId: string) {
  await getMarketSnapshot();
  const store = await getStore();
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
  const store = await getStore();
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
    await saveStore(store);
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
  await saveStore(store);
  return { prediction, filled: input.amount };
}

export async function cancelOrder(id: string) {
  const store = await getStore();
  const order = store.orders.find((entry) => entry.id === id && entry.status === 'open');

  if (!order) {
    throw new Error('Order not found or already closed');
  }

  order.status = 'cancelled';
  await creditBalance(order.userId, order.amount);
  await saveStore(store);
  console.log(`[TradeStore] Order ${id} cancelled: refunded ${order.amount} USDC to ${order.userId}`);
  return { success: true, order };
}
