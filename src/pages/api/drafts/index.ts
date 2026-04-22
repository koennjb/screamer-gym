import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';
import { generateUUID } from '../../../lib/uuid';
import { logActivity, getClientIp } from '../../../lib/activity';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get user's drafts
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const drafts = db.prepare(`
        SELECT 
          d.id, d.uuid, d.content, d.created_at, d.updated_at,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM drafts d
        JOIN accounts a ON d.author_id = a.id
        WHERE d.author_id = ?
        ORDER BY d.updated_at DESC
      `).all(user.id);

      return res.status(200).json(drafts);
    } catch (error) {
      console.error('Get drafts error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Create draft
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

      const uuid = generateUUID();

      const result = db.prepare(`
        INSERT INTO drafts (uuid, content, author_id) VALUES (?, ?, ?)
      `).run(uuid, content.trim(), user.id);

      const draftId = result.lastInsertRowid as number;

      const newDraft = db.prepare(`
        SELECT 
          d.id, d.uuid, d.content, d.created_at, d.updated_at,
          a.id as author_id, a.username, a.handle, a.display_name, a.emoji
        FROM drafts d
        JOIN accounts a ON d.author_id = a.id
        WHERE d.id = ?
      `).get(draftId);

      // Log activity
      logActivity({
        user_id: user.id,
        username: user.username,
        action: 'create_draft',
        resource_type: 'draft',
        resource_id: draftId,
        details: `Created draft: "${content.substring(0, 50)}..."`,
        ip_address: getClientIp(req),
      });

      return res.status(201).json(newDraft);
    } catch (error) {
      console.error('Create draft error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
