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
    const posts = db.prepare(`
      SELECT 
        p.id, p.content, p.created_at, p.like_count, p.comment_count,
        a.id as author_id, a.username, a.handle, a.display_name, a.emoji
      FROM posts p
      JOIN accounts a ON p.author_id = a.id
      WHERE p.author_id IN (
        SELECT following_id FROM followers WHERE follower_id = ?
      )
      ORDER BY p.created_at DESC
    `).all(user.id);

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Get following posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
