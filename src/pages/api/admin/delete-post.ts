import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { logActivity, getClientIp } from '../../../lib/activity';
import { getUserFromRequest } from '../../../lib/auth';

// INTENTIONALLY VULNERABLE: Minimal authorization
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ error: 'Post ID required' });
  }

  try {
    const user = getUserFromRequest(req);
    
    const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId) as any;

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete the post
    db.prepare(`DELETE FROM posts WHERE id = ?`).run(postId);

    // Update author's total screams count
    db.prepare(`
      UPDATE accounts SET total_screams = total_screams - 1 WHERE id = ?
    `).run(post.author_id);

    // Log the admin action
    logActivity({
      user_id: user?.id,
      username: user?.username || 'anonymous',
      action: 'admin_delete_post',
      resource_type: 'post',
      resource_id: postId,
      details: `Deleted post by user ${post.author_id}: "${post.content.substring(0, 50)}..."`,
      ip_address: getClientIp(req),
    });

    return res.status(200).json({ success: true, message: 'Post deleted by admin' });
  } catch (error) {
    console.error('Admin delete post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
