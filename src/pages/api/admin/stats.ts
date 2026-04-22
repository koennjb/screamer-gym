import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM accounts`).get() as any;
    const bannedUsers = db.prepare(`SELECT COUNT(*) as count FROM accounts WHERE is_banned = 1`).get() as any;
    const totalPosts = db.prepare(`SELECT COUNT(*) as count FROM posts`).get() as any;
    const totalComments = db.prepare(`SELECT COUNT(*) as count FROM comments`).get() as any;
    const totalLikes = db.prepare(`SELECT COUNT(*) as count FROM likes`).get() as any;
    const totalActivities = db.prepare(`SELECT COUNT(*) as count FROM activity_log`).get() as any;

    const recentUsers = db.prepare(`
      SELECT id, username, handle, display_name, emoji, created_at, is_banned, is_admin
      FROM accounts 
      ORDER BY created_at DESC 
      LIMIT 15
    `).all();

    const topPosters = db.prepare(`
      SELECT id, username, handle, display_name, emoji, total_screams, is_banned
      FROM accounts 
      WHERE total_screams > 0
      ORDER BY total_screams DESC 
      LIMIT 10
    `).all();

    return res.status(200).json({
      stats: {
        total_users: totalUsers.count,
        banned_users: bannedUsers.count,
        total_posts: totalPosts.count,
        total_comments: totalComments.count,
        total_likes: totalLikes.count,
        total_activities: totalActivities.count,
      },
      recent_users: recentUsers,
      top_posters: topPosters,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
