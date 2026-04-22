import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest, isUserBanned } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Security: enforce ban server-side to prevent bypass via direct API calls
  if (isUserBanned(user, res)) return;

  try {
    const { display_name, emoji } = req.body;

    if (!display_name && !emoji) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (display_name) {
      updates.push('display_name = ?');
      params.push(display_name);
    }

    if (emoji) {
      updates.push('emoji = ?');
      params.push(emoji);
    }

    params.push(user.id);

    db.prepare(`
      UPDATE accounts SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

    const updated = db.prepare(`
      SELECT id, username, handle, display_name, emoji, created_at,
             total_screams, total_likes_received
      FROM accounts WHERE id = ?
    `).get(user.id);

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
