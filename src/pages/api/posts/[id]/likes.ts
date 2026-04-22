import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const likes = db.prepare(`
      SELECT a.id, a.username, a.handle, a.display_name, a.emoji, l.liked_at
      FROM likes l
      JOIN accounts a ON l.user_id = a.id
      WHERE l.post_id = ?
      ORDER BY l.liked_at DESC
    `).all(id);

    return res.status(200).json(likes);
  } catch (error) {
    console.error('Get likes error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
