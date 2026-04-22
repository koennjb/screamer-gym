import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const followersCount = db.prepare(`
      SELECT COUNT(*) as count FROM followers WHERE following_id = ?
    `).get(id) as any;

    const followingCount = db.prepare(`
      SELECT COUNT(*) as count FROM followers WHERE follower_id = ?
    `).get(id) as any;

    const account = db.prepare(`
      SELECT total_screams, total_likes_received FROM accounts WHERE id = ?
    `).get(id) as any;

    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      followers: followersCount.count,
      following: followingCount.count,
      total_posts: account.total_screams,
      total_likes: account.total_likes_received,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
