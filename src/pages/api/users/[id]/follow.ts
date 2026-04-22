import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { getUserFromRequest, isUserBanned } from '../../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Security: enforce ban server-side to prevent bypass via direct API calls
  if (isUserBanned(user, res)) return;

  const { id } = req.query;
  const targetUserId = parseInt(id as string);

  if (targetUserId === user.id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  try {
    if (req.method === 'POST') {
      // Follow user
      const existing = db.prepare(`
        SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?
      `).get(user.id, targetUserId);

      if (existing) {
        return res.status(400).json({ error: 'Already following this user' });
      }

      db.prepare(`
        INSERT INTO followers (follower_id, following_id) VALUES (?, ?)
      `).run(user.id, targetUserId);

      return res.status(200).json({ success: true, following: true });
    } else if (req.method === 'DELETE') {
      // Unfollow user
      db.prepare(`
        DELETE FROM followers WHERE follower_id = ? AND following_id = ?
      `).run(user.id, targetUserId);

      return res.status(200).json({ success: true, following: false });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
