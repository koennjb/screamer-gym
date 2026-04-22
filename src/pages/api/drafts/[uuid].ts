import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';
import { logActivity, getClientIp } from '../../../lib/activity';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { uuid } = req.query;

  if (req.method === 'GET') {
    try {
      const draft = db.prepare(`
        SELECT 
          d.id, d.uuid, d.content, d.created_at, d.updated_at,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM drafts d
        JOIN accounts a ON d.author_id = a.id
        WHERE d.uuid = ?
      `).get(uuid) as any;

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      return res.status(200).json(draft);
    } catch (error) {
      console.error('Get draft error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update draft (user must own it)
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const draft = db.prepare(`SELECT author_id FROM drafts WHERE uuid = ?`).get(uuid) as any;

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (draft.author_id !== user.id) {
        return res.status(403).json({ error: 'Cannot edit others drafts' });
      }

      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required' });
      }

      if (content.length > 280) {
        return res.status(400).json({ error: 'Content must be 280 characters or less' });
      }

      db.prepare(`
        UPDATE drafts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?
      `).run(content.trim(), uuid);

      const updated = db.prepare(`
        SELECT 
          d.id, d.uuid, d.content, d.created_at, d.updated_at,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM drafts d
        JOIN accounts a ON d.author_id = a.id
        WHERE d.uuid = ?
      `).get(uuid);

      return res.status(200).json(updated);
    } catch (error) {
      console.error('Update draft error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Delete draft
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const draft = db.prepare(`SELECT id, author_id FROM drafts WHERE uuid = ?`).get(uuid) as any;

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (draft.author_id !== user.id) {
        return res.status(403).json({ error: 'Cannot delete others drafts' });
      }

      db.prepare(`DELETE FROM drafts WHERE uuid = ?`).run(uuid);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete draft error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
