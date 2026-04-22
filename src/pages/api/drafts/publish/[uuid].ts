import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { generateUUID } from '../../../../lib/uuid';
import { logActivity, getClientIp } from '../../../../lib/activity';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uuid } = req.query;

  try {
    const draft = db.prepare(`
      SELECT id, content, author_id FROM drafts WHERE uuid = ?
    `).get(uuid) as any;

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.author_id !== user.id) {
      return res.status(403).json({ error: 'Cannot publish others drafts' });
    }

    // Create post from draft
    const postUuid = generateUUID();
    const result = db.prepare(`
      INSERT INTO posts (uuid, content, author_id) VALUES (?, ?, ?)
    `).run(postUuid, draft.content, user.id);

    // Update user's total screams count
    db.prepare(`
      UPDATE accounts SET total_screams = total_screams + 1 WHERE id = ?
    `).run(user.id);

    // Delete the draft
    db.prepare(`DELETE FROM drafts WHERE uuid = ?`).run(uuid);

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
      action: 'publish_draft',
      resource_type: 'post',
      resource_id: postId,
      details: `Published draft as post: "${draft.content.substring(0, 50)}..."`,
      ip_address: getClientIp(req),
    });

    return res.status(201).json(newPost);
  } catch (error) {
    console.error('Publish draft error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
