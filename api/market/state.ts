import { getMarketSnapshot } from '../../src/lib/tradeStore';

export default async function handler(_req: any, res: any) {
  try {
    const snapshot = await getMarketSnapshot();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load market state' });
  }
}
