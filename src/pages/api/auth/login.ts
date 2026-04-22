import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { verifyPassword, generateToken, createAuthCookie } from '../../../lib/auth';
import { logActivity, getClientIp } from '../../../lib/activity';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = db.prepare(`
      SELECT id, username, password, handle, display_name, emoji, is_banned, is_admin
      FROM accounts WHERE username = ?
    `).get(username) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ id: user.id, username: user.username });

    // Set cookie
    res.setHeader('Set-Cookie', createAuthCookie(token));

    // Log activity
    logActivity({
      user_id: user.id,
      username: user.username,
      action: 'login',
      ip_address: getClientIp(req),
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        handle: user.handle,
        display_name: user.display_name,
        emoji: user.emoji,
        is_banned: user.is_banned,
        is_admin: user.is_admin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
