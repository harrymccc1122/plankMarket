import { getMarketState } from '../src/lib/marketEngine';

export default async function handler(_req: any, res: any) {
  try {
    res.status(200).json(await getMarketState());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
}
