import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/auth';
import { getClientIp, logActivity } from '../../../lib/activity';
import { createThread, isUserBanned, listThreadsForUser } from '../../../lib/threads';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const threads = listThreadsForUser(user.id);
      return res.status(200).json(threads);
    } catch (error) {
      console.error('Get threads error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    if (isUserBanned(user.id)) {
      return res.status(403).json({ error: 'Banned users cannot create threads' });
    }

    try {
      const name = String(req.body?.name || '').trim();
      const description = String(req.body?.description || '').trim();

      if (!name) {
        return res.status(400).json({ error: 'Thread name is required' });
      }

      if (name.length > 80) {
        return res.status(400).json({ error: 'Thread name must be 80 characters or less' });
      }

      if (description.length > 280) {
        return res.status(400).json({ error: 'Thread description must be 280 characters or less' });
      }

      const thread = createThread(user.id, name, description);

      logActivity({
        user_id: user.id,
        username: user.username,
        action: 'create_thread',
        resource_type: 'thread',
        resource_id: thread.id,
        details: `Created thread "${thread.name}"`,
        ip_address: getClientIp(req),
      });

      return res.status(201).json(thread);
    } catch (error) {
      console.error('Create thread error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
