import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { cancelOrder, getMarketState, getUserActivity, placeOrder } from './src/lib/marketEngine';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get('/api/market/state', async (_req, res) => {
  try {
    res.json(await getMarketState());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

app.get('/api/orders', async (req, res) => {
  const userId = req.query.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    res.json(await getUserActivity(userId));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    res.json(await placeOrder({
      userId: String(req.body.userId ?? ''),
      marketId: String(req.body.marketId ?? ''),
      direction: req.body.direction,
      amount: Number(req.body.amount),
      type: req.body.type,
      limitPrice: req.body.limitPrice == null ? undefined : Number(req.body.limitPrice),
    }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

app.delete('/api/order/:id', async (req, res) => {
  try {
    res.json(await cancelOrder(req.params.id));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
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
