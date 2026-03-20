import { cancelOrder } from '../../src/lib/tradeStore';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await cancelOrder(req.query.id as string);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Failed to cancel order' });
  }
}
