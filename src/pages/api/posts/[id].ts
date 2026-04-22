import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest, isUserBanned } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Get specific post
    try {
      const post = db.prepare(`
        SELECT 
          p.id, p.uuid, p.content, p.created_at, p.like_count, p.comment_count,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM posts p
        JOIN accounts a ON p.author_id = a.id
        WHERE p.id = ?
      `).get(id) as any;

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      return res.status(200).json(post);
    } catch (error) {
      console.error('Get post error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update post
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Security: enforce ban server-side to prevent bypass via direct API calls
    if (isUserBanned(user, res)) return;

    try {
      const post = db.prepare(`SELECT author_id FROM posts WHERE id = ?`).get(id) as any;

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.author_id !== user.id) {
        return res.status(403).json({ error: 'Cannot edit others posts' });
      }

      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required' });
      }

      if (content.length > 280) {
        return res.status(400).json({ error: 'Content must be 280 characters or less' });
      }

      db.prepare(`UPDATE posts SET content = ? WHERE id = ?`).run(content.trim(), id);

      const updated = db.prepare(`
        SELECT 
          p.id, p.uuid, p.content, p.created_at, p.like_count, p.comment_count,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM posts p
        JOIN accounts a ON p.author_id = a.id
        WHERE p.id = ?
      `).get(id);

      return res.status(200).json(updated);
    } catch (error) {
      console.error('Update post error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Delete post
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Security: enforce ban server-side to prevent bypass via direct API calls
    if (isUserBanned(user, res)) return;

    try {
      const post = db.prepare(`SELECT author_id FROM posts WHERE id = ?`).get(id) as any;

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.author_id !== user.id) {
        return res.status(403).json({ error: 'Cannot delete others posts' });
      }

      db.prepare(`DELETE FROM posts WHERE id = ?`).run(id);

      // Update user's total screams count
      db.prepare(`
        UPDATE accounts SET total_screams = total_screams - 1 WHERE id = ?
      `).run(user.id);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete post error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
