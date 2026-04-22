import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Request to get auth info');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const account = db.prepare(`
      SELECT id, username, handle, display_name, emoji, created_at,
             total_screams, total_likes_received, is_banned, is_admin
      FROM accounts WHERE id = ?
    `).get(user.id) as any;

    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(account);
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
