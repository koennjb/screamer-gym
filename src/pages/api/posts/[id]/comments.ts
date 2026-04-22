import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Get comments for post
    try {
      const comments = db.prepare(`
        SELECT 
          c.id, c.content, c.created_at,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM comments c
        JOIN accounts a ON c.author_id = a.id
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
      `).all(id);

      return res.status(200).json(comments);
    } catch (error) {
      console.error('Get comments error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Add comment to post
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required' });
      }

      if (content.length > 280) {
        return res.status(400).json({ error: 'Content must be 280 characters or less' });
      }

      const result = db.prepare(`
        INSERT INTO comments (content, author_id, post_id) VALUES (?, ?, ?)
      `).run(content.trim(), user.id, id);

      // Update post comment count
      db.prepare(`
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?
      `).run(id);

      const commentId = result.lastInsertRowid as number;

      const newComment = db.prepare(`
        SELECT 
          c.id, c.content, c.created_at,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM comments c
        JOIN accounts a ON c.author_id = a.id
        WHERE c.id = ?
      `).get(commentId);

      return res.status(201).json(newComment);
    } catch (error) {
      console.error('Create comment error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
