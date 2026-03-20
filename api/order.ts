import { createOrder } from '../src/lib/tradeStore';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, marketId, direction, amount, type, limitPrice } = req.body ?? {};
  const amountNum = Number(amount);

  if (!userId || !marketId || (direction !== 'up' && direction !== 'down') || !Number.isFinite(amountNum) || amountNum <= 0 || (type !== 'market' && type !== 'limit')) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  try {
    const result = await createOrder({
      userId,
      marketId,
      direction,
      amount: amountNum,
      type,
      limitPrice: typeof limitPrice === 'number' ? limitPrice : undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create order' });
  }
}
