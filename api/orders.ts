import { getUserActivity } from '../src/lib/marketEngine';

export default async function handler(req: any, res: any) {
  const userId = req.query?.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    res.status(200).json(await getUserActivity(userId));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
}
