import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.query;

  try {
    const post = db.prepare(`
      SELECT 
        p.id, p.uuid, p.content, p.created_at, p.like_count, p.comment_count,
        a.id as author_id, a.username, a.handle, a.display_name, a.emoji
      FROM posts p
      JOIN accounts a ON p.author_id = a.id
      WHERE p.uuid = ?
    `).get(uuid) as any;

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.status(200).json(post);
  } catch (error) {
    console.error('Get post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
