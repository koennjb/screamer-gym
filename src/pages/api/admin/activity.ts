import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

// INTENTIONALLY VULNERABLE: No authentication required
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const activities = db.prepare(`
      SELECT * FROM activity_log
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare(`SELECT COUNT(*) as count FROM activity_log`).get() as any;

    return res.status(200).json({
      activities,
      total: total.count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
