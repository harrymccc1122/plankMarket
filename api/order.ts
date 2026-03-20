import { cancelOrder, placeOrder } from '../src/lib/marketEngine';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'POST') {
      const payload = req.body ?? {};
      const result = await placeOrder({
        userId: String(payload.userId ?? ''),
        marketId: String(payload.marketId ?? ''),
        direction: payload.direction,
        amount: Number(payload.amount),
        type: payload.type,
        limitPrice: payload.limitPrice == null ? undefined : Number(payload.limitPrice),
      });
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const orderId = req.query?.id ?? req.body?.id;
      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ error: 'id is required' });
      }
      return res.status(200).json(await cancelOrder(orderId));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
}
