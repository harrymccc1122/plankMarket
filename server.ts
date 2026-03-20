import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { WebSocket } from 'ws';
import { Order, Prediction, PriceData, MARKETS } from './src/types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// State
let currentPrice: number | null = null;
let priceHistory: PriceData[] = [];
let orders: Order[] = [];
let predictions: Prediction[] = [];
let cycleStartPrices: Record<string, number> = {};

// CoinAPI WS
const COINAPI_WS_URL = 'wss://ws.coinapi.io/v1/';
const apiKey = process.env.VITE_COINAPI_API_KEY;

function connectCoinAPI() {
  if (!apiKey) {
    console.warn('VITE_COINAPI_API_KEY is not set');
    return;
  }

  const ws = new WebSocket(COINAPI_WS_URL);

  ws.on('open', () => {
    console.log('Connected to CoinAPI WS');
    ws.send(JSON.stringify({
      type: 'hello',
      apikey: apiKey,
      heartbeat: true,
      subscribe_data_type: ['quote'],
      subscribe_filter_symbol_id: ['COINBASE_SPOT_BTC_USD']
    }));
  });

  ws.on('message', (data: any) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'quote' && message.symbol_id === 'COINBASE_SPOT_BTC_USD') {
      if (message.ask_price && message.bid_price) {
        const newPrice = (message.ask_price + message.bid_price) / 2;
        if (newPrice < 20000 || newPrice > 250000) return;

        const time = Date.now();
        currentPrice = newPrice;
        
        // Update history (once per second)
        if (priceHistory.length === 0 || time - priceHistory[priceHistory.length - 1].time > 1000) {
          priceHistory.push({ time, price: newPrice });
          if (priceHistory.length > 60) priceHistory.shift();
        }

        // Update cycle start prices
        MARKETS.forEach(market => {
          const durationMs = market.duration * 1000;
          const cycleStartTime = Math.floor(time / durationMs) * durationMs;
          if (time - cycleStartTime < 1000 || !cycleStartPrices[market.id]) {
            cycleStartPrices[market.id] = newPrice;
          }
        });

        // Resolve orders and predictions
        resolveMarket(time);
      }
    }
  });

  ws.on('close', () => {
    console.log('WS closed, reconnecting...');
    setTimeout(connectCoinAPI, 3000);
  });

  ws.on('error', (err) => {
    console.error('WS error:', err);
  });
}

connectCoinAPI();

function resolveMarket(now: number) {
  // Update predictions
  predictions = predictions.map(p => {
    if (p.status === 'pending' && now >= p.endTime) {
      if (!currentPrice) return p;
      const won = p.direction === 'up' 
        ? currentPrice > p.startPrice 
        : currentPrice < p.startPrice;
      return { ...p, status: won ? 'won' : 'lost', endPrice: currentPrice };
    }
    return p;
  });

  // Cancel expired orders
  orders = orders.map(o => {
    if (o.status === 'open' && now >= o.endTime) {
      return { ...o, status: 'cancelled' as const };
    }
    return o;
  });
}

// API Routes
app.get('/api/market/state', (req, res) => {
  res.json({
    price: currentPrice,
    history: priceHistory,
    cycleStartPrices,
    orders: orders.filter(o => o.status === 'open'),
    predictions: predictions.filter(p => p.status === 'pending')
  });
});

app.get('/api/orders', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  res.json({
    orders: orders.filter(o => o.userId === userId),
    predictions: predictions.filter(p => p.id.includes(userId as string) || p.id.startsWith(userId as string)) // Simplified user check
  });
});

app.post('/api/order', (req, res) => {
  const { userId, marketId, direction, amount, type, limitPrice } = req.body;
  
  if (!userId || !marketId || !direction || !amount || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const market = MARKETS.find(m => m.id === marketId);
  if (!market) return res.status(400).json({ error: 'Invalid market' });

  const now = Date.now();
  const durationMs = market.duration * 1000;
  const endTime = Math.ceil(now / durationMs) * durationMs;
  const amountNum = parseFloat(amount);
  const cycleStartPrice = cycleStartPrices[marketId];

  if (type === 'limit') {
    if (!limitPrice) return res.status(400).json({ error: 'limitPrice required for limit orders' });
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      marketId,
      userId,
      direction,
      price: limitPrice,
      amount: amountNum,
      shares: amountNum / limitPrice,
      status: 'open',
      timestamp: now,
      endTime,
    };
    orders.push(newOrder);
    return res.json(newOrder);
  }

  // Market order matching
  const oppositeDirection = direction === 'up' ? 'down' : 'up';
  const availableOrders = orders.filter(o => 
    o.marketId === marketId && 
    o.direction === oppositeDirection && 
    o.status === 'open' &&
    o.endTime === endTime
  );

  let remainingAmount = amountNum;
  let totalShares = 0;
  let weightedPriceSum = 0;

  const matchedOrders = [...availableOrders].sort((a, b) => a.price - b.price);

  for (const order of matchedOrders) {
    if (remainingAmount <= 0) break;
    const matchPrice = 1 - order.price;
    const matchAmount = Math.min(remainingAmount, order.amount);
    const shares = matchAmount / matchPrice;
    totalShares += shares;
    weightedPriceSum += matchPrice * matchAmount;
    remainingAmount -= matchAmount;
    order.status = 'filled';
  }

  if (totalShares > 0) {
    const avgPrice = weightedPriceSum / (amountNum - remainingAmount);
    const newPrediction: Prediction = {
      id: `${userId}-${Math.random().toString(36).substr(2, 5)}`,
      marketId,
      startTime: now,
      endTime,
      startPrice: cycleStartPrice,
      direction,
      amount: (amountNum - remainingAmount).toString(),
      status: 'pending',
      entryPrice: avgPrice,
    };
    predictions.push(newPrediction);
    res.json({ prediction: newPrediction, filled: amountNum - remainingAmount });
  } else {
    res.status(400).json({ error: 'No liquidity for market order' });
  }
});

app.delete('/api/order/:id', (req, res) => {
  const { id } = req.params;
  const orderIndex = orders.findIndex(o => o.id === id && o.status === 'open');
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found or already filled/cancelled' });
  }

  orders[orderIndex].status = 'cancelled';
  res.json({ success: true, order: orders[orderIndex] });
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
