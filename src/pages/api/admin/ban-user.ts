import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { logActivity, getClientIp } from '../../../lib/activity';
import { getUserFromRequest } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { handle, banned } = req.body;

  if (!handle) {
    return res.status(400).json({ error: 'User handle required' });
  }

  const isBanned = banned === true || banned === 1 ? 1 : 0;

  try {
    const user = getUserFromRequest(req);
    
    const targetUser = db.prepare(`
      SELECT id, username, handle FROM accounts WHERE handle = ?
    `).get(handle) as any;

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ban or unban the user
    db.prepare(`
      UPDATE accounts SET is_banned = ? WHERE handle = ?
    `).run(isBanned, handle);

    // Log the admin action
    logActivity({
      user_id: user?.id,
      username: user?.username || 'anonymous',
      action: isBanned ? 'admin_ban_user' : 'admin_unban_user',
      resource_type: 'account',
      resource_id: targetUser.id,
      details: `${isBanned ? 'Banned' : 'Unbanned'} user @${handle} (${targetUser.username})`,
      ip_address: getClientIp(req),
    });

    return res.status(200).json({
      success: true,
      message: `User @${handle} has been ${isBanned ? 'banned' : 'unbanned'}`,
      user: {
        id: targetUser.id,
        handle: targetUser.handle,
        is_banned: isBanned,
      },
    });
  } catch (error) {
    console.error('Admin ban user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
