import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { cancelOrder, createOrder, getMarketSnapshot, getUserOrders } from './src/lib/tradeStore';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get('/api/market/state', async (_req, res) => {
  try {
    res.json(await getMarketSnapshot());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load market state' });
  }
});

app.get('/api/orders', async (req, res) => {
  const userId = req.query.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    res.json(await getUserOrders(userId));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load orders' });
  }
});

app.post('/api/order', async (req, res) => {
  const { userId, marketId, direction, amount, type, limitPrice } = req.body ?? {};
  const amountNum = Number(amount);

  if (!userId || !marketId || (direction !== 'up' && direction !== 'down') || !Number.isFinite(amountNum) || amountNum <= 0 || (type !== 'market' && type !== 'limit')) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  try {
    res.json(await createOrder({
      userId,
      marketId,
      direction,
      amount: amountNum,
      type,
      limitPrice: typeof limitPrice === 'number' ? limitPrice : undefined,
    }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create order' });
  }
});

app.delete('/api/order/:id', async (req, res) => {
  try {
    res.json(await cancelOrder(req.params.id));
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Failed to cancel order' });
  }
});

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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
