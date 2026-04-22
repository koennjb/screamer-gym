import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  try {
    if (req.method === 'POST') {
      // Like post
      const post = db.prepare(`SELECT author_id FROM posts WHERE id = ?`).get(id) as any;
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const existing = db.prepare(`
        SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?
      `).get(id, user.id);

      if (existing) {
        return res.status(400).json({ error: 'Already liked this post' });
      }

      db.prepare(`
        INSERT INTO likes (post_id, user_id) VALUES (?, ?)
      `).run(id, user.id);

      // Update post like count
      db.prepare(`
        UPDATE posts SET like_count = like_count + 1 WHERE id = ?
      `).run(id);

      // Update author's total likes received
      db.prepare(`
        UPDATE accounts SET total_likes_received = total_likes_received + 1 WHERE id = ?
      `).run(post.author_id);

      return res.status(200).json({ success: true, liked: true });
    } else if (req.method === 'DELETE') {
      // Unlike post
      const post = db.prepare(`SELECT author_id FROM posts WHERE id = ?`).get(id) as any;
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const result = db.prepare(`
        DELETE FROM likes WHERE post_id = ? AND user_id = ?
      `).run(id, user.id);

      if (result.changes > 0) {
        // Update post like count
        db.prepare(`
          UPDATE posts SET like_count = like_count - 1 WHERE id = ?
        `).run(id);

        // Update author's total likes received
        db.prepare(`
          UPDATE accounts SET total_likes_received = total_likes_received - 1 WHERE id = ?
        `).run(post.author_id);
      }

      return res.status(200).json({ success: true, liked: false });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Like/unlike error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
