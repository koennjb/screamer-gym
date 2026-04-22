import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest, isUserBanned } from '../../../lib/auth';
import { logActivity, getClientIp } from '../../../lib/activity';
import { generateUUID } from '../../../lib/uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get all posts with pagination
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const posts = db.prepare(`
        SELECT 
          p.id, p.uuid, p.content, p.created_at, p.like_count, p.comment_count,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM posts p
        JOIN accounts a ON p.author_id = a.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      return res.status(200).json(posts);
    } catch (error) {
      console.error('Get posts error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Create new post
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Security: enforce ban server-side to prevent bypass via direct API calls
    if (isUserBanned(user, res)) return;

    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required' });
      }

      if (content.length > 280) {
        return res.status(400).json({ error: 'Content must be 280 characters or less' });
      }

      const uuid = generateUUID();

      const result = db.prepare(`
        INSERT INTO posts (uuid, content, author_id) VALUES (?, ?, ?)
      `).run(uuid, content.trim(), user.id);

      // Update user's total screams count
      db.prepare(`
        UPDATE accounts SET total_screams = total_screams + 1 WHERE id = ?
      `).run(user.id);

      const postId = result.lastInsertRowid as number;

      const newPost = db.prepare(`
        SELECT 
          p.id, p.uuid, p.content, p.created_at, p.like_count, p.comment_count,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM posts p
        JOIN accounts a ON p.author_id = a.id
        WHERE p.id = ?
      `).get(postId);

      // Log activity
      logActivity({
        user_id: user.id,
        username: user.username,
        action: 'create_post',
        resource_type: 'post',
        resource_id: postId,
        details: `Created: "${content.substring(0, 50)}..."`,
        ip_address: getClientIp(req),
      });

      return res.status(201).json(newPost);
    } catch (error) {
      console.error('Create post error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
