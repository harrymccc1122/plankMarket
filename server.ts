import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { cancelOrder, createOrder, getMarketSnapshot, getUserOrders } from './src/lib/tradeStore';
import { getBalance, debitBalance } from './src/lib/balanceStore';
import { startDepositWatcher } from './src/lib/depositWatcher';
import { processWithdrawal, getSiteWalletAddress } from './src/lib/withdrawal';

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

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

  const balance = getBalance(userId);
  if (balance < amountNum) {
    return res.status(400).json({ error: `Insufficient balance. You have ${balance.toFixed(2)} USDC.` });
  }

  try {
    debitBalance(userId, amountNum);
    const result = await createOrder({ userId, marketId, direction, amount: amountNum, type, limitPrice: typeof limitPrice === 'number' ? limitPrice : undefined });
    res.json(result);
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

app.get('/api/balance', async (req, res) => {
  const userId = req.query.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }
  try {
    const balance = getBalance(userId);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

app.get('/api/deposit-address', async (req, res) => {
  const userId = req.query.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }
  try {
    const siteWallet = await getSiteWalletAddress();
    // Users send USDC from their connected wallet to the site wallet.
    // The sender address (= userId) is used to credit their balance automatically.
    res.json({ depositAddress: siteWallet });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get deposit address' });
  }
});

app.post('/api/withdraw', async (req, res) => {
  const { userId, toAddress, amount } = req.body ?? {};
  const amountNum = Number(amount);

  if (!userId || !toAddress || !Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal payload' });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  try {
    const txHash = await processWithdrawal(userId, toAddress, amountNum);
    res.json({ success: true, txHash });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Withdrawal failed' });
  }
});

app.get('/api/site-wallet', async (_req, res) => {
  try {
    const address = await getSiteWalletAddress();
    res.json({ address });
  } catch (error) {
    res.status(500).json({ error: 'Site wallet not configured' });
  }
});

app.get('/api/config', (_req, res) => {
  res.json({
    walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID ?? '',
  });
});

async function startServer() {
  startDepositWatcher();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
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
