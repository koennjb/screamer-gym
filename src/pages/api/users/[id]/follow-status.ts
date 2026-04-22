import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(200).json({ following: false });
  }

  const { id } = req.query;

  try {
    const result = db.prepare(`
      SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?
    `).get(user.id, id);

    return res.status(200).json({ following: !!result });
  } catch (error) {
    console.error('Get follow status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
