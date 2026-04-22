import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM drafts WHERE author_id = ?
    `).get(user.id) as any;

    return res.status(200).json({ count: result.count });
  } catch (error) {
    console.error('Get draft count error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
