import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../../lib/auth';
import { getClientIp, logActivity } from '../../../../lib/activity';
import {
  getThreadByIdForUser,
  getThreadMembership,
  isUserBanned,
  setThreadSubscription,
} from '../../../../lib/threads';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (isUserBanned(user.id)) {
    return res.status(403).json({ error: 'Banned users cannot update thread subscriptions' });
  }

  try {
    const threadId = parseInt(req.query.id as string, 10);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ error: 'Invalid thread id' });
    }

    const membership = getThreadMembership(user.id, threadId);
    if (!membership) {
      return res.status(403).json({ error: 'Join the thread before subscribing' });
    }

    const subscribe =
      typeof req.body?.subscribe === 'boolean' ? req.body.subscribe : true;

    const updated = setThreadSubscription(user.id, threadId, subscribe);
    if (!updated) {
      return res.status(400).json({ error: 'Failed to update subscription' });
    }

    const thread = getThreadByIdForUser(threadId, user.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    logActivity({
      user_id: user.id,
      username: user.username,
      action: subscribe ? 'subscribe_thread' : 'unsubscribe_thread',
      resource_type: 'thread',
      resource_id: threadId,
      details: `${subscribe ? 'Subscribed to' : 'Unsubscribed from'} thread "${thread.name}"`,
      ip_address: getClientIp(req),
    });

    return res.status(200).json(thread);
  } catch (error) {
    console.error('Update thread subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
