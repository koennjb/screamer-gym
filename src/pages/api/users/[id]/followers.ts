import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const followers = db.prepare(`
      SELECT a.id, a.username, a.handle, a.display_name, a.emoji, f.followed_at
      FROM followers f
      JOIN accounts a ON f.follower_id = a.id
      WHERE f.following_id = ?
      ORDER BY f.followed_at DESC
    `).all(id);

    return res.status(200).json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
