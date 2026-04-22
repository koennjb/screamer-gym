import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM accounts`).get() as any;
    const totalPosts = db.prepare(`SELECT COUNT(*) as count FROM posts`).get() as any;
    const totalComments = db.prepare(`SELECT COUNT(*) as count FROM comments`).get() as any;
    const totalLikes = db.prepare(`SELECT COUNT(*) as count FROM likes`).get() as any;

    return res.status(200).json({
      total_users: totalUsers.count,
      total_posts: totalPosts.count,
      total_comments: totalComments.count,
      total_likes: totalLikes.count,
    });
  } catch (error) {
    console.error('Get global stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
