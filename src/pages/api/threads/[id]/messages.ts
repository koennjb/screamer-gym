import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../../lib/auth';
import { getThreadMessages, getThreadMembership } from '../../../../lib/threads';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const threadId = parseInt(req.query.id as string, 10);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }

    const membership = getThreadMembership(user.id, threadId);
    if (!membership) {
      return res.status(403).json({ error: 'Join the thread to view messages' });
    }

    const requestedLimit = parseInt(String(req.query.limit || '100'), 10);
    const limit = Math.max(1, Math.min(200, Number.isNaN(requestedLimit) ? 100 : requestedLimit));

    const messages = getThreadMessages(threadId, limit);
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Get thread messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
