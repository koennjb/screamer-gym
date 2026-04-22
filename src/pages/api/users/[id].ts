import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const account = db.prepare(`
      SELECT id, username, handle, display_name, emoji, created_at,
             total_screams, total_likes_received
      FROM accounts WHERE id = ?
    `).get(id) as any;

    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(account);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
