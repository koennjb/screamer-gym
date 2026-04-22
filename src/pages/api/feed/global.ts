import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT 
        p.id, p.content, p.created_at, p.like_count, p.comment_count,
        a.id as author_id, a.username, a.handle, a.display_name, a.emoji
      FROM posts p
      JOIN accounts a ON p.author_id = a.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Get global feed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
