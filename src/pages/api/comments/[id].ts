import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  try {
    const comment = db.prepare(`
      SELECT author_id, post_id FROM comments WHERE id = ?
    `).get(id) as any;

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author_id !== user.id) {
      return res.status(403).json({ error: 'Cannot delete others comments' });
    }

    db.prepare(`DELETE FROM comments WHERE id = ?`).run(id);

    // Update post comment count
    db.prepare(`
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?
    `).run(comment.post_id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
